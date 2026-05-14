/**
 * Server-side web push for the DR Admin PWA.
 *
 * Sits behind enqueueNotification so every bell-icon notification
 * also fires a real OS-level push to subscribed devices. Trustees
 * who've installed the PWA + granted permission get a phone buzz
 * on lock screen / notification shade — no need to actively watch
 * a tab.
 *
 * VAPID handshake:
 *   - Public key is exposed to the client (NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *     and is what the client passes to pushManager.subscribe() to
 *     identify "this site, this app server" to the browser push
 *     service (FCM/APNs/etc.). Safe to expose — it's literally
 *     designed to be public.
 *   - Private key (VAPID_PRIVATE_KEY) signs every outbound push so
 *     the browser push service trusts the message came from us.
 *     Server-only; if leaked, generate fresh keys with
 *     `npx web-push generate-vapid-keys` and re-subscribe all
 *     devices (old subscriptions become invalid).
 *
 * Generation: run `npx web-push generate-vapid-keys` once. Add
 * both keys + a contact email to .env (see .env.example).
 *
 * Failure semantics: fire-and-forget at the call-site level so a
 * dead push service never blocks a notification insert (which
 * was already successful at that point). 410 Gone responses
 * trigger lazy pruning — the subscription row is deleted so we
 * don't keep retrying a permanently-dead endpoint.
 */

import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase";

// Configure the library once per cold start. process.env access
// here is fine because Next.js evaluates this lazily on the first
// import after the runtime is ready.
let vapidConfigured = false;
function configureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@deenrelief.org";
  if (!publicKey || !privateKey) {
    console.warn(
      "[admin-push] VAPID keys not configured — skipping push send. " +
        "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY."
    );
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Subscription persistence
// ─────────────────────────────────────────────────────────────────

export interface SubscriptionInput {
  userEmail: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string | null;
}

/**
 * Upsert a subscription on the device. The client calls this from
 * the "Enable notifications" flow after the browser's
 * pushManager.subscribe() succeeds. We key on the endpoint so a
 * re-subscribe from the same device (after revoke + re-grant)
 * updates the existing row rather than creating duplicates.
 */
export async function storeAdminPushSubscription(
  input: SubscriptionInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_push_subscriptions").upsert(
    {
      user_email: input.userEmail,
      endpoint: input.endpoint,
      p256dh_key: input.p256dhKey,
      auth_key: input.authKey,
      user_agent: input.userAgent ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    throw new Error(`[admin-push] subscribe failed: ${error.message}`);
  }
}

/**
 * Delete a subscription. Called either from the unsubscribe API
 * (user explicitly disables in the admin UI) or lazily from the
 * push sender when the browser push service returns 410 Gone.
 */
export async function deleteAdminPushSubscription(
  endpoint: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) {
    console.error("[admin-push] delete failed:", error.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// Outbound push
// ─────────────────────────────────────────────────────────────────

export interface AdminPushPayload {
  title: string;
  body?: string | null;
  /** Click-through URL — opens this page on notificationclick. */
  url?: string | null;
  /** Dedup key — re-sending with the same tag replaces the prior
   *  visible notification on most platforms. Useful for "still
   *  unfulfilled" reminders where we don't want to stack. */
  tag?: string | null;
  /** Visual severity → influences icon/sound on supported
   *  platforms. Pass-through string; the SW can branch on it. */
  severity?: "info" | "warning" | "urgent";
}

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

/**
 * Fan a single payload out to every active admin subscription.
 *
 * Errors are isolated per-subscription — one expired endpoint
 * never prevents the others from receiving the push. 410 Gone
 * responses trigger immediate row deletion (the browser told us
 * the subscription is permanently dead).
 *
 * Returns the count of successful deliveries, mostly for tests +
 * logging. Callers should NOT branch on it (a count of 0 is
 * normal when no trustees have subscribed yet).
 */
export async function sendAdminPush(
  payload: AdminPushPayload
): Promise<number> {
  if (!configureVapid()) return 0;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_push_subscriptions")
    .select("id, endpoint, p256dh_key, auth_key");
  if (error) {
    console.error("[admin-push] list subscriptions failed:", error.message);
    return 0;
  }
  const subs = (data ?? []) as StoredSubscription[];
  if (subs.length === 0) return 0;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/admin/donations",
    tag: payload.tag ?? undefined,
    severity: payload.severity ?? "info",
  });

  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          json
        );
        delivered += 1;
        // Touch last_seen_at so we know this device is still
        // reachable. Fire-and-forget — race with another touch is
        // fine, last writer wins.
        supabase
          .from("admin_push_subscriptions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", sub.id)
          .then(() => {});
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          // 410 Gone or 404 Not Found = browser permanently
          // killed this subscription. Prune so we don't waste
          // bandwidth on every future enqueueNotification.
          await deleteAdminPushSubscription(sub.endpoint);
        } else {
          // Transient errors (network blip, 5xx from push service)
          // get logged but the row stays alive for the next
          // attempt. The web-push lib retries internally for
          // some classes; we don't add a second layer.
          console.warn(
            "[admin-push] sendNotification failed:",
            statusCode,
            err instanceof Error ? err.message : err
          );
        }
      }
    })
  );

  return delivered;
}
