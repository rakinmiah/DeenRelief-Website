import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Verifies invite + password-recovery email links and establishes the
 * sponsor's session cookie, then forwards them to set their password.
 *
 * Supports both link shapes so it works regardless of the project's auth
 * flow setting:
 *   - `?token_hash=…&type=invite|recovery` → verifyOtp (the SSR-recommended
 *     pattern; this is what our invite email + the recovery template use).
 *   - `?code=…` → exchangeCodeForSession (PKCE, e.g. magic links).
 *
 * On success → redirect to `next` (default /sponsor/set-password). On any
 * failure → /sponsor/login?error=link so the page can offer a resend.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/sponsor/set-password";

  const supabase = await createServerSupabase();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(new URL("/sponsor/login?error=link", url.origin));
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/sponsor/login?error=link", url.origin));
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // No recognisable token in the URL.
  return NextResponse.redirect(new URL("/sponsor/login?error=link", url.origin));
}
