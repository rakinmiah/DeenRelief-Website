-- 008_bazaar_seed.sql
--
-- Seed the bazaar catalog with the 5 makers + 6 products that the
-- placeholder-mode mockup used (src/lib/bazaar-placeholder.ts).
-- Idempotent: re-running this is a no-op via ON CONFLICT DO
-- NOTHING on the natural keys (maker name, product slug, variant SKU).
--
-- Fixed UUIDs are used so:
--   1. Re-runs don't generate duplicate rows.
--   2. A future backfill that sets bazaar_order_items.product_id =
--      <matched UUID> based on the historical product_name_snapshot
--      can hard-code the mapping in one place.
--
-- Image URLs continue to point at the /images/bazaar-placeholder/
-- paths (which don't physically exist yet — BazaarPlaceholderImage
-- shows the label text as a fallback). When the photoshoot lands,
-- the admin updates each product's primary_image + gallery_images
-- via the admin catalog UI.

-- ─────────────────────────────────────────────────────────────────
-- Makers
-- ─────────────────────────────────────────────────────────────────
INSERT INTO bazaar_product_makers (id, name, country, region, photo_url, story, quote, is_active)
VALUES
  (
    '11111111-1111-4111-8111-000000000001',
    'Khadija R.',
    'Bangladesh',
    'Sylhet',
    '/images/bazaar-placeholder/maker-khadija.webp',
    'Khadija is 32 and lives with her three children in a two-room flat in Sylhet. She learned to sew from her mother and has been making clothes for her neighbourhood for over a decade. Before joining Deen Relief Bazaar, she earned about £40 a month doing piecework for a local market trader. Each abaya she makes for us pays roughly four times that — enough that her oldest daughter is now back in school full-time.',
    'I sew them like I sew for my own family. If a stitch is loose I do it again.',
    true
  ),
  (
    '11111111-1111-4111-8111-000000000002',
    'Mehmet T.',
    'Turkey',
    'Adana',
    '/images/bazaar-placeholder/maker-mehmet.webp',
    'Mehmet runs the workshop with his two younger brothers, Mustafa and Yusuf. The shop has been in the family since 1991. They moved to making thobes for Deen Relief Bazaar after the regional textile crisis pushed several of their commercial buyers to close in 2024. The Bazaar order keeps two of the looms running full-time and pays for Yusuf''s daughter''s secondary school fees.',
    NULL,
    true
  ),
  (
    '11111111-1111-4111-8111-000000000003',
    'Fatima S. & the Dhaka Co-op',
    'Bangladesh',
    'Dhaka',
    '/images/bazaar-placeholder/maker-fatima.webp',
    'Fatima is one of nine women in a small cooperative in a village forty minutes outside Dhaka. The co-op was founded in 2019 by a local schoolteacher who wanted to give the village''s widows a way to earn from home. They share two looms and rotate shifts so that every member contributes to every order. Each mat carries a small fabric tag stitched by hand with the cooperative''s name.',
    'When I weave I am thinking about the person who will pray on it. I make du''a for them.',
    true
  ),
  (
    '11111111-1111-4111-8111-000000000004',
    'Yusuf H.',
    'Turkey',
    'Adana',
    '/images/bazaar-placeholder/maker-yusuf.webp',
    'Yusuf is 58 and learned wood-carving from his grandfather. He works from a small workshop attached to his home. His son helps with the sanding on weekends. Each tasbih takes about two hours from raw block to finished piece.',
    NULL,
    true
  ),
  (
    '11111111-1111-4111-8111-000000000005',
    'Aisha M.',
    'Bangladesh',
    'Sylhet',
    '/images/bazaar-placeholder/maker-aisha.webp',
    'Aisha is 47 and has been doing embroidery work since she was nine, learning from her mother and grandmother. Her work was previously sold without attribution through a wholesale buyer in Dhaka. Working directly with Deen Relief Bazaar, she now earns three times what she did before, and her daughter — also a skilled embroiderer — has joined her workshop.',
    NULL,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────────────────────
INSERT INTO bazaar_products (
  id, slug, name, tagline, description, category, sku, price_pence, weight_grams,
  primary_image, gallery_images, materials, care_instructions, sizing_guide_html,
  maker_id, stock_count, low_stock_threshold, is_active
)
VALUES
  (
    '22222222-2222-4222-8222-000000000001',
    'the-sylhet-abaya',
    'The Sylhet Abaya',
    'Hand-stitched cotton-blend, designed for everyday modesty',
    E'A flowing, breathable abaya cut from a soft cotton-rayon blend that drapes beautifully and holds its shape through the day.\n\nEach piece is hand-finished in Sylhet, Bangladesh — the side seams, the cuffs, and the discreet pocket lining are all sewn one stitch at a time. The fabric is sourced from a small mill in Narayanganj that pays its weavers above the regional minimum wage.\n\nDesigned for school runs, work, the masjid, and everywhere in between.',
    'abaya', 'DR-ABY-001', 7900, 480,
    '/images/bazaar-placeholder/abaya-1.webp',
    '["/images/bazaar-placeholder/abaya-1.webp","/images/bazaar-placeholder/abaya-2.webp","/images/bazaar-placeholder/abaya-3.webp"]'::jsonb,
    '70% cotton, 30% rayon, dyed with low-impact dyes in Narayanganj',
    '["Cold machine wash on a gentle cycle","Hang to dry in shade — direct sunlight may fade the dye","Iron on medium with the garment turned inside out"]'::jsonb,
    '<p>Our abayas run true to UK Muslim sizing. Choose by length:</p><ul><li><strong>Small (52")</strong> — fits 5''0" – 5''3"</li><li><strong>Medium (54")</strong> — fits 5''4" – 5''7"</li><li><strong>Large (56")</strong> — fits 5''8" – 5''11"</li></ul><p>Sleeve length is generous; cuffs can be folded back for shorter arms.</p>',
    '11111111-1111-4111-8111-000000000001',
    4, 2, true
  ),
  (
    '22222222-2222-4222-8222-000000000002',
    'the-anatolia-thobe',
    'The Anatolia Thobe',
    'A relaxed everyday thobe woven near Adana',
    E'A medium-weight thobe in soft beige cotton — ideal for prayer, Jumu''ah, and warm summer afternoons.\n\nWoven and tailored in a small workshop in Adana, Turkey, by a team of three brothers who have been making clothes since their father opened the shop in 1991. The cuffs and collar are reinforced with a contrast stitch that''s invisible from the front but adds years to the lifespan.',
    'thobe', 'DR-THB-001', 6900, 420,
    '/images/bazaar-placeholder/thobe-1.webp',
    '["/images/bazaar-placeholder/thobe-1.webp","/images/bazaar-placeholder/thobe-2.webp"]'::jsonb,
    '100% mid-weight Turkish cotton',
    '["Cold machine wash, gentle cycle","Tumble dry low or hang dry","Iron on medium — the cuffs benefit from a crisp press"]'::jsonb,
    '<p>Our thobes are cut for a relaxed fit. If you''re between sizes, size down for a sharper silhouette or stay true for ease of movement during salah.</p>',
    '11111111-1111-4111-8111-000000000002',
    5, 2, true
  ),
  (
    '22222222-2222-4222-8222-000000000003',
    'the-dhaka-prayer-mat',
    'The Dhaka Prayer Mat',
    'A handwoven prayer mat with a quiet, dignified pattern',
    E'A traditional handwoven prayer mat in deep forest green, with a geometric border pattern inspired by Mughal-era tilework. The pile is soft underfoot but firm enough to hold sujood comfortably without bunching.\n\nWoven on traditional looms in a women''s cooperative outside Dhaka. Each mat takes one weaver about a day and a half to complete.',
    'prayer-mat', 'DR-MAT-001', 4500, 600,
    '/images/bazaar-placeholder/mat-1.webp',
    '["/images/bazaar-placeholder/mat-1.webp","/images/bazaar-placeholder/mat-2.webp"]'::jsonb,
    'Cotton-acrylic blend, woven on traditional looms',
    '["Vacuum gently with a soft brush attachment","Spot-clean spills immediately with a damp cloth","Do not machine wash — the pile will mat"]'::jsonb,
    NULL,
    '11111111-1111-4111-8111-000000000003',
    6, 2, true
  ),
  (
    '22222222-2222-4222-8222-000000000004',
    'the-silk-hijab',
    'The Silk Hijab',
    'Lightweight, breathable, and easy to drape',
    E'A square silk-blend hijab with a fine hand-rolled hem. Available in five colours — neutral cream, deep navy, soft sage, burnt rose, and charcoal.\n\nBlock-printed and finished in Sylhet by the same team that makes our abayas. The hand-rolled hem takes about twenty minutes per scarf.',
    'hijab', 'DR-HIJ-001', 2500, 90,
    '/images/bazaar-placeholder/hijab-1.webp',
    '["/images/bazaar-placeholder/hijab-1.webp","/images/bazaar-placeholder/hijab-2.webp"]'::jsonb,
    '60% silk, 40% viscose, hand-rolled hem',
    '["Hand wash cold, lay flat to dry","Iron on low through a cotton cloth"]'::jsonb,
    NULL,
    '11111111-1111-4111-8111-000000000001',
    8, 3, true
  ),
  (
    '22222222-2222-4222-8222-000000000005',
    'the-adana-tasbih',
    'The Adana Tasbih',
    'Hand-carved olive wood, 99 beads',
    E'A traditional 99-bead tasbih hand-carved from a single piece of Anatolian olive wood. Each bead is sanded by hand to a soft matte finish; the tassel is finished with a brass cap and a simple silk cord.\n\nMade by Yusuf in his workshop in Adana, who has been carving tasbih since he was twelve.',
    'tasbih', 'DR-TSB-001', 1800, 60,
    '/images/bazaar-placeholder/tasbih-1.webp',
    '["/images/bazaar-placeholder/tasbih-1.webp"]'::jsonb,
    'Anatolian olive wood, brass cap, silk cord',
    '["Wipe with a soft dry cloth","Avoid water — the wood will warp","A drop of olive oil once a year keeps the colour deep"]'::jsonb,
    NULL,
    '11111111-1111-4111-8111-000000000004',
    12, 4, true
  ),
  (
    '22222222-2222-4222-8222-000000000006',
    'the-embroidered-quran-cover',
    'The Embroidered Qur''an Cover',
    'A protective cover with traditional Sylheti embroidery',
    E'A padded velvet cover designed to fit a standard medium-sized Mushaf. The embroidery — a subtle floral pattern in gold thread — is done entirely by hand.\n\nMade by Aisha in Sylhet, who specialises in fine embroidery work that''s been passed down in her family for three generations.',
    'quran-cover', 'DR-QRN-001', 3500, 180,
    '/images/bazaar-placeholder/quran-cover-1.webp',
    '["/images/bazaar-placeholder/quran-cover-1.webp"]'::jsonb,
    'Cotton velvet outer, padded lining, hand-embroidered gold thread',
    '["Spot-clean only with a slightly damp cloth","Do not machine wash","Store flat, away from direct sunlight"]'::jsonb,
    NULL,
    '11111111-1111-4111-8111-000000000005',
    5, 2, true
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Variants
-- ─────────────────────────────────────────────────────────────────
INSERT INTO bazaar_product_variants (id, product_id, size, colour, sku, stock_count, price_pence_override)
VALUES
  -- Sylhet Abaya
  ('33333333-3333-4333-8333-010000000001', '22222222-2222-4222-8222-000000000001', 'Small (52)', NULL, 'DR-ABY-001-S', 1, NULL),
  ('33333333-3333-4333-8333-010000000002', '22222222-2222-4222-8222-000000000001', 'Medium (54)', NULL, 'DR-ABY-001-M', 2, NULL),
  ('33333333-3333-4333-8333-010000000003', '22222222-2222-4222-8222-000000000001', 'Large (56)', NULL, 'DR-ABY-001-L', 1, NULL),
  -- Anatolia Thobe
  ('33333333-3333-4333-8333-020000000001', '22222222-2222-4222-8222-000000000002', 'Medium', NULL, 'DR-THB-001-M', 2, NULL),
  ('33333333-3333-4333-8333-020000000002', '22222222-2222-4222-8222-000000000002', 'Large', NULL, 'DR-THB-001-L', 2, NULL),
  ('33333333-3333-4333-8333-020000000003', '22222222-2222-4222-8222-000000000002', 'X-Large', NULL, 'DR-THB-001-XL', 1, NULL),
  -- Silk Hijab (variants by colour)
  ('33333333-3333-4333-8333-040000000001', '22222222-2222-4222-8222-000000000004', NULL, 'Cream', 'DR-HIJ-001-CR', 3, NULL),
  ('33333333-3333-4333-8333-040000000002', '22222222-2222-4222-8222-000000000004', NULL, 'Navy', 'DR-HIJ-001-NV', 3, NULL),
  ('33333333-3333-4333-8333-040000000003', '22222222-2222-4222-8222-000000000004', NULL, 'Sage', 'DR-HIJ-001-SG', 2, NULL),
  -- Embroidered Qur'an Cover (variants by colour)
  ('33333333-3333-4333-8333-060000000001', '22222222-2222-4222-8222-000000000006', NULL, 'Deep Navy', 'DR-QRN-001-NV', 3, NULL),
  ('33333333-3333-4333-8333-060000000002', '22222222-2222-4222-8222-000000000006', NULL, 'Burgundy', 'DR-QRN-001-BG', 2, NULL)
ON CONFLICT (id) DO NOTHING;
