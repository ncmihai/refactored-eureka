/**
 * Admin dashboard widget — renders above the default Payload collections list
 * (`admin.components.beforeDashboard`) so the first thing a consultant sees
 * when logging in is usage telemetry, not a cold wall of cards.
 *
 * Design
 * ------
 * 1. Row of 4 KPI tiles: simulations today / week, unique visitors (24h),
 *    pageviews (7d). Each tile is scannable in a single eye-flick.
 * 2. Per-tool breakdown bar underneath — which of the 4 tools is pulling
 *    weight? This is the answer that keeps showing up in OVB pitch meetings,
 *    so it lives at the top, not buried in a report.
 * 3. Inline SVG sparkline for the last 14 days of simulations — trend beats
 *    absolute numbers for "is the platform being used?"
 *
 * Why SVG (not Recharts)
 * ----------------------
 * The `beforeDashboard` slot runs as a React Server Component. Recharts is a
 * client lib (uses React context + window). Pulling it in would force this
 * whole widget to become a client component, which means:
 *   - Ship the Recharts bundle (~150KB) into the admin chunk.
 *   - Hydrate on every admin page load.
 *   - Lose the ability to call `fetchAdminStats()` directly here.
 * A hand-rolled SVG polyline is ~30 lines and renders identically.
 *
 * Status modes
 * ------------
 * - `ok`               → render KPIs + bar + sparkline.
 * - `not_configured`   → render a helpful banner with setup instructions.
 *                        This is the local-dev path (no env vars), not an
 *                        error — we don't want the admin to scream red.
 * - `error`            → render a muted notice with the reason. Keeps the
 *                        rest of the dashboard working.
 */

import { fetchAdminStats, type AdminStats } from "../../../lib/posthog-server";

import "./styles.scss";

/**
 * Format a number with Romanian locale (thousands separator + space).
 * Examples: 0 → "0", 12 → "12", 1234 → "1.234", 12345 → "12.345".
 */
function fmt(n: number): string {
  return new Intl.NumberFormat("ro-RO").format(n);
}

/**
 * Format a YYYY-MM-DD day string as a short Romanian weekday + day number.
 * "2026-04-20" → "Lu 20". Used as sparkline axis tooltip (title attr).
 */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const wd = new Intl.DateTimeFormat("ro-RO", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
  const dd = d.getUTCDate();
  // Capitalize first letter ("lu" → "Lu") for consistency with UI.
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 2)} ${dd}`;
}

/**
 * Simple inline sparkline. `data` is an array of daily counts (length = 14).
 * Renders a closed area (under the line) + the line itself, scaled to the
 * provided viewBox. Zero-height bars still draw a flat line so the reader
 * sees the range visually.
 *
 * We emit raw SVG rather than a JS chart lib so this file stays an RSC.
 */
function Sparkline({ data }: { data: AdminStats["sparkline"] }) {
  const width = 240;
  const height = 40;
  const padding = 2;

  const counts = data.map((d) => d.count);
  const max = Math.max(1, ...counts); // avoid div-by-zero when all 0

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / Math.max(1, data.length - 1);

  // Convert each data point to an (x, y) coordinate. y is inverted (SVG 0 = top).
  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = padding + innerH - (d.count / max) * innerH;
    return { x, y, day: d.day, count: d.count };
  });

  // Line path — simple M + L commands, no bezier smoothing (14 data points
  // don't need it, and jagged is more honest than over-smoothed).
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // Area path — same line, but closed at the bottom for fill.
  const areaPath = `${linePath} L${points[points.length - 1]!.x.toFixed(1)},${
    height - padding
  } L${points[0]!.x.toFixed(1)},${height - padding} Z`;

  return (
    <svg
      className="ds-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Evoluție simulări 14 zile, total ${counts.reduce((a, b) => a + b, 0)}`}
    >
      <defs>
        <linearGradient id="ds-spark-grad" x1="0" y1="0" x2="0" y2="1">
          {/* Brand green, fading to transparent — matches --theme-success-500 */}
          <stop offset="0%" stopColor="rgb(42, 138, 103)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(42, 138, 103)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#ds-spark-grad)" stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="rgb(88, 174, 140)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Data point circles with tooltip titles — invisible until hover */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill="rgb(115, 190, 160)"
          opacity={p.count > 0 ? 0.9 : 0.25}
        >
          <title>
            {shortDay(p.day)}: {fmt(p.count)} simulări
          </title>
        </circle>
      ))}
    </svg>
  );
}

