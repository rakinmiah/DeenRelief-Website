"use server";

/**
 * Server actions for the social posts registry.
 *
 *   - logSocialPost     — SMM records a post she's published
 *   - markDeckAsPosted  — deck builder records a finished deck as a post,
 *                         carrying its provenance (event + design recipe)
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

/** One slide's DESIGN provenance — which template sat in which role. No copy
 *  or imagery, just the recipe the outcome-learning loop ranks. */
export type DeckRecipeEntry = { role: string; templateId: string };

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
  /** The news report this post was built from (provenance). */
  eventId?: string;
  /** Per-slide design recipe (provenance). */
  deckRecipe?: DeckRecipeEntry[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres "undefined_column" — thrown when event_id/deck_recipe don't exist
 *  yet (migration 037 not applied). We retry the insert without them. */
const PG_UNDEFINED_COLUMN = "42703";

/** Bound + shape-check a client-supplied recipe before it touches the DB. */
function sanitizeDeckRecipe(recipe: unknown): DeckRecipeEntry[] | null {
  if (!Array.isArray(recipe)) return null;
  const clean = recipe
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      role: String(e.role ?? "").slice(0, 40),
      templateId: String(e.templateId ?? "").slice(0, 80),
    }))
    .filter((e) => e.role && e.templateId)
    .slice(0, 20);
  return clean.length ? clean : null;
}

/**
 * Insert a social_posts row including provenance (event_id + deck_recipe).
 * If those columns don't exist yet (migration 037 unapplied), Postgres errors
 * 42703 and we retry once with the legacy column set — so posting NEVER breaks
 * before the migration is run.
 */
async function insertSocialPost(
  base: Record<string, unknown>,
  provenance: { event_id: string | null; deck_recipe: DeckRecipeEntry[] | null }
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const hasProvenance =
    provenance.event_id != null || provenance.deck_recipe != null;

  let res = await supabase
    .from("social_posts")
    .insert(hasProvenance ? { ...base, ...provenance } : base)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (
    res.error &&
    hasProvenance &&
    (res.error as { code?: string }).code === PG_UNDEFINED_COLUMN
  ) {
    console.warn(
      "[social-posts] provenance columns missing (apply migration 037); inserting without them"
    );
    res = await supabase
      .from("social_posts")
      .insert(base)
      .select("id")
      .maybeSingle<{ id: string }>();
  }

  if (res.error || !res.data) {
    console.error("[social-posts] insert failed:", res.error);
    return { error: "Could not log the post." };
  }
  return { id: res.data.id };
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

  const eventId =
    input.eventId && UUID_RE.test(input.eventId) ? input.eventId : null;
  const deckRecipe = sanitizeDeckRecipe(input.deckRecipe);

  const result = await insertSocialPost(
    {
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
    },
    { event_id: eventId, deck_recipe: deckRecipe }
  );
  if ("error" in result) return { ok: false, error: result.error };

  await logAdminAction({
    action: "social_post_logged",
    userEmail: session.email,
    targetId: result.id,
    metadata: { platform, campaignSlug, shortLinkId, eventId },
  });

  revalidatePath("/admin/social/performance");
  revalidatePath("/admin/social/posts");
  return { ok: true, postId: result.id };
}

export interface MarkDeckAsPostedInput {
  platform: string;
  eventId?: string;
  deckRecipe?: DeckRecipeEntry[];
  externalUrl?: string;
  shortLinkId?: string;
  campaignSlug?: string;
  title?: string;
  publishedAtIso?: string;
}

/**
 * Record a finished deck as a published post, carrying its provenance — the
 * news report (eventId) it was built from and the per-slide design recipe
 * (deckRecipe). This is what closes the learning loop: once the SMM attaches
 * the short link she posted with, real clicks + donations flow back against
 * these exact templates + topic. Mirrors logSocialPost but tagged distinctly
 * in the audit log so deck-originated posts are identifiable.
 */
export async function markDeckAsPosted(
  input: MarkDeckAsPostedInput
): Promise<SocialPostActionResult> {
  const session = await requireAdminSession();

  if (!input.platform || !isSocialPlatform(input.platform)) {
    return { ok: false, error: "Unknown platform." };
  }
  const platform = input.platform;

  const externalUrl = input.externalUrl?.trim();
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
    return { ok: false, error: "Post URL must start with http:// or https://." };
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
  const eventId =
    input.eventId && UUID_RE.test(input.eventId) ? input.eventId : null;
  const deckRecipe = sanitizeDeckRecipe(input.deckRecipe);
  const title = input.title?.trim() || null;

  const publishedAt = input.publishedAtIso
    ? new Date(input.publishedAtIso)
    : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    return { ok: false, error: "Invalid published-at date." };
  }

  const result = await insertSocialPost(
    {
      platform,
      external_url: externalUrl || null,
      title,
      short_link_id: shortLinkId,
      campaign_slug: campaignSlug,
      published_at: publishedAt.toISOString(),
      created_by_email: session.email,
    },
    { event_id: eventId, deck_recipe: deckRecipe }
  );
  if ("error" in result) return { ok: false, error: result.error };

  await logAdminAction({
    action: "deck_marked_as_posted",
    userEmail: session.email,
    targetId: result.id,
    metadata: {
      platform,
      eventId,
      shortLinkId,
      slides: deckRecipe?.length ?? 0,
    },
  });

  revalidatePath("/admin/social/performance");
  revalidatePath("/admin/social/posts");
  return { ok: true, postId: result.id };
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
