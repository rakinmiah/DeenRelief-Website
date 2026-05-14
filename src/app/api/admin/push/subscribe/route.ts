import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { storeAdminPushSubscription } from "@/lib/admin-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stores a Web Push subscription for the signed-in admin.
 *
 * Called from the client after pushManager.subscribe() succeeds.
 * Body shape mirrors the PushSubscription.toJSON() output that
 * browsers emit natively, so the client can just JSON.stringify
 * the subscription and POST it without massaging the shape.
 *
 * Idempotent: re-subscribing the same endpoint upserts the row,
 * so a user toggling notifications off and back on doesn't
 * accumulate duplicates.
 */
export async function POST(req: Request) {
  const session = await requireAdminSession();

  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      {
        error:
          "Missing required subscription fields (endpoint, keys.p256dh, keys.auth)",
      },
      { status: 400 }
    );
  }

  try {
    await storeAdminPushSubscription({
      userEmail: session.email,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
      userAgent: userAgent ?? null,
    });
  } catch (err) {
    console.error("[admin-push/subscribe] storage failed:", err);
    return NextResponse.json(
      {
        error: "Couldn't save the subscription. Try toggling notifications off and back on.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
