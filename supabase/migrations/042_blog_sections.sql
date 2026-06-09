-- 042_blog_sections.sql
-- Re-home existing blog posts into the three fixed sections.
--
-- The blog's free-text `category` is now a fixed set of SECTIONS:
--   'Islamic Knowledge', 'Who We Are', 'Latest'
-- (each gets its own public page at /blog/<slug>). Every existing post
-- used granular tags like 'Zakat' / 'Sadaqah' / 'Islamic Knowledge' —
-- map all of them into 'Islamic Knowledge' (the educational section).
--
-- Idempotent: only rows whose category isn't already one of the three
-- are touched, so re-running is a no-op. The app also resolves any stray
-- value to a section at read time (sectionForCategory), so the public
-- site is correct even if this migration hasn't run yet — but running it
-- keeps the stored data clean and the admin dropdown accurate.

update blog_posts
set category = 'Islamic Knowledge',
    updated_at = now()
where coalesce(category, '') not in ('Islamic Knowledge', 'Who We Are', 'Latest');
