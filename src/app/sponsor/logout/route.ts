import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Sign the sponsor out and clear the Supabase auth cookies, then send them to
 * the login page. GET so a plain link works (no CSRF risk — signing out is
 * not a sensitive state change and requires the user's own session).
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sponsor/login", request.url));
}
