/**
 * PostHog client wrapper — GDPR-safe analytics for the instrumentar platform.
 *
 * Why this file exists
 * --------------------
 * The raw posthog-js API is flexible but easy to misconfigure in ways that
 * break our privacy posture. We want: anonymous counting of tool usage, zero
 * PII, zero session replay, no autocapture of form values. Centralizing init
 * here means every feature that calls `capture(...)` inherits the same safe
 * defaults — nothing elsewhere in the app should import `posthog-js` directly.
 *
 * Events we care about (MVP)
 * --------------------------
 * - `$pageview`         — which pages consultants land on. Fired manually on
 *                         route change (autocapture + capture_pageview are off).
 * - `tool_simulation_ran` — a consultant ran the math for one of the 4 tools.
 *                           Property: `tool` ∈ {credit, depozit, investitii, optimizare}.
 *                           NO input values are sent — only the fact it happened.
 * - `tool_pdf_exported`   — reserved for PDF v1 (not yet wired).
 *
 * Dual init (boot + opt-in)
 * -------------------------
 * `initPostHog` is called unconditionally from `instrumentation-client.ts` so
 * the SDK is loaded and ready, but in GDPR-strict mode (`opt_out_capturing_by_default`)
 * so nothing ships until the user consents. We flip the switch via
 * `grantAnalyticsConsent()` once the cookie banner is in (not yet — MVP ships
 * consent-off, we'll add the banner before turning the key on in prod).
 */
import posthog, { type PostHog } from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let booted = false;

/**
 * Initialize the PostHog JS SDK with GDPR-safe defaults.
 *
 * Called once from `instrumentation-client.ts`. Safe to call repeatedly — the
 * `booted` guard + posthog-js's own internal guard both no-op subsequent calls.
 *
 * Config choices & why:
 *   - `api_host` defaults to EU region. Keep data in the EU for GDPR — never
 *     switch to `app.posthog.com` without re-reviewing the DPA.
 *   - `person_profiles: 'identified_only'` — don't create a profile for every
 *     anonymous visitor. PostHog still counts events, we just never attach a
 *     person record unless/until we call `posthog.identify(...)` (we don't).
 *   - `autocapture: false` — no automatic click/input tracking. We only want
 *     the events we explicitly emit, so form values never leak.
 *   - `capture_pageview: false` + `capture_pageleave: false` — App Router
 *     doesn't trigger real page reloads; autocapture would miss SPA nav
 *     entirely. We fire `$pageview` ourselves from `onRouterTransitionStart`.
 *   - `disable_session_recording: true` — replay would record form inputs.
 *     Hard-off, forever.
 *   - `disable_surveys: true` — don't load the surveys bundle; we don't use it.
 *   - `respect_dnt: true` — honour browsers that set Do-Not-Track.
 *   - `opt_out_capturing_by_default: false` — MVP: we ship capture-on because
 *     we use no PII. When/if we add identified features or the cookie banner
 *     lands, flip this to `true` and gate on consent.
 *   - `loaded` — tag every event with the Vercel environment so we can filter
 *     preview/prod/dev noise from each other in the PostHog UI.
 */
export function initPostHog(): PostHog | null {
  if (booted || typeof window === "undefined") return null;
  if (!POSTHOG_KEY) {
    // No key configured → silently no-op. Local dev without analytics, CI
    // without secrets, and preview deployments all fall through here.
    return null;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    loaded: (ph) => {
      ph.register({
        environment:
          process.env.NEXT_PUBLIC_SENTRY_ENV ??
          process.env.NEXT_PUBLIC_VERCEL_ENV ??
          "development",
      });
    },
  });

  booted = true;
  return posthog;
}

/**
 * Manually capture a page view. Called from `onRouterTransitionStart` so
 * client-side navigations between App Router routes are counted.
 *
 * We pass the resolved URL (origin + path) rather than letting PostHog read
 * `window.location` because the transition fires *before* the URL bar updates,
 * so `location.href` still points at the old page.
 */
export function capturePageView(url: string): void {
  if (!booted) return;
  try {
    const href = url.startsWith("http")
      ? url
      : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
    posthog.capture("$pageview", { $current_url: href });
  } catch {
    // Analytics must never break the app. Swallow.
  }
}

/** Tool slugs as they appear in URL + CMS. Keep these aligned with routes. */
export type ToolSlug = "credit" | "optimizare" | "depozit" | "investitii";

/**
 * Record that a user successfully ran a simulation. Called from each tool
 * page right after `setResult(await res.json())`.
 *
 * No input values are passed — just the fact that the math ran. This is enough
 * to answer the product question ("which tool gets used how often?") without
 * shipping any of the user's financial inputs to PostHog.
 */
export function captureSimulation(tool: ToolSlug): void {
  if (!booted) return;
  try {
    posthog.capture("tool_simulation_ran", { tool });
  } catch {
    // no-op
  }
}

/**
 * Record that a user exported a PDF for a tool. Reserved for PDF v1; wire
 * from the same place the PDF generation kicks off.
 */
export function capturePdfExport(tool: ToolSlug): void {
  if (!booted) return;
  try {
    posthog.capture("tool_pdf_exported", { tool });
  } catch {
    // no-op
  }
}
