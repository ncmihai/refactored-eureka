/**
 * Server-side PostHog query client — feeds the Payload admin dashboard widget.
 *
 * Split from `lib/posthog.ts` (browser SDK) on purpose:
 *   - The browser file (`posthog.ts`) bundles `posthog-js` and must only ever
 *     use the project's *public* API key (NEXT_PUBLIC_POSTHOG_KEY).
 *   - This file uses a *personal* API key with `query:read` scope, which can
 *     read every event in the project. That key must NEVER reach the browser
 *     bundle — the `import "server-only"` line below makes that a build error
 *     if someone accidentally imports this file from a client component.
 *
 * What we query
 * -------------
 * Two HogQL queries in parallel:
 *   1. Aggregated KPIs — scalar counts for "today" / "last 7 days" / per-tool.
 *   2. Daily sparkline — simulation count per day for the last 14 days.
 *
 * Both are cached through `unstable_cache` with a 60s revalidation window.
 * That's a deliberate trade-off: fresh enough that an active consultant sees
 * their own simulation reflected on the next admin refresh, but not so fresh
 * that every dashboard view burns a PostHog API quota hit. PostHog's free
 * tier has generous query limits but "generous" still runs out if we
 * accidentally tie the widget to every admin route transition.
 *
 * Failure modes
 * -------------
 * The widget must never blow up the admin dashboard. Every error path here
 * returns a neutral `AdminStats` shape with `status: "error"` and a short
 * reason, which the RSC consumer renders as a muted notice instead of a red
 * crash. The dashboard itself keeps working even if PostHog is down.
 */
import "server-only";

import { unstable_cache } from "next/cache";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

/**
 * Shape returned to the RSC. Always populated — even on error — so the widget
 * can render something meaningful without null-checks everywhere.
 */
export type AdminStats = {
  status: "ok" | "not_configured" | "error";
  /** Human-readable explanation surfaced to the UI when status != ok. */
  reason?: string;

  /** Simulations run since midnight (local to PostHog's UTC). */
  simsToday: number;
  /** Simulations run in the last rolling 7 days. */
  simsWeek: number;
  /** Breakdown of week simulations by tool. Missing tools are 0. */
  byTool: {
    credit: number;
    optimizare: number;
    depozit: number;
    investitii: number;
  };
  /** Unique distinct_ids seen in the last 24h (pageviews + events). */
  uniqueToday: number;
  /** Unique distinct_ids seen in the last 7 days. */
  uniqueWeek: number;
  /** Raw pageview count over the last 7 days. */
  pageviewsWeek: number;
  /**
   * Last 14 days of simulation counts, oldest → newest. Always 14 entries so
   * the sparkline renders at a consistent width even when early days are 0.
   */
  sparkline: Array<{ day: string; count: number }>;
};

/**
 * The aggregated KPI query. All counts come back as a single row — cheaper
 * than four separate round-trips. `countIf` is a Clickhouse/HogQL built-in
 * that filters inline without WHERE — lets us compute today/week/by-tool in
 * one pass over the event stream.
 *
 * Event name `tool_simulation_ran` matches what `captureSimulation()` emits
 * from `lib/posthog.ts`. Keep them in sync.
 */
const KPI_QUERY = `
  SELECT
    countIf(event = 'tool_simulation_ran' AND toStartOfDay(timestamp) = toStartOfDay(now())) AS sims_today,
    countIf(event = 'tool_simulation_ran' AND timestamp > now() - INTERVAL 7 DAY) AS sims_week,
    countIf(event = 'tool_simulation_ran' AND properties.tool = 'credit' AND timestamp > now() - INTERVAL 7 DAY) AS sims_credit,
    countIf(event = 'tool_simulation_ran' AND properties.tool = 'optimizare' AND timestamp > now() - INTERVAL 7 DAY) AS sims_optimizare,
    countIf(event = 'tool_simulation_ran' AND properties.tool = 'depozit' AND timestamp > now() - INTERVAL 7 DAY) AS sims_depozit,
    countIf(event = 'tool_simulation_ran' AND properties.tool = 'investitii' AND timestamp > now() - INTERVAL 7 DAY) AS sims_investitii,
    uniqIf(distinct_id, timestamp > now() - INTERVAL 1 DAY) AS unique_today,
    uniqIf(distinct_id, timestamp > now() - INTERVAL 7 DAY) AS unique_week,
    countIf(event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY) AS pageviews_week
`.trim();

/**
 * Sparkline query. `GROUP BY day` + a date range gives us per-day counts.
 * Missing days are backfilled to 0 in TS below (HogQL wouldn't emit a row for
 * a day with 0 events), so the sparkline always has exactly 14 points.
 */
const SPARKLINE_QUERY = `
  SELECT
    toStartOfDay(timestamp) AS day,
    count() AS cnt
  FROM events
  WHERE event = 'tool_simulation_ran'
    AND timestamp > now() - INTERVAL 14 DAY
  GROUP BY day
  ORDER BY day ASC
`.trim();

