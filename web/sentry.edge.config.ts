// Sentry Edge-runtime init.
//
// Fires inside `instrumentation.ts#register()` when NEXT_RUNTIME === 'edge'.
// We don't currently ship middleware or edge routes — this is scaffolding
// so errors get captured if/when we add one (e.g. an i18n or geo-redirect
// middleware). Safe to keep empty-DSN-guarded: no DSN → no SDK cost.
//
// Same privacy / sampling discipline as the Node-runtime config.
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
    enableLogs: true,
    sendDefaultPii: false,
  });
}
