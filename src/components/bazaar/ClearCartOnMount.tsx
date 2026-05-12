"use client";

import { useEffect } from "react";
import { useBazaarCart } from "@/components/bazaar/BazaarCartProvider";

/**
 * Tiny client-only component that wipes the cart on first paint. Sat
 * inside the server-rendered order confirmation page so the page
 * itself can stay a server component (and read the order via the
 * service-role Supabase client).
 *
 * Why on the confirmation page rather than at /api/bazaar/checkout
 * return time: the customer can hit back from Stripe Checkout, and
 * we want their cart still intact in that scenario. Only when the
 * order actually completes (i.e. they land on this page via Stripe's
 * success_url) do we clear.
 */
export default function ClearCartOnMount() {
  const { clearCart } = useBazaarCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
