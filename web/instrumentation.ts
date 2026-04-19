// Next.js server instrumentation entry point.
//
// `register()` runs once per server start — we use it to bootstrap Sentry
// on both the Node.js runtime (for SSR + Route Handlers) and the Edge
// runtime (for middleware + edge routes). Per Next.js 16 docs, we gate on
// NEXT_RUNTIME so Edge doesn't try to load Node-only code and vice versa.
//
// `onRequestError` is the App Router hook for server errors (Server
// Components, Route Handlers, Server Actions). `Sentry.captureRequestError`
// is the ready-made forwarder — re-exporting it satisfies Next's
// instrumentation contract and sends everything to Sentry automatically.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
