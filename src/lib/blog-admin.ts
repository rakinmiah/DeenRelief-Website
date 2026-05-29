import "server-only";
import sanitizeHtml from "sanitize-html";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { BlogFaq } from "@/lib/blog";

/**
 * Admin data layer for the blog CMS (migration 030).
 *
 * Counterpart to src/lib/blog.ts (which only ever exposes PUBLISHED
 * posts to the public site). This module sees every status and is only
 * imported from /admin/blog server components + server actions. The
 * `server-only` import makes a build fail loudly if it ever leaks into
 * a client bundle (it would expose the service-role client).
 *
 * Security model recap:
 *   - 'writer' can create + edit + submit their OWN drafts.
 *   - 'admin' can edit anything and is the ONLY role that publishes.
 *   - All HTML bodies are sanitised here on the way IN, so the public
 *     render can trust the stored HTML.
 */

export type BlogStatus = "draft" | "in_review" | "published" | "archived";

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  heroImage: string | null;
  bodyHtml: string;
  status: BlogStatus;
  authorEmail: string;
  authorName: string | null;
  reviewedByEmail: string | null;
  publishedAt: string | null;
  faqs: BlogFaq[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// HTML sanitisation
// ─────────────────────────────────────────────────────────────────

/**
 * Allow-list for the WYSIWYG body. TipTap (StarterKit + Link + Image)
 * only ever emits these tags; anything else (scripts, iframes, inline
 * event handlers, style attributes) is stripped. Run on every write.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote",
    "strong", "em", "s", "u", "code", "pre",
    "a", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Force safe rel on any link that opens a new tab.
  transformTags: {
    a: (tagName, attribs) => {
      const rel = attribs.target === "_blank"
        ? "noopener noreferrer"
        : attribs.rel;
      return { tagName, attribs: { ...attribs, ...(rel ? { rel } : {}) } };
    },
  },
};

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html ?? "", SANITIZE_OPTIONS);
}

// ─────────────────────────────────────────────────────────────────
// Slug helpers
// ─────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Produce a slug unique across blog_posts. Appends -2, -3, … on
 * collision. `excludeId` lets an edit keep its own slug.
 */
export async function uniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const root = slugify(base) || "post";
  let candidate = root;
  let n = 1;

  // Bounded loop — in practice resolves in 1–2 iterations.
  while (n < 200) {
    let query = supabase
      .from("blog_posts")
      .select("id")
      .ilike("slug", candidate)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[blog-admin] uniqueSlug lookup failed:", error.message);
      // Fail toward a timestamped suffix rather than risk a clash.
      return `${root}-${n}`;
    }
    if (!data) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${n}`;
}

// ─────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function mapRow(row: Row): AdminBlogPost {
  return {
    id: row.id as string,
    slug: (row.slug as string) ?? "",
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    category: (row.category as string) ?? "",
    heroImage: (row.hero_image as string) ?? null,
    bodyHtml: (row.body_html as string) ?? "",
    status: (row.status as BlogStatus) ?? "draft",
    authorEmail: (row.author_email as string) ?? "",
    authorName: (row.author_name as string) ?? null,
    reviewedByEmail: (row.reviewed_by_email as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    faqs: Array.isArray(row.faqs) ? (row.faqs as BlogFaq[]) : [],
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

const ALL_COLUMNS =
  "id, slug, title, description, category, hero_image, body_html, status, author_email, author_name, reviewed_by_email, published_at, faqs, created_at, updated_at";

// ─────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────

/**
 * List posts for the admin dashboard.
 *   - omit `authorEmail` → all posts (admin view).
 *   - pass `authorEmail` → only that writer's posts (writer view).
 * Ordered most-recently-updated first.
 */
export async function listPosts(opts: {
  authorEmail?: string;
} = {}): Promise<AdminBlogPost[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("blog_posts")
    .select(ALL_COLUMNS)
    .order("updated_at", { ascending: false });

  if (opts.authorEmail) {
    query = query.ilike("author_email", opts.authorEmail);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[blog-admin] listPosts failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getPostById(id: string): Promise<AdminBlogPost | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(ALL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[blog-admin] getPostById(${id}) failed:`, error.message);
    return null;
  }
  return data ? mapRow(data) : null;
}

// ─────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────

/** Create a blank draft owned by the given author. Returns its id. */
export async function createDraft(author: {
  email: string;
  name?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const placeholderSlug = await uniqueSlug("untitled");
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug: placeholderSlug,
      title: "",
      author_email: author.email.toLowerCase().trim(),
      author_name: author.name ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[blog-admin] createDraft failed:", error?.message);
    return { error: "Couldn't create the draft." };
  }
  return { id: data.id as string };
}

