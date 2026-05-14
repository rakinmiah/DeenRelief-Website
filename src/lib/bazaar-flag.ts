/**
 * Pre-launch feature flag for the Bazaar customer-facing site.
 *
 * Why: the Bazaar code is fully built and tested on the preview
 * branch, but the client hasn't decided whether to launch publicly.
 * Merging to main is still useful (database migrations, admin
 * features, mobile shell) but the customer-facing /bazaar/* routes
 * need to stay invisible until the launch call is made.
 *
 * Set `NEXT_PUBLIC_BAZAAR_ENABLED=true` on Vercel (and only on
 * Vercel — the preview deployment is allowed to keep it
 * unconditionally enabled via a separate environment override) to
 * flip the customer-facing site live. Admin bazaar routes are
 * NOT gated — those live under /admin/* behind the trustee auth
 * cookie and are useful to keep working even while the storefront
 * is dark (a trustee can still browse the catalog, mark orders
 * shipped, etc.).
 *
 * Using NEXT_PUBLIC_* deliberately:
 *   - The value isn't sensitive (it's literally a yes/no on
 *     whether the shop is live, which any visitor figures out in
 *     one click once it ships)
 *   - Client-side components can read the flag too (e.g. to hide
 *     a "Visit the Shop" link in the main nav)
 *   - Vercel applies it on every deploy without a rebuild needed
 *     when toggled in the dashboard
 */
export function isBazaarLive(): boolean {
  return process.env.NEXT_PUBLIC_BAZAAR_ENABLED === "true";
}
