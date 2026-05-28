"use server";

/**
 * Server actions for the social posts registry.
 *
 *   - logSocialPost     — SMM records a post she's published
 *   - archiveSocialPost — soft delete
 *   - restoreSocialPost — undo archive
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidCampaign } from "@/lib/campaigns";
import { isSocialPlatform } from "@/lib/social-performance";
import { getSupabaseAdmin } from "@/lib/supabase";

export type SocialPostActionResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export interface LogSocialPostInput {
  platform: string;
  externalUrl?: string;
  externalPostId?: string;
  title?: string;
  caption?: string;
  shortLinkId?: string;
  campaignSlug?: string;
  captionKeyword?: string;
  publishedAtIso?: string;
}

export async function logSocialPost(
  input: LogSocialPostInput
): Promise<SocialPostActionResult> {
  const session = await requireAdminSession();

  // Validation
  if (!input.platform || !isSocialPlatform(input.platform)) {
    return { ok: false, error: "Unknown platform." };
  }
  const platform = input.platform;

  const externalUrl = input.externalUrl?.trim();
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
    return {
      ok: false,
      error: "External URL must start with http:// or https://.",
    };
  }

  let campaignSlug: string | null = null;
  if (input.campaignSlug && input.campaignSlug !== "") {
    if (!isValidCampaign(input.campaignSlug)) {
      return { ok: false, error: "Unknown campaign." };
    }
    campaignSlug = input.campaignSlug;
  }

  const shortLinkId =
    input.shortLinkId && input.shortLinkId !== "" ? input.shortLinkId : null;

  const caption = input.caption?.trim() || null;
  // Auto-title from the first line of the caption if no explicit title given.
  let title = input.title?.trim() || null;
  if (!title && caption) {
    const firstLine = caption.split("\n")[0]?.trim() ?? "";
    title = firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
  }

  const publishedAt = input.publishedAtIso
    ? new Date(input.publishedAtIso)
    : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    return { ok: false, error: "Invalid published-at date." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      platform,
      external_url: externalUrl || null,
      external_post_id: input.externalPostId?.trim() || null,
      title,
      caption,
      short_link_id: shortLinkId,
      campaign_slug: campaignSlug,
      caption_keyword: input.captionKeyword?.trim() || null,
      published_at: publishedAt.toISOString(),
      created_by_email: session.email,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    console.error("[social-posts] insert failed:", error);
    return { ok: false, error: "Could not log the post." };
  }

  await logAdminAction({
    action: "social_post_logged",
    userEmail: session.email,
    targetId: data.id,
    metadata: { platform, campaignSlug, shortLinkId },
  });

  revalidatePath("/admin/social/performance");
  revalidatePath("/admin/social/posts");
  return { ok: true, postId: data.id };
}

export async function archiveSocialPost(
  id: string
): Promise<SocialPostActionResult> {
  const session = await requireAdminSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_posts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) {
    console.error("[social-posts] archive failed:", error);
    return { ok: false, error: "Could not archive the post." };
  }
  if (!data) return { ok: false, error: "Post not found or already archived." };

  await logAdminAction({
    action: "social_post_archived",
    userEmail: session.email,
    targetId: id,
  });
  revalidatePath("/admin/social/performance");
  return { ok: true, postId: id };
}

export async function restoreSocialPost(
  id: string
): Promise<SocialPostActionResult> {
  const session = await requireAdminSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_posts")
    .update({ archived_at: null })
    .eq("id", id)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) {
    console.error("[social-posts] restore failed:", error);
    return { ok: false, error: "Could not restore the post." };
  }
  if (!data) return { ok: false, error: "Post not found or already active." };

  await logAdminAction({
    action: "social_post_restored",
    userEmail: session.email,
    targetId: id,
  });
  revalidatePath("/admin/social/performance");
  return { ok: true, postId: id };
}
