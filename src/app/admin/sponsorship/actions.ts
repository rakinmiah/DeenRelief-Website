"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { logAdminAction, type AdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  createOrphan,
  updateOrphan,
  createUpdate,
  updateUpdate,
  publishUpdate,
  unpublishUpdate,
  getMediaRowById,
  deleteMediaRow,
  getOrphanById,
  upsertSponsorProfile,
  setSponsorStatus,
  createSponsorshipLink,
  setSponsorshipStatus,
  markDataRequestFulfilled,
  eraseSponsor,
  type UpdateOrphanInput,
  type SponsorshipStatus,
} from "@/lib/sponsorship-admin";
import { deleteOrphanMedia } from "@/lib/orphan-media";
import { sendSponsorInviteEmail } from "@/lib/sponsor-invite-email";

/**
 * Server actions for /admin/sponsorship.
 *
 * Every action re-verifies access with requireSponsorshipAccess() (admin OR
 * the sponsorship coordinator) before any mutation — defence in depth on top
 * of the page guard, because this surface handles children's data. All
 * privileged work uses the service-role client.
 */

async function audit(
  action: AdminAction,
  userEmail: string,
  targetId: string | null,
  metadata: Record<string, unknown>
) {
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action,
    userEmail,
    targetId: targetId ?? undefined,
    request: fauxRequest,
    metadata,
  });
}

// ─────────────────────────────────────────────────────────────────
// Orphans
// ─────────────────────────────────────────────────────────────────

export async function createOrphanAction(formData: FormData) {
  const session = await requireSponsorshipAccess();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const result = await createOrphan(displayName || "New child");
  if ("error" in result) throw new Error(result.error);
  await audit("orphan_created", session.email, result.id, { displayName });
  redirect(`/admin/sponsorship/orphans/${result.id}`);
}

export async function saveOrphanAction(
  orphanId: string,
  input: UpdateOrphanInput
): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const session = await requireSponsorshipAccess();
  const before = await getOrphanById(orphanId);
  const result = await updateOrphan(orphanId, input);
  if (!result.ok) return { ok: false, error: result.error };
  await audit("orphan_updated", session.email, orphanId, { slug: result.slug });
  if (before && before.status !== input.status) {
    await audit("orphan_status_changed", session.email, orphanId, {
      from: before.status,
      to: input.status,
    });
  }
  revalidatePath(`/admin/sponsorship/orphans/${orphanId}`);
  return { ok: true, slug: result.slug };
}

// ─────────────────────────────────────────────────────────────────
// Updates
// ─────────────────────────────────────────────────────────────────

export async function createUpdateAction(orphanId: string) {
  const session = await requireSponsorshipAccess();
  const result = await createUpdate({ orphanId, authorEmail: session.email });
  if ("error" in result) throw new Error(result.error);
  await audit("orphan_update_created", session.email, result.id, { orphanId });
  redirect(`/admin/sponsorship/orphans/${orphanId}/updates/${result.id}`);
}

