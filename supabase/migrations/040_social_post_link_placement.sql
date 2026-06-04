-- 040_social_post_link_placement.sql
--
-- Records WHERE the tracked link was distributed for a post — the attribution
-- path. This matters most on Instagram, where captions are NOT clickable, so
-- the tracked link lives in the bio (deenrelief.org/now), a Story link sticker,
-- or a comment-to-DM reply rather than the caption. Knowing the placement lets
-- the dashboard reason about attribution confidence per platform.
--
-- Additive + idempotent. Existing rows get NULL (unknown placement); inserts
-- that omit it are unaffected. The server insert is resilient to this column
-- being absent (42703 retry), so posting keeps working before this is applied.

alter table social_posts
  add column if not exists link_placement text;

comment on column social_posts.link_placement is
  'How the tracked link was distributed: post_text | first_comment | bio_link | story_sticker | dm | caption | none. NULL = unknown. Captures the attribution path, esp. for Instagram where captions are not clickable.';