/**
 * POST a HogQL query to PostHog and return the first row. Throws on HTTP
 * error or malformed response — caller wraps in try/catch and surfaces a
 * friendly message.
 *
 * We don't use `fetch`'s `next.revalidate` here because PostHog queries are
 * POSTs, and Next's fetch cache only keys GET requests. Caching happens one
 * level up via `unstable_cache` in `fetchAdminStats`.
 */
async function queryHogQL<T = unknown>(query: string): Promise<T[]> {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    throw new Error("missing_credentials");
  }

  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Bearer auth — personal API keys are long-lived, rotate via PostHog
        // settings if ever leaked.
        authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
      }),
      // PostHog is usually fast (<500ms) but the free tier can spike. Cap at
      // 10s so an admin page load isn't held hostage by a slow query.
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(`posthog_${res.status}`);
  }

  const data = (await res.json()) as {
    results?: unknown[][];
    columns?: string[];
  };

  if (!data.results || !Array.isArray(data.results)) {
    throw new Error("posthog_shape");
  }

  // PostHog's response is tabular: `columns` names + `results` as row arrays.
  // Zip into objects so callers can use named fields.
  const cols = data.columns ?? [];
  return data.results.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

/**
 * Pad the sparkline to exactly 14 days, filling missing days with 0.
 *
 * PostHog returns rows only for days that had ≥1 event. For a consistent
 * width sparkline and readable axis we need every day present, so we
 * generate the expected 14-day range locally and left-join with the result.
 */
function padSparkline(
  raw: Array<{ day: string; cnt: number }>,
): AdminStats["sparkline"] {
  // Build a map keyed by "YYYY-MM-DD" of the day portion of the timestamp.
  const byDay = new Map<string, number>();
  for (const row of raw) {
    // PostHog returns `day` as ISO timestamp at midnight. Normalize to date.
    const key = row.day.slice(0, 10);
    byDay.set(key, Number(row.cnt) || 0);
  }

  // Generate 14 consecutive days ending today. toISOString().slice(0, 10) is
  // UTC-based, which matches PostHog's `toStartOfDay(timestamp)`.
  const out: AdminStats["sparkline"] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

/**
 * Core fetcher, wrapped in `unstable_cache` below. Kept as a separate async
 * function so the caching layer stays a one-liner and the logic is readable.
 */
async function fetchAdminStatsUncached(): Promise<AdminStats> {
  // Default shape — populated on every code path so consumers don't null-check.
  const empty: AdminStats = {
    status: "ok",
    simsToday: 0,
    simsWeek: 0,
    byTool: { credit: 0, optimizare: 0, depozit: 0, investitii: 0 },
    uniqueToday: 0,
    uniqueWeek: 0,
    pageviewsWeek: 0,
    sparkline: padSparkline([]),
  };

  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) {
    return {
      ...empty,
      status: "not_configured",
      reason: "Setează POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY pentru a vedea statistici live.",
    };
  }

  try {
    // Run both queries in parallel — they share no data, no reason to serialize.
    const [kpiRows, sparkRows] = await Promise.all([
      queryHogQL<{
        sims_today: number;
        sims_week: number;
        sims_credit: number;
        sims_optimizare: number;
        sims_depozit: number;
        sims_investitii: number;
        unique_today: number;
        unique_week: number;
        pageviews_week: number;
      }>(KPI_QUERY),
      queryHogQL<{ day: string; cnt: number }>(SPARKLINE_QUERY),
    ]);

    const kpi = kpiRows[0];
    if (!kpi) {
      // Query succeeded but returned no rows. PostHog can do this when the
      // project is brand new and has literally zero events — treat as "all
      // zeros" rather than an error.
      return empty;
    }

    return {
      status: "ok",
      simsToday: Number(kpi.sims_today) || 0,
      simsWeek: Number(kpi.sims_week) || 0,
      byTool: {
        credit: Number(kpi.sims_credit) || 0,
        optimizare: Number(kpi.sims_optimizare) || 0,
        depozit: Number(kpi.sims_depozit) || 0,
        investitii: Number(kpi.sims_investitii) || 0,
      },
      uniqueToday: Number(kpi.unique_today) || 0,
      uniqueWeek: Number(kpi.unique_week) || 0,
      pageviewsWeek: Number(kpi.pageviews_week) || 0,
      sparkline: padSparkline(sparkRows),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...empty,
      status: "error",
      reason: message === "missing_credentials"
        ? "Lipsesc credențialele PostHog."
        : `PostHog indisponibil (${message}).`,
    };
  }
}

/**
 * Public entry point — memoized with a 60s revalidation window.
 *
 * Cache key is static (`"admin-stats"`) because the query itself takes no
 * parameters. If we ever add per-user or per-tenant filtering, include those
 * as args to `unstable_cache`'s inner function — its memoization is keyed on
 * the argument list.
 *
 * Tags let us invalidate manually via `revalidateTag("posthog-admin-stats")`
 * if we ever need to force-refresh (e.g., after running a seed script).
 */
export const fetchAdminStats = unstable_cache(
  fetchAdminStatsUncached,
  ["posthog-admin-stats-v1"],
  { revalidate: 60, tags: ["posthog-admin-stats"] },
);
