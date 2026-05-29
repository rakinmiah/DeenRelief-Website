import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * OAuth/PKCE callback for invite + recovery links.
 *
 * Supabase email links land here with a `?code=` (PKCE) which we exchange
 * for a session cookie, then forward the sponsor to set their password.
 * Older email templates may instead deliver tokens in the URL hash, which
 * the set-password client handles directly — so a missing code isn't fatal.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/sponsor/set-password";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL("/sponsor/login?error=link", url.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
