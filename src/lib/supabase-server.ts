import "server-only";

/**
 * Server-side, cookie-backed Supabase clients for SPONSOR auth.
 *
 * Two factories, both built on @supabase/ssr:
 *
 *   createServerSupabase()
 *     For Server Components, Route Handlers, and Server Actions under
 *     /sponsor. Reads + writes the sponsor session cookie via next/headers.
 *     Carries the signed-in sponsor's JWT, so RLS (migration 031) scopes
 *     every read to that sponsor — this is the RLS-RESPECTING client used
 *     to authorise sponsor access. It is NOT the service-role client and
 *     CANNOT see other sponsors' data.
 *
 *   updateSponsorSession(request)
 *     For the root middleware. Refreshes an expiring sponsor session and
 *     returns the NextResponse carrying any rotated auth cookies.
 *
 * Separation of concerns (do not conflate):
 *   - Admin auth        → custom HMAC `dr_admin_session` cookie (unchanged).
 *   - Sponsor auth      → Supabase cookies handled here.
 *   - Service-role      → getSupabaseAdmin() in src/lib/supabase.ts.
 *
 * IMPORTANT: never use createServerSupabase() to mint signed media URLs or
 * perform privileged writes — those go through getSupabaseAdmin(). This
 * client exists to (a) identify the sponsor and (b) make RLS-scoped reads.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

function requireEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  return { url, key };
}

/**
 * Cookie-backed client for the current request. Must be awaited because
 * next/headers `cookies()` is async in the App Router.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const { url, key } = requireEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components, setting cookies throws (read-only). The
        // middleware (updateSponsorSession) handles refresh, so swallowing
        // here is safe — the session still refreshes on the next request.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* called from a Server Component — ignore. */
        }
      },
    },
  });
}

/**
 * The verified signed-in sponsor for this request, or null.
 *
 * Uses auth.getUser() (which re-validates the JWT with the Supabase Auth
 * server) rather than getSession() (which trusts the cookie blindly) — the
 * stricter check is the right default for an authorisation decision.
 */
export async function getSponsorUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
