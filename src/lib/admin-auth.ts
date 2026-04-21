/**
 * Simple bearer-token auth for admin-only API routes.
 *
 * Set ADMIN_API_TOKEN in .env.local / Vercel env vars. To call a protected
 * endpoint:
 *   curl -H "Authorization: Bearer $ADMIN_API_TOKEN" https://deenrelief.org/api/admin/...
 *
 * Rotate the token by changing the env var and redeploying. Anyone with the
 * token can pull PII — treat it with the same care as the Supabase service
 * role key.
 */

export function requireAdminAuth(request: Request): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "ADMIN_API_TOKEN not configured on server." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { ok: true };
}

/**
 * Cron auth — Vercel Cron attaches a `CRON_SECRET` bearer token to scheduled
 * invocations. Reject anything else so the endpoint can't be hit externally.
 */
export function requireCronAuth(request: Request): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "CRON_SECRET not configured on server." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { ok: true };
}