/**
 * Single KPI tile. Separating into its own component keeps the main JSX
 * readable and makes it trivial to add micro-sparklines or deltas later.
 */
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="ds-tile">
      <div className="ds-tile__label">{label}</div>
      <div className="ds-tile__value">
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {hint && <div className="ds-tile__hint">{hint}</div>}
    </div>
  );
}

/**
 * Horizontal per-tool bar. Each tool gets a segment sized proportional to
 * its share of the week's total simulations. Empty state (all zero) renders
 * a flat muted strip so the layout doesn't collapse.
 */
function ToolBreakdown({ byTool }: { byTool: AdminStats["byTool"] }) {
  const total =
    byTool.credit + byTool.optimizare + byTool.depozit + byTool.investitii;

  const entries = [
    { key: "credit", label: "Credit", value: byTool.credit, color: "var(--theme-success-500)" },
    { key: "optimizare", label: "Optimizare", value: byTool.optimizare, color: "var(--theme-success-400)" },
    { key: "depozit", label: "Depozit", value: byTool.depozit, color: "var(--theme-success-650)" },
    { key: "investitii", label: "Investiții", value: byTool.investitii, color: "var(--theme-success-750)" },
  ];

  return (
    <div className="ds-breakdown">
      <div className="ds-breakdown__header">
        <span className="ds-breakdown__title">Simulări pe unealtă — 7 zile</span>
        <span className="ds-breakdown__total">{fmt(total)} total</span>
      </div>
      <div className="ds-breakdown__bar" role="img" aria-label="Distribuție simulări pe unealtă">
        {total === 0 ? (
          <div className="ds-breakdown__empty" />
        ) : (
          entries.map((e) => {
            const pct = (e.value / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={e.key}
                className="ds-breakdown__seg"
                style={{ width: `${pct}%`, background: e.color }}
                title={`${e.label}: ${fmt(e.value)} (${pct.toFixed(1)}%)`}
              />
            );
          })
        )}
      </div>
      <div className="ds-breakdown__legend">
        {entries.map((e) => (
          <span key={e.key} className="ds-breakdown__legend-item">
            <span
              className="ds-breakdown__dot"
              style={{ background: e.color }}
              aria-hidden="true"
            />
            {e.label} <strong>{fmt(e.value)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Main widget export — registered in payload.config.ts via
 * `admin.components.beforeDashboard`.
 *
 * Async RSC; Payload's `RenderServerComponent` handles the await. Zero props
 * needed from Payload — we grab everything from env + PostHog directly.
 */
export default async function DashboardStats() {
  const stats = await fetchAdminStats();

  return (
    <div className="dashboard-stats">
      <div className="ds-header">
        <h2 className="ds-header__title">Activitate platformă</h2>
        <span className="ds-header__badge">
          PostHog EU · cache 60s
          {stats.status === "not_configured" && " · neconfigurat"}
          {stats.status === "error" && " · eroare"}
        </span>
      </div>

      {stats.status !== "ok" && (
        <div
          className={`ds-notice ds-notice--${stats.status}`}
          role={stats.status === "error" ? "alert" : "status"}
        >
          {stats.reason}
        </div>
      )}

      <div className="ds-tiles">
        <StatTile label="Simulări azi" value={stats.simsToday} />
        <StatTile label="Simulări · 7 zile" value={stats.simsWeek} />
        <StatTile
          label="Vizitatori unici · 24h"
          value={stats.uniqueToday}
          hint={`${fmt(stats.uniqueWeek)} în ultimele 7 zile`}
        />
        <StatTile
          label="Pageviews · 7 zile"
          value={stats.pageviewsWeek}
        />
      </div>

      <div className="ds-row">
        <ToolBreakdown byTool={stats.byTool} />
        <div className="ds-spark-wrap">
          <div className="ds-spark-wrap__label">Ultimele 14 zile</div>
          <Sparkline data={stats.sparkline} />
        </div>
      </div>
    </div>
  );
}
