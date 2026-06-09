/**
 * Blog sections — the fixed top-level structure for the blog.
 *
 * The blog is split into three sections (replacing the old free-text
 * `category` field). One section per post; the stored `category` value
 * holds the section LABEL. Each section gets its own public page at
 * /blog/<slug> and a tab on the /blog overview.
 *
 * Pure data + helpers, no imports — safe in server components, the
 * sitemap, AND the client-side admin editor.
 */

export type BlogSectionSlug = "islamic-knowledge" | "who-we-are" | "latest";

export interface BlogSection {
  /** URL slug — /blog/<slug>. Also a reserved post slug. */
  slug: BlogSectionSlug;
  /** Canonical category value stored on the post + shown as the pill. */
  label: string;
  /** Section page H1. */
  title: string;
  /** Section page subtitle + meta description. */
  blurb: string;
}

export const BLOG_SECTIONS: BlogSection[] = [
  {
    slug: "islamic-knowledge",
    label: "Islamic Knowledge",
    title: "Islamic Knowledge",
    blurb:
      "Practical guides on Zakat, Sadaqah and Islamic giving — so you can give with knowledge and confidence.",
  },
  {
    slug: "who-we-are",
    label: "Who We Are",
    title: "Who We Are",
    blurb:
      "Updates from our programmes and the families your generosity reaches on the ground.",
  },
  {
    slug: "latest",
    label: "Latest",
    title: "Latest",
    blurb:
      "Fresh reflections and educational reads from the Deen Relief team — new every week.",
  },
];

/** Posts whose stored category doesn't match a section fall back here. */
export const DEFAULT_SECTION: BlogSection = BLOG_SECTIONS[0]!;

export const BLOG_SECTION_SLUGS: BlogSectionSlug[] = BLOG_SECTIONS.map((s) => s.slug);

/** The canonical labels, in display order — for the admin dropdown. */
export const BLOG_SECTION_LABELS: string[] = BLOG_SECTIONS.map((s) => s.label);

/** Section for a /blog/<slug> page, or undefined when the slug is a post. */
export function getSectionBySlug(slug: string): BlogSection | undefined {
  return BLOG_SECTIONS.find((s) => s.slug === slug);
}

/**
 * Map a stored `category` value → its section. Canonical section labels
 * match (case-insensitive); anything else — legacy "Zakat"/"Sadaqah" or a
 * stray value — resolves to the default section (Islamic Knowledge). This
 * keeps the public site correct even before the data migration runs.
 */
export function sectionForCategory(category: string | null | undefined): BlogSection {
  const c = (category ?? "").trim().toLowerCase();
  return BLOG_SECTIONS.find((s) => s.label.toLowerCase() === c) ?? DEFAULT_SECTION;
}

/** Normalise any input to a canonical section label (for saving). */
export function normaliseCategoryToSection(category: string | null | undefined): string {
  return sectionForCategory(category).label;
}

/** A section slug can't double as a post slug (it owns /blog/<slug>). */
export function isReservedBlogSlug(slug: string): boolean {
  return (BLOG_SECTION_SLUGS as string[]).includes(slug.trim().toLowerCase());
}
