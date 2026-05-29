-- Migration 030: blog_posts table + 'writer' role for the blog CMS.
--
-- Moves the blog from file-based MDX (src/content/blog/*.mdx, committed to
-- git and rendered statically) to a Supabase-backed CMS so non-technical
-- writers can author posts in-browser through /admin/blog.
--
-- Editorial workflow (status column):
--
--   draft      → being written. Visible only to its author + admins.
--   in_review  → author submitted; waiting for an admin to publish.
--   published  → live on the public site. published_at is set.
--   archived   → soft-removed from the public site, kept for history.
--
-- Roles:
--   The existing two-role model (admin / social — see migration 019) gains
--   a third role: 'writer'. Writers can create + edit their own drafts and
--   submit them for review, but CANNOT publish. Only 'admin' publishes.
--   'social' users have no blog access.
--
-- Body storage:
--   body_html holds sanitised HTML produced by the TipTap WYSIWYG editor
--   (sanitised server-side in src/lib/blog-admin.ts before every write).
--   The public render dangerouslySetInnerHTML's it inside a .dr-prose
--   container styled to match the old MDX component look.
--
-- Idempotent: safe to run more than once.

-- ── 1. Extend the admin_users role check to allow 'writer'. ──
-- The check constraint from migration 019 only permits ('admin','social').
-- Drop + recreate it with the new value. Postgres names CHECK constraints
-- automatically as <table>_<column>_check, so we target that name.
alter table admin_users
  drop constraint if exists admin_users_role_check;

alter table admin_users
  add constraint admin_users_role_check
  check (role in ('admin', 'social', 'writer'));

comment on column admin_users.role is
  'One of ''admin'' (full DR Admin + publishes blog posts), ''social'' (social/marketing tools only), or ''writer'' (authors blog drafts in /admin/blog, cannot publish).';

-- ── 2. blog_posts table. ──
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  -- URL slug, e.g. /blog/<slug>. Unique, lowercase, hyphenated.
  -- Generated from the title on first save; editable by admins.
  slug text not null,
  title text not null default '',
  -- Meta description + listing-card excerpt (≤ ~160 chars recommended).
  description text not null default '',
  -- Free-text category pill (e.g. "Zakat", "Sadaqah"). Matches the old
  -- frontmatter `category` field so related-posts logic keeps working.
  category text not null default '',
  -- Hero/OG image. A public URL (dr-media bucket) or a /images/* path.
  hero_image text,
  -- Sanitised HTML body from the WYSIWYG editor.
  body_html text not null default '',
  -- Editorial state. See the workflow note at the top of this file.
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'archived')),
  -- Authorship. author_email is the email the writer signed in with
  -- (attribution survives the shared writer passphrase); author_name is
  -- the human display name shown as the byline.
  author_email text not null,
  author_name text,
  -- Which admin published it (audit trail). Null until first published.
  reviewed_by_email text,
  -- When it went live. Drives the public "datePublished" + sort order.
  -- Null while draft/in_review.
  published_at timestamptz,
  -- Per-post FAQ entries for FAQPage rich results — the same feature the
  -- old src/lib/blog-faqs.ts file provided, now author-editable. Shape:
  -- [{ "question": "...", "answer": "..." }]
  faqs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug uniqueness, case-insensitive (matches how URLs resolve).
create unique index if not exists idx_blog_posts_slug_lower
  on blog_posts (lower(slug));

-- The public listing queries published posts newest-first; the admin
-- list filters by status. Index both access paths.
create index if not exists idx_blog_posts_status_published_at
  on blog_posts (status, published_at desc);

create index if not exists idx_blog_posts_author
  on blog_posts (author_email);

comment on table blog_posts is
  'Blog CMS posts. Authored in /admin/blog by ''writer'' + ''admin'' roles, published by ''admin''. Public site reads status=''published'' rows; everything else is editorial-only.';

-- ── 3. updated_at maintenance trigger. ──
create or replace function set_blog_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_blog_posts_updated_at();
