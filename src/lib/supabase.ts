/**
 * Supabase clients — two separate instances for different security contexts.
 *
 * - `supabase` (anon): safe for browser. Respects Row-Level Security.
 *    Use for any client-side reads.
 *
 * - `getSupabaseAdmin()` (service_role): SERVER ONLY. Bypasses RLS. Use for
 *    inserting donations, gift aid declarations, and webhook events.
 *    Never import this from a client component or expose the service_role
 *    key in any way.
 *
 * Both clients are lazy so `next build` can collect page data without env
 * vars present. Throws only happen at actual call time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _anon: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

function buildAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  return createClient(url, key);
}

/** Browser-safe client. Respects Row-Level Security. Lazy — constructed on first use. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_anon) _anon = buildAnon();
    const value = Reflect.get(_anon, prop, recv);
    return typeof value === "function" ? value.bind(_anon) : value;
  },
});

/**
 * Server-only admin client. Bypasses Row-Level Security — only use in:
 *   - API routes (src/app/api/**)
 *   - Server components that need to write donation data
 *   - Never in "use client" components or Edge middleware
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This is a server-only variable."
    );
  }
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
