/**
 * Supabase clients — two separate instances for different security contexts.
 *
 * - `supabase` (anon): safe for browser. Respects Row-Level Security.
 *    Use for any client-side reads.
 *
 * - `supabaseAdmin` (service_role): SERVER ONLY. Bypasses RLS. Use for
 *    inserting donations, gift aid declarations, and webhook events.
 *    Never import this from a client component or expose the service_role
 *    key in any way.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
}
if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
}

/** Browser-safe client. Respects Row-Level Security. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-only admin client. Bypasses Row-Level Security — only use in:
 *   - API routes (src/app/api/**)
 *   - Server components that need to write donation data
 *   - Never in "use client" components or Edge middleware
 *
 * Returns null if the service key is missing (e.g. during preview builds
 * before env vars are set). Callers should handle the null case gracefully.
 */
export function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This is a server-only variable."
    );
  }
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
