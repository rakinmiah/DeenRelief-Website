-- 010_bazaar_storage.sql
--
-- Supabase Storage bucket for the Deen Relief Bazaar admin's
-- catalog image uploads (product photos + maker portraits).
--
-- Design choices:
--   - Public read: every uploaded image is publicly readable. The
--     bazaar shop pages render them directly via Next.js <Image>,
--     so no signed-URL choreography needed. Uploads themselves go
--     through the admin-only API route which uses the service
--     role, so anon can't write.
--   - Single bucket: products + makers share `bazaar-products`,
--     organised by sub-folder. Simpler to manage and policy
--     against than two separate buckets.
--   - Image content-type allow-list: PNG / JPEG / WebP / AVIF.
--     The admin's upload route processes everything through
--     Sharp into WebP regardless, so this is a defence-in-depth
--     check at the bucket level — keeps random PDFs / executables
--     out even if the upload route logic is bypassed.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bazaar-products',
  'bazaar-products',
  true,
  10485760,  -- 10 MB; the API route enforces a tighter limit too
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS on storage.objects is enabled by Supabase by default; we
-- add explicit policies for this bucket.

-- Public read for everyone (anon + authenticated): the shop site
-- needs to render these without auth.
DROP POLICY IF EXISTS bazaar_products_public_read ON storage.objects;
CREATE POLICY bazaar_products_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'bazaar-products');

-- No insert / update / delete policies for anon or authenticated
-- roles — writes happen exclusively through the admin API route
-- which uses the service_role key (bypasses RLS).
