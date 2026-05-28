"use server";

/**
 * Server actions for the per-post performance dashboard.
 *
 *   - spotlightFromPostAction → Phase 1f linkage. The SMM clicks
 *     "Spotlight on /now" inline on a logged post; we create a new
 *     spotlight tagged with social_post_id so the post and the
 *     spotlight are joined in the audit trail and visible from both
 *     directions (post detail → spotlight history → post detail).
 *
 * Keeping the post-side spotlight action here (rather than in
 * spotlight/actions.ts) so the performance dashboard owns its own
 * surface — keeps the inline-action revalidation list short and the
 * dependency graph linear.
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidCampaign } from "@/lib/campaigns";
import {
  SPOTLIGHT_DEFAULT_DAYS,
  SPOTLIGHT_MAX_DAYS,
  SPOTLIGHT_MIN_DAYS,
  createSpotlight,
} from "@/lib/now-spotlight";
import { getSupabaseAdmin } from "@/lib/supabase";

export type PerformanceActionResult =
  | { ok: true }
  | { ok: false; error: string };

interface PostLookupRow {
  id: string;
  campaign_slug: string | null;
  archived_at: string | null;
}

/**
 * Launch a /now spotlight from a registered social post. The post must
 * have a campaign_slug — without one we don't know where /now should
 * point. Supersedes any existing active spotlight (same semantics as
 * the standalone spotlight tool).
 */
export async function spotlightFromPostAction(input: {
  postId: string;
  durationDays?: number;
}): Promise<PerformanceActionResult> {
  const session = await requireAdminSession();

  const durationDays =
    input.durationDays === undefined
      ? SPOTLIGHT_DEFAULT_DAYS
      : Math.round(input.durationDays);
  if (durationDays < SPOTLIGHT_MIN_DAYS || durationDays > SPOTLIGHT_MAX_DAYS) {
    return {
      ok: false,
      error: `Duration must be between ${SPOTLIGHT_MIN_DAYS} and ${SPOTLIGHT_MAX_DAYS} days.`,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: post, error: lookupError } = await supabase
    .from("social_posts")
    .select("id, campaign_slug, archived_at")
    .eq("id", input.postId)
    .maybeSingle<PostLookupRow>();

  if (lookupError) {
    console.error("[performance] post lookup failed:", lookupError);
    return { ok: false, error: "Could not load the post." };
  }
  if (!post) return { ok: false, error: "Post not found." };
  if (post.archived_at) {
    return { ok: false, error: "Cannot spotlight an archived post." };
  }
  if (!post.campaign_slug) {
    return {
      ok: false,
      error:
        "This post has no campaign tagged — set a campaign on the post before spotlighting.",
    };
  }
  if (!isValidCampaign(post.campaign_slug)) {
    return { ok: false, error: "Post's campaign is unknown." };
  }

  const result = await createSpotlight({
    campaignSlug: post.campaign_slug,
    durationDays,
    byEmail: session.email,
    socialPostId: post.id,
  });
  if (!result.ok) return result;

  await logAdminAction({
    action: "spotlight_created_from_post",
    userEmail: session.email,
    targetId: post.id,
    metadata: {
      campaignSlug: post.campaign_slug,
      durationDays,
      expiresAt: result.expiresAt.toISOString(),
    },
  });
  // Both pages display this state — both need to re-render.
  revalidatePath("/admin/social/performance");
  revalidatePath("/admin/social/spotlight");
  revalidatePath("/admin/social");
  return { ok: true };
}
