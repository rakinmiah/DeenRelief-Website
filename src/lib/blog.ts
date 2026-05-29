import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Public blog data layer.
 *
 * Reads PUBLISHED posts from the `blog_posts` table (migration 030).
 * Drafts / in-review / archived posts are never returned here — they're
 * editorial-only and live behind /admin/blog.
 *
 * History: the blog used to be file-based MDX in src/content/blog/*.mdx.
 * It now reads from Supabase so non-technical writers can author posts
 * through the CMS at /admin/blog. The shape returned here is kept
 * backward-compatible with the old MDX frontmatter fields (slug, title,
 * description, date, category, image) so the public pages barely changed
 * — `date` is the published date (YYYY-MM-DD) and `bodyHtml` replaces
 * the old compiled-MDX `content`.
 *
 * We read with the service-role client (server-only) rather than the
 * anon client so the public pages don't depend on RLS policies being
 * configured for blog_posts. These functions are only ever called from
 * server components / sitemap generation — never shipped to the browser.
 */

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  /** Published date as YYYY-MM-DD (kept for the existing formatDate()). */
  date: string;
  category: string;
  image: string;
  authorName: string;
}

export interface BlogPost extends BlogPostMeta {
  bodyHtml: string;
  faqs: BlogFaq[];
}

/** Turn a timestamptz / ISO string into a date-only YYYY-MM-DD string. */
function toDateOnly(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function normaliseFaqs(raw: unknown): BlogFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (f): f is BlogFaq =>
        !!f &&
        typeof (f as BlogFaq).question === "string" &&
        typeof (f as BlogFaq).answer === "string"
    )
    .map((f) => ({ question: f.question, answer: f.answer }));
}

/** All published posts, newest first. Metadata only (no body). */
export async function getAllPosts(): Promise<BlogPostMeta[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, description, category, hero_image, author_name, published_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[blog] getAllPosts failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    title: row.title ?? "",
    description: row.description ?? "",
    date: toDateOnly(row.published_at),
    category: row.category ?? "",
    image: row.hero_image ?? "",
    authorName: row.author_name ?? "",
  }));
}

/** A single published post by slug, including its HTML body + FAQs. */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, description, category, hero_image, body_html, author_name, published_at, faqs"
    )
    .eq("status", "published")
    .ilike("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`[blog] getPostBySlug(${slug}) failed:`, error.message);
    return null;
  }
  if (!data) return null;

  return {
    slug: data.slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: toDateOnly(data.published_at),
    category: data.category ?? "",
    image: data.hero_image ?? "",
    authorName: data.author_name ?? "",
    bodyHtml: data.body_html ?? "",
    faqs: normaliseFaqs(data.faqs),
  };
}

/** Slugs of all published posts — for generateStaticParams + sitemap. */
export async function getAllSlugs(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  if (error) {
    console.error("[blog] getAllSlugs failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.slug);
}
