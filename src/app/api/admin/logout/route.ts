import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";
import { verifyAdminSession } from "@/lib/signed-token";

/**
 * POST /api/admin/logout
 *
 * Clears the dr_admin_session cookie + audit-logs the sign-out so
 * trustees see explicit "session ended" rows alongside their sign-ins.
 *
 * We extract the email from the cookie BEFORE clearing — once cleared,
 * we'd no longer know who signed out. The cookie may already be
 * expired/missing (signed-out twice, or session timed out then user
 * clicked sign-out anyway); in that case we log with userEmail=null.
 */
export async function POST(request: Request) {
  // Best-effort decode of the cookie to capture the user's email.
  // Don't fail the logout if cookie is missing/invalid — sign out is
  // always allowed.
  let userEmail: string | null = null;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/dr_admin_session=([^;]+)/);
  if (match) {
    const session = verifyAdminSession(decodeURIComponent(match[1]));
    if (session) userEmail = session.email;
  }

  await logAdminAction({
    action: "sign_out",
    userEmail,
    request,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    "dr_admin_session=",
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
