import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { deleteAdminPushSubscription } from "@/lib/admin-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Removes a Web Push subscription.
 *
 * Called from the client after pushManager.unsubscribe() resolves
 * (so the browser has already revoked the subscription on its end
 * and our row would be a 410-Gone-on-next-send ghost otherwise).
 *
 * We accept the endpoint in the body because the client is the
 * only thing that knows its own endpoint — we don't trust the
 * admin session alone to identify which device the user is sat
 * at (one trustee might have multiple device rows).
 */
export async function POST(req: Request) {
  // Session check primarily to keep this endpoint behind the same
  // auth wall as everything else under /api/admin/* — the
  // unsubscribe itself isn't sensitive (worst case: an attacker
  // forces a permission-revoke they could already trigger from
  // their own browser), but consistency keeps the route audit
  // table coherent.
  await requireAdminSession();

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint" },
      { status: 400 }
    );
  }

  await deleteAdminPushSubscription(body.endpoint);
  return NextResponse.json({ success: true });
}