export interface UpdatePostInput {
  title: string;
  slug: string;
  description: string;
  category: string;
  heroImage: string | null;
  bodyHtml: string;
  faqs: BlogFaq[];
}

/**
 * Update a post's editable content. Sanitises the body, normalises the
 * slug (kept unique), and trims the FAQ list. Does NOT change status —
 * use the workflow transitions below for that.
 */
export async function updatePost(
  id: string,
  input: UpdatePostInput
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();

  const slug = await uniqueSlug(input.slug || input.title || "post", id);
  const faqs = (input.faqs ?? [])
    .map((f) => ({
      question: (f.question ?? "").trim(),
      answer: (f.answer ?? "").trim(),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 10);

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title: input.title.trim(),
      slug,
      description: input.description.trim(),
      category: input.category.trim(),
      hero_image: input.heroImage?.trim() || null,
      body_html: sanitizeBody(input.bodyHtml),
      faqs,
    })
    .eq("id", id);

  if (error) {
    console.error(`[blog-admin] updatePost(${id}) failed:`, error.message);
    return { ok: false, error: "Couldn't save changes." };
  }
  return { ok: true, slug };
}

/** Draft → in_review. Author submits for an admin to publish. */
export async function submitForReview(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  return setStatus(id, "in_review");
}

/** Send an in-review post back to the author as a draft. */
export async function returnToDraft(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  return setStatus(id, "draft");
}

/**
 * Publish a post (admin only — enforced at the action layer). Sets
 * published_at the FIRST time it goes live and stamps the reviewer.
 */
export async function publishPost(
  id: string,
  reviewerEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const existing = await getPostById(id);
  if (!existing) return { ok: false, error: "Post not found." };

  const update: Row = {
    status: "published",
    reviewed_by_email: reviewerEmail.toLowerCase().trim(),
  };
  // Preserve the original publish date on re-publish; only set it the
  // first time so the public "datePublished" doesn't jump around.
  if (!existing.publishedAt) {
    update.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error(`[blog-admin] publishPost(${id}) failed:`, error.message);
    return { ok: false, error: "Couldn't publish." };
  }
  return { ok: true };
}

/** Pull a published post off the public site (back to draft). */
export async function unpublishPost(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  return setStatus(id, "draft");
}

/** Soft-remove a post (keeps the row for history). */
export async function archivePost(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  return setStatus(id, "archived");
}

async function setStatus(
  id: string,
  status: BlogStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("blog_posts")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error(`[blog-admin] setStatus(${id}, ${status}) failed:`, error.message);
    return { ok: false, error: "Couldn't update status." };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Writer management (admin only — enforced at the action layer)
// ─────────────────────────────────────────────────────────────────

export interface WriterRow {
  email: string;
  displayName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function listWriters(): Promise<WriterRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("email, display_name, created_at, last_login_at")
    .eq("role", "writer")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[blog-admin] listWriters failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    email: r.email as string,
    displayName: (r.display_name as string) ?? null,
    createdAt: (r.created_at as string) ?? "",
    lastLoginAt: (r.last_login_at as string) ?? null,
  }));
}

/**
 * Add a writer. Inserts an admin_users row with role='writer'. The
 * writer then signs in with this email + the shared
 * WRITER_LOGIN_PASSPHRASE.
 */
export async function addWriter(input: {
  email: string;
  displayName: string;
  createdByEmail: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@")) {
    return { ok: false, error: "That doesn't look like a valid email." };
  }
  const supabase = getSupabaseAdmin();

  // Reject if the email already exists in any role — we don't want to
  // silently downgrade an admin to a writer.
  const { data: existing } = await supabase
    .from("admin_users")
    .select("role")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `${email} already has the '${existing.role}' role.`,
    };
  }

  const { error } = await supabase.from("admin_users").insert({
    email,
    role: "writer",
    display_name: input.displayName.trim() || null,
    created_by_email: input.createdByEmail.toLowerCase().trim(),
  });
  if (error) {
    console.error("[blog-admin] addWriter failed:", error.message);
    return { ok: false, error: "Couldn't add the writer." };
  }
  return { ok: true };
}

/**
 * Look up the display name stored in admin_users for an email (any
 * role). Used to stamp the byline on a new draft. Null when unset.
 */
export async function getDisplayNameForEmail(
  email: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("admin_users")
    .select("display_name")
    .ilike("email", email.toLowerCase().trim())
    .maybeSingle();
  return (data?.display_name as string) ?? null;
}

/** Revoke a writer's access. Only removes role='writer' rows. */
export async function removeWriter(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("admin_users")
    .delete()
    .ilike("email", email.toLowerCase().trim())
    .eq("role", "writer");
  if (error) {
    console.error("[blog-admin] removeWriter failed:", error.message);
    return { ok: false, error: "Couldn't remove the writer." };
  }
  return { ok: true };
}
