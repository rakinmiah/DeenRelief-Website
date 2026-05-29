"use client";

/**
 * Browser-side Supabase client for SPONSOR auth (the public account
 * system at /sponsor). Uses @supabase/ssr's createBrowserClient so the
 * session is stored in cookies that the server can read — keeping the
 * sponsor signed in across server-rendered pages.
 *
 * This is DISTINCT from src/lib/supabase.ts:
 *   - `supabase` there is the unauthenticated anon client for legacy
 *     public reads.
 *   - `getSupabaseAdmin()` there is the service-role client (server only).
 *   - This client carries the signed-in SPONSOR's JWT, so every query it
 *     runs is scoped by RLS to that sponsor (see migration 031).
 *
 * Only ever imported from "use client" components in /sponsor/* — sign in,
 * password reset, set-password, logout. Never used for admin auth (which
 * remains the custom dr_admin_session HMAC cookie).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  _client = createBrowserClient(url, key);
  return _client;
}
