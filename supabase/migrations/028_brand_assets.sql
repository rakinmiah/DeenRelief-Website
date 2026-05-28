-- Migration 028: brand_assets table — uploadable, deterministically-
-- named logo variants used by the slide + social-image renderers.
--
-- Separate from media_library because:
--   • Logos don't need Claude Vision tagging (no caption, no tags)
--   • Looked up by named variant ('logo-on-light' / 'logo-on-dark'),
--     not by AI selection
--   • Different storage path conventions (brand/<variant>-<uuid>.<ext>)
--
-- Storage: image bytes live in the same dr-media Supabase bucket but
-- under a brand/ prefix. The bucket is already public.
--
-- Idempotent.

create table if not exists brand_assets (
  id uuid primary key default gen_random_uuid(),
  -- The named role this asset fills. Renderer queries by variant.
  -- Recognised values (validated in code, not DB, so we can add
  -- new variants without a schema change):
  --   'logo-on-light' — variant used against cream/light backgrounds
  --                      (typically a forest-green logo)
  --   'logo-on-dark'  — variant used against green/dark backgrounds
  --                      (typically a white/cream logo)
  --   'logo-amber'    — optional accent variant
  variant text not null,
  -- Storage path within the dr-media bucket. Convention:
  --   brand/<variant>-<uuid>.<ext>
  storage_path text not null unique,
  -- Original filename the SMM uploaded — useful for trace-back when
  -- there are multiple iterations of the same variant.
  original_filename text,
  -- MIME type — image/png, image/svg+xml, image/jpeg, image/webp.
  -- SVG + transparent PNG are strongly preferred for chip use.
  mime_type text not null,
  -- Intrinsic dimensions where measurable. SVGs may leave these null.
  width int,
  height int,
  bytes int,
  -- Free-text notes — e.g. "use for festival posts" or
  -- "approved version, do not use 2024 archive".
  notes text,
  -- Provenance + soft delete.
  uploaded_by_email text,
  uploaded_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Only ONE active (non-archived) asset per variant. Uploading a new
-- logo-on-light archives any previous one — the renderer always
-- finds at most one active row per variant lookup, no ambiguity.
create unique index if not exists uniq_brand_assets_active_variant
  on brand_assets (variant)
  where archived_at is null;

create index if not exists idx_brand_assets_uploaded
  on brand_assets (uploaded_at desc)
  where archived_at is null;

alter table brand_assets enable row level security;

comment on table brand_assets is
  'Named brand asset variants (logos in different colours) uploaded by the SMM. The slide + social-image renderers pick the appropriate variant based on chip background colour. One active asset per variant; older ones soft-archived.';
