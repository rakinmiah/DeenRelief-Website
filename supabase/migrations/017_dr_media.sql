-- 017_dr_media.sql
--
-- General-purpose media library for the Deen Relief admin.
--
-- Storage / DB split:
--   - Binaries live in Supabase Storage bucket `dr-media` (public
--     read). Public so URLs can be pasted into social posts,
--     embedded in partner sites, etc — these are marketing assets.
--   - Metadata lives in `dr_media` table: filename, mime type,
--     size, uploader, description, tags. The table is the index
--     into the bucket; the bucket is the dumb store.
--
-- Allow-list (file_size_limit + allowed_mime_types):
--   - Images (jpeg/png/webp/avif/gif)
--   - Videos (mp4/webm/quicktime)
--   - PDFs and a few common doc types
--   - Excludes anything executable / archives / random binaries
--
-- File size cap is set to 5 GB (Supabase Pro plan ceiling). On the
-- free tier the actual cap is 50 MB regardless of this setting —
-- the bucket-level cap is the upper bound, Supabase's per-plan
-- limit is the real cap. Set high here so it doesn't need
-- another migration when the project upgrades to Pro.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dr-media',
  'dr-media',
  true,
  5368709120,  -- 5 GB (Pro plan upper bound; free tier still caps at 50 MB)
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    -- Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for everyone — these are marketing assets that need
-- to be embed-able anywhere.
DROP POLICY IF EXISTS dr_media_public_read ON storage.objects;
CREATE POLICY dr_media_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'dr-media');

-- No insert / update / delete policies for anon or authenticated.
-- All writes go through the admin API which uses service_role.

-- ─────────────────────────────────────────────────────────────────
-- Metadata table
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dr_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- The original filename the trustee uploaded — used for
  -- display + download. Storage key is separate (see below).
  filename text NOT NULL,

  -- Storage path inside the bucket. Format:
  --   {yyyy}/{mm}/{uuid}-{slug-of-filename}.{ext}
  -- The yyyy/mm prefix keeps the bucket browseable in Supabase's
  -- UI even when the library grows large.
  storage_path text NOT NULL UNIQUE,

  -- The original mime type from the multipart upload. We trust
  -- the browser-supplied type here because the bucket also has a
  -- server-side allow-list — defence in depth.
  mime_type text NOT NULL,

  -- Size in bytes for the UI to display + the trustee to monitor
  -- against quota.
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),

  -- Which trustee uploaded the file.
  uploaded_by_email text NOT NULL,

  -- Trustee-editable label + free-form description. Both
  -- optional — most files won't need them.
  description text,

  -- Searchable tags. Postgres text[] with a GIN index is
  -- plenty performant for the volume we expect (single org
  -- media library, thousands not millions of rows).
  tags text[] NOT NULL DEFAULT '{}'::text[]
);

CREATE INDEX IF NOT EXISTS dr_media_created_idx
  ON dr_media (created_at DESC);

CREATE INDEX IF NOT EXISTS dr_media_mime_idx
  ON dr_media (mime_type);

CREATE INDEX IF NOT EXISTS dr_media_tags_idx
  ON dr_media USING gin (tags);

ALTER TABLE dr_media ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only. Same defence-in-depth pattern
-- as admin_audit_log / admin_notifications / bazaar_orders.

COMMENT ON TABLE dr_media IS
  'Metadata index for the Deen Relief admin media library. '
  'Binaries live in the dr-media Storage bucket; this table '
  'tracks what is there, who uploaded it, and how to find it.';
