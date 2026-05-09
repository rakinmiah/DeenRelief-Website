import { NextResponse } from "next/server";

/**
 * POST /api/admin/logout
 *
 * Clears the dr_admin_session cookie by setting it to empty + Max-Age=0.
 * Browsers immediately drop the cookie. Subsequent admin requests fail
 * the auth gate and the trustee gets bounced to /admin/login.
 */
export async function POST() {
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
