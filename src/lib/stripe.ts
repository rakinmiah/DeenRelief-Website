/**
 * Server-side Stripe client — single shared instance.
 *
 * Import this from API routes and server components only. The secret key
 * must never be exposed to the browser. For client-side Stripe.js (loading
 * the Payment Element), use `loadStripe` from `@stripe/stripe-js` with the
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY instead.
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to .env.local and Vercel Environment Variables."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
  appInfo: {
    name: "Deen Relief",
    url: "https://deenrelief.org",
  },
});

/** Stripe amounts are in the smallest currency unit (pence for GBP). */
export const toPence = (gbp: number): number => Math.round(gbp * 100);

/** Convert pence back to GBP for display. */
export const fromPence = (pence: number): number => pence / 100;
