// Client-side instrumentation entry point.
//
// `instrumentation-client.ts` runs after HTML load but before React hydration
// (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md).
// That timing is ideal for setting up error tracking and analytics — we catch
// React render errors, unhandled promise rejections, and capture the very
// first page view before any user interaction.
//
// Two tools run here:
//   - Sentry   — error tracking & tracing (DSN from NEXT_PUBLIC_SENTRY_DSN)
//   - PostHog  — GDPR-safe product analytics (KEY from NEXT_PUBLIC_POSTHOG_KEY)
// Both silently no-op when their env keys are missing so dev/CI don't need
// real secrets to boot.
import * as Sentry from "@sentry/nextjs";
import { capturePageView, initPostHog } from "./lib/posthog";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Env tag — `production` | `preview` | `development`. Matches Vercel's
    // own VERCEL_ENV so the tag in Sentry lines up with deploy target.
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "development",
    // Performance: sample 10% of transactions. Well under the 10K/month
    // free-tier performance quota at our traffic level.
    tracesSampleRate: 0.1,
    // No session replay — free tier includes 50 sessions/month, not worth
    // the bundle bloat right now. Revisit once we have real user traffic.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // PII scrubbing — financial planning UI, no reason to ship IPs/cookies.
    sendDefaultPii: false,
  });
}

// Boot PostHog. This is a no-op when NEXT_PUBLIC_POSTHOG_KEY is unset (local
// dev, preview builds without secrets) so we don't need to guard the call.
// See lib/posthog.ts for the privacy-safe config.
initPostHog();

// Fire the initial page view. `onRouterTransitionStart` only covers
// *subsequent* navigations — the first hit (direct visit, refresh, social
// link) doesn't go through the transition hook.
if (typeof window !== "undefined") {
  capturePageView(window.location.pathname + window.location.search);
}

// Router navigation hook. Per Next.js 16 docs the export name must be
// `onRouterTransitionStart`. We forward to both Sentry (for transaction
// spans) and PostHog (for $pageview counting).
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void {
  Sentry.captureRouterTransitionStart(url, navigationType);
  capturePageView(url);
}