export async function saveUpdateAction(
  updateId: string,
  input: { title: string; bodyHtml: string; periodLabel: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await updateUpdate(updateId, input);
  if (!result.ok) return result;
  await audit("orphan_update_updated", session.email, updateId, {});
  return { ok: true };
}

export async function publishUpdateAction(
  updateId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await publishUpdate(updateId);
  if (!result.ok) return result;
  await audit("orphan_update_published", session.email, updateId, {});
  return { ok: true };
}

export async function unpublishUpdateAction(
  updateId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await unpublishUpdate(updateId);
  if (!result.ok) return result;
  await audit("orphan_update_unpublished", session.email, updateId, {});
  return { ok: true };
}

export async function deleteMediaAction(
  mediaId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const row = await getMediaRowById(mediaId);
  if (!row) return { ok: false, error: "Media not found." };
  const result = await deleteMediaRow(mediaId);
  if (!result.ok) return result;
  // Best-effort binary cleanup after the row is gone.
  await deleteOrphanMedia(row.storagePath);
  await audit("orphan_media_deleted", session.email, mediaId, {
    orphanId: row.orphanId,
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Sponsors + invites
// ─────────────────────────────────────────────────────────────────

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://deenrelief.org"
  );
}

/**
 * Invite a sponsor: create (or fetch) the Supabase Auth user, upsert their
 * sponsor_profiles row, generate a single-use action link, and email it via
 * Resend. Optionally link them to an orphan in the same step.
 */
export async function inviteSponsorAction(input: {
  email: string;
  fullName: string;
  stripeCustomerId?: string;
  orphanId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) {
    return { ok: false, error: "That doesn't look like a valid email." };
  }

  const supabase = getSupabaseAdmin();
  const redirectTo = `${siteOrigin()}/sponsor/set-password`;

  // Generate an invite link. This creates the auth.users row if absent.
  // We use the link's `hashed_token` (not the raw action_link) to build a
  // URL to our own callback, which verifies it server-side via verifyOtp.
  // That sidesteps client-flow (PKCE vs implicit) ambiguity that otherwise
  // makes the raw link land on a page with no session ("link expired").
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  let userId = data?.user?.id ?? null;
  let tokenHash = data?.properties?.hashed_token ?? null;
  let linkType: "invite" | "recovery" = "invite";

  // If the user already exists, generateLink('invite') errors — fall back to
  // a recovery link so we can still (re-)send them an activation email.
  if (error || !userId || !tokenHash) {
    const recovery = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (recovery.error || !recovery.data?.properties?.hashed_token) {
      console.error("[sponsorship] invite link generation failed:", error?.message ?? recovery.error?.message);
      return { ok: false, error: "Couldn't generate the invite link." };
    }
    userId = recovery.data.user?.id ?? userId;
    tokenHash = recovery.data.properties.hashed_token;
    linkType = "recovery";
  }

  if (!userId) return { ok: false, error: "Couldn't resolve the sponsor account." };

  const actionLink =
    `${siteOrigin()}/sponsor/auth/callback` +
    `?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=${linkType}` +
    `&next=${encodeURIComponent("/sponsor/set-password")}`;

  await upsertSponsorProfile({
    id: userId,
    fullName: input.fullName,
    contactEmail: email,
    stripeCustomerId: input.stripeCustomerId ?? null,
    invitedByEmail: session.email,
  });

  if (input.orphanId) {
    await createSponsorshipLink({
      sponsorId: userId,
      orphanId: input.orphanId,
      createdByEmail: session.email,
    });
    await audit("sponsorship_linked", session.email, userId, {
      orphanId: input.orphanId,
    });
  }

  const sent = await sendSponsorInviteEmail({
    toEmail: email,
    toName: input.fullName,
    actionLink,
  });
  if (sent.error) {
    // The account + link exist; only the email send failed. Surface it so
    // the coordinator can retry or copy the link manually.
    await audit("sponsor_invited", session.email, userId, { email, emailError: sent.error });
    return { ok: false, error: `Account created but email failed: ${sent.error}` };
  }

  await audit("sponsor_invited", session.email, userId, { email });
  revalidatePath("/admin/sponsorship/sponsors");
  return { ok: true };
}

export async function linkSponsorshipAction(input: {
  sponsorId: string;
  orphanId: string;
  stripeSubscriptionId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await createSponsorshipLink({
    sponsorId: input.sponsorId,
    orphanId: input.orphanId,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    createdByEmail: session.email,
  });
  if ("error" in result) return { ok: false, error: result.error };
  await audit("sponsorship_linked", session.email, input.sponsorId, {
    orphanId: input.orphanId,
  });
  revalidatePath(`/admin/sponsorship/sponsors/${input.sponsorId}`);
  return { ok: true };
}

export async function setSponsorshipStatusAction(
  sponsorshipId: string,
  status: SponsorshipStatus
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await setSponsorshipStatus(sponsorshipId, status);
  if (!result.ok) return result;
  await audit(
    status === "ended" ? "sponsorship_ended" : "sponsorship_paused",
    session.email,
    sponsorshipId,
    { status }
  );
  return { ok: true };
}

export async function suspendSponsorAction(
  sponsorId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await setSponsorStatus(sponsorId, "suspended");
  if (!result.ok) return result;
  await audit("sponsor_suspended", session.email, sponsorId, {});
  revalidatePath(`/admin/sponsorship/sponsors/${sponsorId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Data subject requests (UK GDPR)
// ─────────────────────────────────────────────────────────────────

export async function fulfillExportRequestAction(
  requestId: string,
  sponsorId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  // The export JSON itself is downloaded by the sponsor via
  // /api/sponsor/export; here the coordinator records that the request has
  // been actioned (e.g. after assisting a sponsor who couldn't self-serve).
  const result = await markDataRequestFulfilled(requestId, session.email);
  if (!result.ok) return result;
  await audit("sponsor_data_export_fulfilled", session.email, sponsorId, {
    requestId,
  });
  revalidatePath("/admin/sponsorship/data-requests");
  return { ok: true };
}

export async function fulfillErasureRequestAction(
  requestId: string,
  sponsorId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  // Erase first, then mark the request fulfilled. deleteUser cascades all
  // sponsor rows (incl. this request), so record the audit BEFORE erasing
  // — the request row will be gone afterwards.
  await audit("sponsor_erasure_fulfilled", session.email, sponsorId, {
    requestId,
  });
  const erased = await eraseSponsor(sponsorId);
  if (!erased.ok) return erased;
  revalidatePath("/admin/sponsorship/data-requests");
  return { ok: true };
}
