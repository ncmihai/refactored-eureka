// Sentry client-side init.
//
// `instrumentation-client.ts` runs after HTML load but before React hydration
// (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md).
// That timing is ideal for setting up error tracking — we catch React render
// errors, unhandled promise rejections, and navigation-time failures.
//
// DSN is read from NEXT_PUBLIC_SENTRY_DSN; if unset we no-op so dev/CI
// without a DSN don't trip the SDK. Release tag is left undefined — Vercel
// injects VERCEL_GIT_COMMIT_SHA which the Sentry plugin (withSentryConfig)
// picks up automatically on build.
import * as Sentry from "@sentry/nextjs";

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

// Hook the App Router navigation events into Sentry so transactions span
// client-side route changes. Required by Sentry 8+ when using App Router.
// Per Next.js 16 docs, the export name must be `onRouterTransitionStart`.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
