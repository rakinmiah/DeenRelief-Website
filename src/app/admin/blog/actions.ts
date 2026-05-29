"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  requireBlogAccess,
  requireRoleAdmin,
} from "@/lib/admin-session";
import { logAdminAction, type AdminAction } from "@/lib/admin-audit";
import {
  createDraft,
  getDisplayNameForEmail,
  getPostById,
  updatePost,
  submitForReview,
  publishPost,
  unpublishPost,
  returnToDraft,
  archivePost,
  addWriter,
  removeWriter,
  type UpdatePostInput,
} from "@/lib/blog-admin";
import type { BlogFaq } from "@/lib/blog";

/**
 * Server actions for the blog CMS.
 *
 * Authorisation layering:
 *   - requireBlogAccess()  → admin OR writer (create/edit/submit).
 *   - requireRoleAdmin()   → admin only (publish, manage writers).
 *   - ownership guard       → a writer may only touch their OWN posts;
 *     admins may touch any. assertCanEdit() enforces this.
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

/**
 * Verify the signed-in user may edit this post. Admins: always. Writers:
 * only their own. Throws (which surfaces as an error) otherwise.
 */
async function assertCanEdit(postId: string) {
  const session = await requireBlogAccess();
  const post = await getPostById(postId);
  if (!post) throw new Error("Post not found.");
  if (
    session.role !== "admin" &&
    post.authorEmail.toLowerCase() !== session.email.toLowerCase()
  ) {
    throw new Error("You can only edit your own posts.");
  }
  return { session, post };
}

/** Revalidate the public surfaces affected by a post going live/down. */
function revalidatePublic(slug?: string) {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

// ─────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────

/** Create a blank draft and jump straight into the editor. */
export async function createDraftAction() {
  const session = await requireBlogAccess();
  const name = await getDisplayNameForEmail(session.email);
  const result = await createDraft({ email: session.email, name });
  if ("error" in result) {
    throw new Error(result.error);
  }
  await audit("blog_post_created", session.email, result.id, {});
  redirect(`/admin/blog/${result.id}`);
}

// ─────────────────────────────────────────────────────────────────
// Save / submit
// ─────────────────────────────────────────────────────────────────

export interface SavePostResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

export async function savePostAction(
  postId: string,
  input: UpdatePostInput
): Promise<SavePostResult> {
  const { session, post } = await assertCanEdit(postId);
  const result = await updatePost(postId, sanitizeInput(input));
  if (!result.ok) return { ok: false, error: result.error };

  await audit("blog_post_updated", session.email, postId, {
    title: input.title,
  });
  // If it's already live, the edit needs to reach the public site.
  if (post.status === "published") revalidatePublic(result.slug);
  return { ok: true, slug: result.slug };
}

/** Writer (or admin) submits a draft for review. Saves first. */
export async function submitForReviewAction(
  postId: string,
  input: UpdatePostInput
): Promise<SavePostResult> {
  const { session } = await assertCanEdit(postId);
  const saved = await updatePost(postId, sanitizeInput(input));
  if (!saved.ok) return { ok: false, error: saved.error };

  const result = await submitForReview(postId);
  if (!result.ok) return { ok: false, error: result.error };

  await audit("blog_post_submitted", session.email, postId, {});
  return { ok: true, slug: saved.slug };
}

// ─────────────────────────────────────────────────────────────────
// Admin-only workflow transitions
// ─────────────────────────────────────────────────────────────────

export async function publishAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRoleAdmin();
  const post = await getPostById(postId);
  if (!post) return { ok: false, error: "Post not found." };
  if (!post.title.trim() || !post.bodyHtml.trim()) {
    return { ok: false, error: "Add a title and some body content before publishing." };
  }

  const result = await publishPost(postId, session.email);
  if (!result.ok) return result;

  await audit("blog_post_published", session.email, postId, {
    slug: post.slug,
  });
  revalidatePublic(post.slug);
  return { ok: true };
}

export async function unpublishAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRoleAdmin();
  const post = await getPostById(postId);
  const result = await unpublishPost(postId);
  if (!result.ok) return result;
  await audit("blog_post_unpublished", session.email, postId, {});
  revalidatePublic(post?.slug);
  return { ok: true };
}

export async function returnToDraftAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRoleAdmin();
  const result = await returnToDraft(postId);
  if (!result.ok) return result;
  await audit("blog_post_returned_to_draft", session.email, postId, {});
  return { ok: true };
}

export async function archiveAction(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const { session, post } = await assertCanEdit(postId);
  const wasPublished = post.status === "published";
  const result = await archivePost(postId);
  if (!result.ok) return result;
  await audit("blog_post_archived", session.email, postId, {});
  if (wasPublished) revalidatePublic(post.slug);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Writer management (admin only)
// ─────────────────────────────────────────────────────────────────

export async function addWriterAction(
  email: string,
  displayName: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRoleAdmin();
  const result = await addWriter({
    email,
    displayName,
    createdByEmail: session.email,
  });
  if (!result.ok) return result;
  await audit("blog_writer_added", session.email, null, { email });
  return { ok: true };
}

export async function removeWriterAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRoleAdmin();
  const result = await removeWriter(email);
  if (!result.ok) return result;
  await audit("blog_writer_removed", session.email, null, { email });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/** Defensive trim/clamp of the editor payload before it hits the DB. */
function sanitizeInput(input: UpdatePostInput): UpdatePostInput {
  const faqs: BlogFaq[] = Array.isArray(input.faqs) ? input.faqs : [];
  return {
    title: (input.title ?? "").slice(0, 300),
    slug: (input.slug ?? "").slice(0, 120),
    description: (input.description ?? "").slice(0, 400),
    category: (input.category ?? "").slice(0, 60),
    heroImage: input.heroImage ?? null,
    bodyHtml: input.bodyHtml ?? "",
    faqs,
  };
}
