"use server";

/**
 * Server actions for the short links admin section.
 *
 * Three actions:
 *   - createShortLink         — insert a new row with validation
 *   - archiveShortLink        — soft-delete (sets archived_at)
 *   - restoreShortLink        — undo archive (clears archived_at)
 *
 * Every action calls requireAdminSession (any role — admins AND
 * social users manage their own links) and logs to admin_audit.
 *
 * Slug uniqueness is enforced by the case-insensitive unique index in
 * migration 020. The catch on insert error checks for Postgres
 * 23505 (unique violation) and returns a friendly message instead of
 * the raw DB error.
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  describeSlugError,
  isShortLinkPlatform,
  normalizeSlug,
} from "@/lib/short-links";
import { isValidCampaign } from "@/lib/campaigns";

export type ShortLinkActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

interface CreateShortLinkInput {
  slug: string;
  destinationUrl: string;
  campaignSlug?: string;
  platform?: string;
  notes?: string;
}

export async function createShortLink(
  input: CreateShortLinkInput
): Promise<ShortLinkActionResult> {
  const session = await requireAdminSession();

  // ─── Validate ────────────────────────────────────────────────────────
  const slugError = describeSlugError(input.slug?.trim().toLowerCase() ?? "");
  if (slugError) return { ok: false, error: slugError };

  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "Invalid slug." };

  const destinationUrl = input.destinationUrl?.trim() ?? "";
  if (!destinationUrl) {
    return { ok: false, error: "Destination URL is required." };
  }
  // Accept either an absolute URL (https://…) or a relative path
  // starting with /. Anything else is a typo.
  if (
    !destinationUrl.startsWith("/") &&
    !/^https?:\/\//i.test(destinationUrl)
  ) {
    return {
      ok: false,
      error: 'Destination must be a path like "/qurbani" or a full https:// URL.',
    };
  }

  // Optional campaign tag — validate against the registry if set.
  let campaignSlug: string | null = null;
  if (input.campaignSlug && input.campaignSlug !== "") {
    if (!isValidCampaign(input.campaignSlug)) {
      return { ok: false, error: "Unknown campaign." };
    }
    campaignSlug = input.campaignSlug;
  }

  // Optional platform — validate against the allow-list if set.
  let platform: string | null = null;
  if (input.platform && input.platform !== "") {
    if (!isShortLinkPlatform(input.platform)) {
      return { ok: false, error: "Unknown platform." };
    }
    platform = input.platform;
  }

  const notes = input.notes?.trim() || null;

  // ─── Insert ──────────────────────────────────────────────────────────
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("short_links").insert({
    slug,
    destination_url: destinationUrl,
    campaign_slug: campaignSlug,
    platform,
    notes,
    created_by_email: session.email,
  });

  if (error) {
    // Postgres unique-violation code = 23505 → friendly message.
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        error: `Slug "${slug}" is already in use. Pick another or restore the archived one.`,
      };
    }
    console.error("[short-links] insert failed:", error);
    return { ok: false, error: "Could not create the link. Try again." };
  }

  await logAdminAction({
    action: "short_link_created",
    userEmail: session.email,
    metadata: { slug, destinationUrl, campaignSlug, platform },
  });

  revalidatePath("/admin/social/links");
  return { ok: true, slug };
}

export async function archiveShortLink(
  id: string
): Promise<ShortLinkActionResult> {
  const session = await requireAdminSession();
  if (!id || typeof id !== "string") {
    return { ok: false, error: "Missing link id." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("short_links")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null) // idempotent — don't re-stamp already-archived rows
    .select("slug")
    .maybeSingle<{ slug: string }>();

  if (error) {
    console.error("[short-links] archive failed:", error);
    return { ok: false, error: "Could not archive the link." };
  }
  if (!data) {
    return { ok: false, error: "Link not found or already archived." };
  }

  await logAdminAction({
    action: "short_link_archived",
    userEmail: session.email,
    metadata: { slug: data.slug },
  });

  revalidatePath("/admin/social/links");
  return { ok: true, slug: data.slug };
}

export async function restoreShortLink(
  id: string
): Promise<ShortLinkActionResult> {
  const session = await requireAdminSession();
  if (!id || typeof id !== "string") {
    return { ok: false, error: "Missing link id." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("short_links")
    .update({ archived_at: null })
    .eq("id", id)
    .not("archived_at", "is", null)
    .select("slug")
    .maybeSingle<{ slug: string }>();

  if (error) {
    console.error("[short-links] restore failed:", error);
    return { ok: false, error: "Could not restore the link." };
  }
  if (!data) {
    return { ok: false, error: "Link not found or already active." };
  }

  await logAdminAction({
    action: "short_link_restored",
    userEmail: session.email,
    metadata: { slug: data.slug },
  });

  revalidatePath("/admin/social/links");
  return { ok: true, slug: data.slug };
}
