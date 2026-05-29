/**
 * Edge-runtime helper for the root middleware: refreshes the SPONSOR
 * session cookie when it's expiring.
 *
 * Kept in its own file (no "server-only", no next/headers) so it bundles
 * cleanly into the Edge middleware. It works purely off the NextRequest's
 * own cookie jar — never next/headers' cookies() — which is the only
 * cookie API available in middleware.
 *
 * Returns the NextResponse the middleware should ultimately send, carrying
 * any rotated Supabase auth cookies. It does NOT make authorisation
 * decisions — page/route guards (getSponsorUser) do that.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSponsorSession(
  request: NextRequest
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If Supabase isn't configured (e.g. a preview build without env), don't
  // block the request — just pass it through unchanged.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Triggers a token refresh + cookie rotation when needed.
  await supabase.auth.getUser();
  return response;
}
