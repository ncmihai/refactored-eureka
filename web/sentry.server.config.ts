// Sentry server-side (Node.js runtime) init.
//
// Fires inside `instrumentation.ts#register()` when NEXT_RUNTIME === 'nodejs'.
// Covers Server Components, Route Handlers, Server Actions, and Payload CMS
// admin requests — i.e. everything that runs on Vercel's Node runtime.
//
// Notes vs. wizard default:
// - DSN read from env, not hardcoded — so dev/CI without a DSN no-op cleanly
//   and we don't commit a DSN into version control.
// - `sendDefaultPii: false` — financial compute API, no need for IPs / cookies
//   in error payloads. The wizard default is `true` which is too permissive
//   for our data-sensitivity profile.
// - `tracesSampleRate: 0.1` matches FastAPI backend so both halves of the
//   stack produce comparable trace volumes under the 10K/mo free quota.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENV ??
      process.env.NEXT_PUBLIC_SENTRY_ENV ??
      process.env.VERCEL_ENV ??
      "development",
    tracesSampleRate: 0.1,
    // Stream Sentry.logger.* calls to Sentry logs backend (free tier
    // includes basic logging). Useful for server-side debug breadcrumbs.
    enableLogs: true,
    sendDefaultPii: false,
  });
}
