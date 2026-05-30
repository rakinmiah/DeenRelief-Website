"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { logAdminAction, type AdminAction } from "@/lib/admin-audit";
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
  getSponsorById,
  setSponsorStatus,
  createSponsorshipLink,
  setSponsorshipStatus,
  markDataRequestFulfilled,
  eraseSponsor,
  type UpdateOrphanInput,
  type SponsorshipStatus,
} from "@/lib/sponsorship-admin";
import { deleteOrphanMedia } from "@/lib/orphan-media";
import { provisionSponsorAndSendActivation } from "@/lib/sponsor-onboarding";

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

/**
 * Invite a sponsor: provision the account + email a branded activation link,
 * optionally linking them to an orphan in the same step.
 */
export async function inviteSponsorAction(input: {
  email: string;
  fullName: string;
  stripeCustomerId?: string;
  orphanId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const result = await provisionSponsorAndSendActivation({
    email: input.email,
    fullName: input.fullName,
    stripeCustomerId: input.stripeCustomerId ?? null,
    invitedByEmail: session.email,
    variant: "invite",
  });

  // Link the orphan if the account exists, even if the email send failed.
  if (result.userId && input.orphanId) {
    await createSponsorshipLink({
      sponsorId: result.userId,
      orphanId: input.orphanId,
      createdByEmail: session.email,
    });
    await audit("sponsorship_linked", session.email, result.userId, {
      orphanId: input.orphanId,
    });
  }

  if (!result.ok) {
    if (result.userId) {
      await audit("sponsor_invited", session.email, result.userId, {
        email: input.email,
        emailError: result.error,
      });
    }
    return { ok: false, error: result.error };
  }

  await audit("sponsor_invited", session.email, result.userId ?? null, {
    email: input.email,
  });
  revalidatePath("/admin/sponsorship/sponsors");
  return { ok: true };
}

/** Re-send the activation email to a sponsor who hasn't set a password yet. */
export async function resendActivationAction(
  sponsorId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSponsorshipAccess();
  const sponsor = await getSponsorById(sponsorId);
  if (!sponsor) return { ok: false, error: "Sponsor not found." };

  const result = await provisionSponsorAndSendActivation({
    email: sponsor.contactEmail,
    fullName: sponsor.fullName,
    stripeCustomerId: sponsor.stripeCustomerId,
    variant: "invite",
  });
  if (!result.ok) return { ok: false, error: result.error };

  await audit("sponsor_invited", session.email, sponsorId, {
    email: sponsor.contactEmail,
    resend: true,
  });
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
