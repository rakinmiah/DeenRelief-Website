/**
 * Admin audit log + rate limiting.
 *
 * Single source of truth for "what admin did what when". Every
 * privileged endpoint calls logAdminAction() on entry/exit so we have
 * a permanent, queryable trail.
 *
 * Audit log writes are fire-and-forget — if Supabase is briefly down,
 * the actual action still completes. The trade-off is occasional gaps
 * in the audit log under outage; the alternative ("block the refund
 * because the audit log is unreachable") is worse.
 *
 * Rate limiting reuses the same table: countRecentLoginFailures(ip)
 * reads sign_in_failed rows from the last N minutes. No Redis / KV
 * dependency. Slower than in-memory rate limiting but appropriate at
 * charity admin scale (~5 trustees × low frequency).
 */

import { getSupabaseAdmin } from "./supabase";

export type AdminAction =
  | "sign_in"
  | "sign_in_failed"
  | "sign_in_rate_limited"
  | "sign_out"
  | "view_gift_aid_csv"
  | "view_donations_csv"
  | "refund_donation"
  | "resend_receipt"
  | "cancel_subscription"
  | "send_portal_link"
  | "backfill_livemode";

interface LogAdminActionOpts {
  action: AdminAction;
  /** Email of the signed-in admin. Null for bearer-token access. */
  userEmail: string | null;
  /** Optional target ID — donation id, subscription id, etc. */
  targetId?: string | null;
  /** Action-specific structured data — refund amount, tax year, etc. */
  metadata?: Record<string, unknown>;
  /**
   * The Request object so we can extract IP + User-Agent. Always pass
   * this when the action originates from an HTTP request.
   */
  request?: Request;
}

/**
 * Pull the best-effort client IP from common forwarded-for headers.
 *
 * On Vercel: `x-forwarded-for` is set by the platform and is the
 * canonical source. Some setups also use `x-real-ip`. We take the
 * left-most IP from a comma-separated list (the original client).
 */
export function clientIpFromRequest(request: Request | undefined): string | null {
  if (!request) return null;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

function userAgentFromRequest(request: Request | undefined): string | null {
  if (!request) return null;
  return request.headers.get("user-agent");
}

/**
 * Write a row to admin_audit_log. Never throws — silently drops on
 * any error so the actual admin action isn't blocked by a logging
 * issue.
 */
export async function logAdminAction(opts: LogAdminActionOpts): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("admin_audit_log").insert({
      user_email: opts.userEmail,
      action: opts.action,
      target_id: opts.targetId ?? null,
      ip: clientIpFromRequest(opts.request),
      user_agent: userAgentFromRequest(opts.request),
      metadata: opts.metadata ?? null,
    });
  } catch (err) {
    // Don't surface the error — the action this is auditing has
    // already completed (or is about to). A logging failure is a
    // monitoring concern, not an operational one.
    console.error("[admin-audit] log write failed:", err);
  }
}

/**
 * Rate-limit configuration for admin login. Five failed attempts
 * within fifteen minutes from the same IP triggers the throttle.
 *
 * Why these numbers: we want to be lenient enough that a trustee
 * fat-fingering their passphrase a few times in a row doesn't lock
 * them out, but tight enough that a brute-force attempt against a
 * weak passphrase becomes infeasible. 5/15min ≈ 480 attempts/day,
 * which is far below the search space of any sane passphrase.
 */
export const LOGIN_RATE_LIMIT_WINDOW_MINUTES = 15;
export const LOGIN_RATE_LIMIT_MAX_FAILURES = 5;

/**
 * Count sign_in_failed rows from the given IP in the rate-limit
 * window. Returns 0 if anything goes wrong (fail-open: don't lock
 * out trustees because Supabase is briefly unavailable).
 */
export async function countRecentLoginFailures(
  ip: string | null
): Promise<number> {
  if (!ip) return 0; // No IP = can't rate limit; fail open
  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(
      Date.now() - LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    ).toISOString();
    const { count, error } = await supabase
      .from("admin_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("action", "sign_in_failed")
      .eq("ip", ip)
      .gte("created_at", cutoff);
    if (error) {
      console.error("[admin-audit] rate-limit query failed:", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[admin-audit] rate-limit query threw:", err);
    return 0;
  }
}

/**
 * Audit log row shape for the viewer page. Keeps the column set small
 * — sensitive metadata stays in the jsonb but is rendered only on
 * detail expansion.
 */
export interface AdminAuditLogRow {
  id: string;
  userEmail: string | null;
  action: AdminAction;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Fetch the most-recent N audit log entries for the viewer page.
 * Sorted by created_at DESC — newest first.
 */
export async function fetchAdminAuditLog(
  limit = 200
): Promise<AdminAuditLogRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, user_email, action, target_id, ip, user_agent, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin-audit] fetchAdminAuditLog failed:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    userEmail: (r.user_email as string | null) ?? null,
    action: r.action as AdminAction,
    targetId: (r.target_id as string | null) ?? null,
    ip: (r.ip as string | null) ?? null,
    userAgent: (r.user_agent as string | null) ?? null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at as string,
  }));
}
