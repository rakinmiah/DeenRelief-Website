/**
 * Sentry client-side config.
 *
 * Initialises in the browser once NEXT_PUBLIC_SENTRY_DSN is set. Without
 * a DSN, Sentry is a no-op — safe to ship without a Sentry account yet.
 *
 * Setup:
 *   1. Create a project at sentry.io (Next.js template)
 *   2. Grab the DSN (looks like https://xxxx@oyyy.ingest.sentry.io/zzz)
 *   3. Set NEXT_PUBLIC_SENTRY_DSN in Vercel env vars
 *   4. Redeploy
 *
 * For richer features (source maps, auth tokens), run:
 *   npx @sentry/wizard@latest -i nextjs
 * It'll walk you through the full setup interactively.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Capture 10% of transactions for performance monitoring. Adjust based
    // on volume — higher = more data, more cost. 0 = errors only.
    tracesSampleRate: 0.1,
    // Replay sessions when errors occur (10% of sessions, 100% with errors).
    // Disable entirely by setting both to 0 if you don't want the Replay bundle.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't ping Sentry during development — just noise.
    enabled: process.env.NODE_ENV === "production",
  });
}
