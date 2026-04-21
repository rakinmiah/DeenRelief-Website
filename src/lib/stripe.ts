/**
 * Server-side Stripe client — lazy singleton.
 *
 * Import this from API routes and server components only. The secret key
 * must never be exposed to the browser. For client-side Stripe.js (loading
 * the Payment Element), use `loadStripe` from `@stripe/stripe-js` with the
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY instead.
 *
 * The client is constructed lazily via a Proxy so that `next build` can
 * collect page data without STRIPE_SECRET_KEY being present. The key is only
 * required at request time, when any method on the client is first called.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local and Vercel Environment Variables."
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
    appInfo: {
      name: "Deen Relief",
      url: "https://deenrelief.org",
    },
  });
  return _stripe;
}

/**
 * Proxy that defers Stripe construction until the first property access.
 * Call sites look and feel like a direct import (`stripe.paymentIntents.create(...)`)
 * but no network client is built at module-load time.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Stripe amounts are in the smallest currency unit (pence for GBP). */
export const toPence = (gbp: number): number => Math.round(gbp * 100);

/** Convert pence back to GBP for display. */
export const fromPence = (pence: number): number => pence / 100;
