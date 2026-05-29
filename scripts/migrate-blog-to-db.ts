/**
 * One-time migration: import the file-based MDX blog posts
 * (src/content/blog/*.mdx) into the Supabase `blog_posts` table created
 * by migration 030.
 *
 * Run AFTER applying migration 030 in the Supabase SQL editor:
 *
 *   node --env-file=.env.local --import tsx scripts/migrate-blog-to-db.ts
 *
 * Idempotent: matches existing rows by slug and updates them, so it's
 * safe to re-run (e.g. after tweaking an MDX file). Every imported post
 * lands as status='published' with its original frontmatter date, bylined
 * to the organisation. FAQs are carried over from src/lib/blog-faqs.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@supabase/supabase-js";
import { blogFaqs } from "../src/lib/blog-faqs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, "..", "src", "content", "blog");

const DEFAULT_AUTHOR_EMAIL = "info@deenrelief.org";
const DEFAULT_AUTHOR_NAME = "Deen Relief";

// Same allow-list the live editor enforces (src/lib/blog-admin.ts).
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
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(
      `Missing ${name}. Run with: node --env-file=.env.local --import tsx scripts/migrate-blog-to-db.ts`
    );
    process.exit(1);
  }
  return v;
}

async function main() {
  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${files.length} MDX posts to migrate.\n`);

  let created = 0;
  let updated = 0;

  for (const filename of files) {
    const slug = filename.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf-8");
    const { data, content } = matter(raw);

    const bodyHtml = sanitizeHtml(await marked.parse(content), SANITIZE_OPTIONS);
    const faqs = blogFaqs[slug] ?? [];
    const dateStr: string = data.date ?? "";
    const publishedAt = dateStr ? `${dateStr}T09:00:00Z` : new Date().toISOString();

    const row = {
      slug,
      title: data.title ?? "",
      description: data.description ?? "",
      category: data.category ?? "",
      hero_image: data.image ?? null,
      body_html: bodyHtml,
      status: "published" as const,
      author_email: DEFAULT_AUTHOR_EMAIL,
      author_name: DEFAULT_AUTHOR_NAME,
      reviewed_by_email: DEFAULT_AUTHOR_EMAIL,
      published_at: publishedAt,
      faqs,
    };

    // Find an existing row by slug (case-insensitive).
    const { data: existing, error: lookupErr } = await supabase
      .from("blog_posts")
      .select("id")
      .ilike("slug", slug)
      .maybeSingle();

    if (lookupErr) {
      console.error(`  ✗ ${slug}: lookup failed — ${lookupErr.message}`);
      continue;
    }

    if (existing) {
      const { error } = await supabase
        .from("blog_posts")
        .update(row)
        .eq("id", existing.id);
      if (error) {
        console.error(`  ✗ ${slug}: update failed — ${error.message}`);
      } else {
        updated += 1;
        console.log(`  ↻ updated  ${slug}`);
      }
    } else {
      const { error } = await supabase.from("blog_posts").insert(row);
      if (error) {
        console.error(`  ✗ ${slug}: insert failed — ${error.message}`);
      } else {
        created += 1;
        console.log(`  ✓ created  ${slug}`);
      }
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
