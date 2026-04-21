/**
 * Sentry server-side config (runs in Node.js runtime — API routes,
 * server components, etc.).
 *
 * Without SENTRY_DSN set, this is a no-op. In production it captures
 * exceptions thrown in API routes (including our webhook handler) and
 * unhandled promise rejections.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  });
}
