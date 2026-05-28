-- Migration 026: DR media library — uploadable, taggable image bank that
-- Claude can draw from when drafting carousel slides.
--
-- Phase 4e of the Social Operations Platform. SMM uploads DR's photo
-- inventory once (field photos, event coverage, programme imagery),
-- tags it (campaign / country / event_type / tone / use_cases), and
-- the launch-packet generator queries this table for relevant
-- candidates per event. Claude picks which image suits each slide
-- by metadata; the slide renderer composites the photo as a full-
-- bleed background under the dark-green gradient + typography.
--
-- Storage: actual image bytes live in the 'dr-media' bucket
-- in Supabase Storage (created manually in the dashboard — see the
-- README block at the bottom of this file). This table is metadata
-- only; storage_path joins the two together.
--
-- Idempotent.

create table if not exists media_library (
  id uuid primary key default gen_random_uuid(),
  -- ─── Storage join ───────────────────────────────────────────────
  -- Path WITHIN the bucket — e.g. 'palestine/2024-10-aid-distribution.jpg'.
  -- The full URL is constructed in code (see src/lib/media-library.ts)
  -- because the project URL is environment-specific.
  storage_path text not null unique,
  -- ─── Editorial metadata ────────────────────────────────────────
  caption text,
  tags text[] not null default '{}',
  -- ─── Targeting metadata ────────────────────────────────────────
  -- Which campaigns this image is appropriate for. NULL/empty array
  -- means "any campaign". Free-text array (validated in code against
  -- CAMPAIGNS) rather than FK because campaigns live in code, not DB.
  campaign_slugs text[] not null default '{}',
  -- ISO 3166-1 alpha-2 country code (BD, PK, SY, PS, GB, …). NULL =
  -- not geographically specific.
  country_iso text,
  -- Event types this image suits (earthquake, flood, conflict,
  -- daily-operations, ramadan, qurbani, …). Aligned with coverage_map.
  event_types text[] not null default '{}',
  -- Tone keyword — single value, used for "mood" filtering. Values:
  -- 'dignified' | 'emergency' | 'hopeful' | 'gratitude' | 'festival' |
  -- 'documentary'.
  tone text,
  -- Use-case hints driving slide selection:
  -- 'emergency-hero' | 'response-illustration' | 'tier-illustration' |
  -- 'gratitude' | 'festival' | 'team-coverage' | 'beneficiary-portrait'.
  use_cases text[] not null default '{}',
  -- ─── Safeguarding flags ────────────────────────────────────────
  -- Identifiable people in the shot (used by the auto-selector to
  -- avoid splashing the same face across every campaign).
  people_visible boolean not null default false,
  -- Identifiable minors — extra-strict use rules. Defaults to NOT
  -- including these in auto-selection unless explicitly tagged
  -- 'consent-on-file' in use_cases.
  identifiable_minors boolean not null default false,
  -- ─── Provenance ────────────────────────────────────────────────
  taken_at timestamptz,
  uploaded_by_email text,
  uploaded_at timestamptz not null default now(),
  archived_at timestamptz,
  -- ─── Technical ─────────────────────────────────────────────────
  width int,
  height int,
  bytes int,
  mime_type text,
  -- A representative single colour from the image (#rrggbb), used as
  -- the loading placeholder + as a fallback gradient stop when an
  -- image fails to load on the slide.
  dominant_color text,
  -- ─── AI tagging audit ──────────────────────────────────────────
  -- When Claude Vision generated initial tag suggestions, the
  -- model + token usage land here for cost tracking + dedupe.
  ai_tagged_at timestamptz,
  ai_tag_model text,
  ai_tag_input_tokens int,
  ai_tag_output_tokens int
);

create index if not exists idx_media_library_campaign
  on media_library using gin (campaign_slugs)
  where archived_at is null;

create index if not exists idx_media_library_event_types
  on media_library using gin (event_types)
  where archived_at is null;

create index if not exists idx_media_library_country
  on media_library (country_iso)
  where archived_at is null and country_iso is not null;

create index if not exists idx_media_library_uploaded_at
  on media_library (uploaded_at desc)
  where archived_at is null;

-- Service role does all reads/writes — no anon access. Defence-in-
-- depth even though we don't expose this table to the anon key.
alter table media_library enable row level security;

comment on table media_library is
  'Sorted DR photo + media inventory. SMM uploads + tags; the launch packet generator queries by event metadata (country, event_type, campaigns) to pick imagery for carousel slides. Image bytes live in the dr-media Supabase Storage bucket; storage_path joins the two.';

-- ─────────────────────────────────────────────────────────────────
-- README — manual one-time setup steps (run AFTER applying this SQL):
--
--   1. Go to Supabase Dashboard → Storage → Create new bucket
--   2. Name: dr-media
--   3. Public: YES (so the slide renderer can fetch images by URL
--      without service-role auth — Claude vision/sat. needs URL access)
--   4. File size limit: 10 MB
--   5. Allowed MIME types: image/jpeg, image/png, image/webp
--
--   Bucket-level RLS: since the bucket is public for read, no policies
--   are required for the slide renderer. Uploads go through admin
--   server actions using the service-role key, which bypasses RLS.
-- ─────────────────────────────────────────────────────────────────
