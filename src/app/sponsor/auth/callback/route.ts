import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Verifies invite + password-recovery email links and establishes the
 * sponsor's session cookie, then forwards them to set their password.
 *
 * Cookie handling is bound DIRECTLY to the redirect response we return —
 * not the next/headers store — because cookies written to that store do not
 * reliably attach to a NextResponse.redirect() in the App Router. Without
 * this, verifyOtp succeeds but the session cookie is dropped, and the
 * set-password page wrongly reports the link as expired.
 *
 * Supports both link shapes:
 *   - `?token_hash=…&type=invite|recovery` → verifyOtp (our invite email +
 *     the recovery email template use this).
 *   - `?code=…` → exchangeCodeForSession (PKCE magic links).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/sponsor/set-password";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/sponsor/login?error=config", url.origin));
  }

  // Build the success response FIRST and write session cookies onto it.
  const successResponse = NextResponse.redirect(new URL(next, url.origin));
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          successResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  let ok = false;
  let reason = "no-token";
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) reason = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) reason = error.message;
  }

  if (ok) return successResponse;

  console.error("[sponsor/auth/callback] verification failed:", reason);
  return NextResponse.redirect(new URL("/sponsor/login?error=link", url.origin));
}
