# DeenRelief Image Inventory

Generated 2026-05-05. 45 image files under `public/`.

## How Claude should use this file

- Every path below is **relative to the project root** (`/Users/rakinmiah/Desktop/DeenRelief/`). Prepend that to read an image with the Read tool.
- The Read tool can load PNG, JPG/JPEG, WebP, and GIF directly as visual content. SVG files load as text (XML markup).
- **Don't read all 45.** Most are categorical — pick the one that matches your task. Use the "duplicate groups" section to avoid reading the same image twice under different filenames.
- Dimensions and byte sizes are point-in-time; if a task hinges on exact pixels, run `sips -g pixelWidth -g pixelHeight <path>` to confirm.
- Regenerate this file with `find public -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.svg" \)` if it gets stale.

## Format breakdown

- WebP: 33  ·  JPEG: 8  ·  PNG: 6  ·  SVG: 2
- Largest single file: `qurbani-distribution.jpg` (425 KB)
- Total bytes: ~5.5 MB (≈1 MB of which is duplicate content — see below)

---

## Brand / app icons

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/icon-192.png` | 192×192 | 28 KB | PWA icon (small) |
| `public/icon-512.png` | 512×512 | 130 KB | PWA icon (large) |
| `public/images/logo.png` | 2085×349 | 334 KB | Wordmark logo (PNG, fallback) |
| `public/images/logo.webp` | 2085×349 | 25 KB | Wordmark logo (WebP, the one in use) |

## Heroes

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/hero-bangladesh-community.webp` | 746×395 | 54 KB | Bangladesh community hero |
| `public/images/hero-gulucuk-evi.webp` | 966×722 | 89 KB | Güluçük Evi (Türkiye housing) hero |
| `public/images/hero-our-work.webp` | 746×395 | 29 KB | Our Work landing hero |

## Bangladesh

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/bangladesh-community-children.webp` | 746×395 | 54 KB | Bangladesh community children |
| `public/images/bangladesh-housing.webp` | 600×544 | 30 KB | Bangladesh housing project |
| `public/images/bangladesh-school-children.webp` | 746×265 | 57 KB | Schoolchildren, wide crop |
| `public/images/bangladesh-school-v2.webp` | 746×320 | 81 KB | School (alternate crop) |

## Cancer Care Centres

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/cancer-care-family.webp` | 972×648 | 92 KB | Cancer-care family visit |
| `public/images/cancer-care-housing.webp` | 1114×830 | 125 KB | Cancer-care housing |
| `public/images/cancer-care-selfie.webp` | 972×1296 | 67 KB | Cancer-care selfie portrait |
| `public/images/cancer-care-visit.webp` | 1114×830 | 125 KB | Cancer-care home visit |
| `public/images/cancer-children-signs.webp` | 1200×1600 | 162 KB | Cancer children holding signs |
| `public/images/cancer-children-worker.webp` | 746×395 | 50 KB | Worker with cancer children |
| `public/images/cancer-children.webp` | 1200×1600 | 162 KB | Cancer children portrait |
| `public/images/centre-child.webp` | 602×802 | 50 KB | Cancer Care Centre child portrait |
| `public/images/children-smiling-deenrelief.webp` | 1200×1600 | 162 KB | Children smiling, branded |

## Palestine / Gaza

> ⚠️ All 7 source images are **portrait orientation** (9:16 or 3:4). Zero landscape originals exist — flagged in `PALESTINE_CAMPAIGN_BRIEF.md` as the blocker for Google Display 1.91:1 ad creative.

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/gaza-aid-distribution-1.webp` | 900×1600 | 137 KB | Gaza aid distribution scene 1 |
| `public/images/gaza-aid-distribution-2.webp` | 900×1600 | 199 KB | Gaza aid distribution scene 2 |
| `public/images/gaza-aid-distribution-3.webp` | 1200×1600 | 165 KB | Gaza aid distribution scene 3 |
| `public/images/gaza-aid-handover.jpeg` | 900×1600 | 214 KB | Gaza aid handover (JPEG) |
| `public/images/gaza-aid-packing.webp` | 720×1280 | 110 KB | Aid being packed for Gaza |
| `public/images/gaza-displacement-camp-children.jpeg` | 900×1600 | 222 KB | Displacement-camp children (JPEG) |
| `public/images/palestine-relief.webp` | 1200×1600 | 165 KB | Palestine campaign hero |

## Qurbani 2026

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/qurbani-distribution.jpg` | 1200×1600 | 425 KB | Qurbani meat distribution (JPEG, largest file in inventory) |
| `public/images/qurbani-hero-v2.jpeg` | 900×900 | 196 KB | Qurbani hero v2 (square) |
| `public/images/qurbani-hero-v3.jpeg` | 1200×900 | 340 KB | Qurbani hero v3 (4:3) |
| `public/images/qurbani-hero.webp` | 746×395 | 54 KB | Qurbani hero v1 |

## Türkiye field

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/brighton-team.webp` | 1084×812 | 65 KB | Brighton volunteer team |
| `public/images/gulucuk-team.webp` | 968×726 | 100 KB | Güluçük field team |

## Orphan / Zakat

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/orphan-care-worker.webp` | 274×530 | 24 KB | Orphan-care worker portrait |
| `public/images/orphan-sponsorship.webp` | 1200×1600 | 388 KB | Orphan sponsorship hero |
| `public/images/zakat-bangladesh-family.webp` | 600×544 | 30 KB | Zakat Bangladesh family |
| `public/images/zakat-family-support.webp` | 1200×1600 | 388 KB | Zakat family support |

## Team headshots

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/team/halim-rashid.webp` | 595×595 | 18 KB | Halim Rashid headshot |
| `public/images/team/shabek-ali.webp` | 595×595 | 16 KB | Shabek Ali headshot |
| `public/images/team/uthman-jeewa.webp` | 595×595 | 13 KB | Uthman Jeewa headshot |

## Partner logos

| Path | Dims | Size | Description |
|---|---|---|---|
| `public/images/partners/bangladesh-red-crescent.svg` | 106×106 viewBox | 22 KB | Bangladesh Red Crescent (SVG) |
| `public/images/partners/human-appeal.png` | 334×357 | 37 KB | Human Appeal logo |
| `public/images/partners/islamic-relief.png` | 820×1426 | 61 KB | Islamic Relief logo |
| `public/images/partners/read-foundation.jpeg` | 400×400 | 11 KB | READ Foundation logo (JPEG) |
| `public/images/partners/trussell.svg` | 145×38 viewBox | 15 KB | Trussell Trust (SVG) |
| `public/images/partners/ummah-welfare-trust.png` | 800×104 | 54 KB | Ummah Welfare Trust logo |

---

## Duplicate groups (verified by MD5 — bit-identical content)

Roughly **1 MB of redundant bytes** in the bundle. When viewing, only Read one file per group.

| # | Group | Wasted bytes |
|---|---|---|
| 1 | `orphan-sponsorship.webp` ≡ `zakat-family-support.webp` | 388 KB |
| 2 | `cancer-children-signs.webp` ≡ `cancer-children.webp` ≡ `children-smiling-deenrelief.webp` | 324 KB (×2 extra copies) |
| 3 | `gaza-aid-distribution-3.webp` ≡ `palestine-relief.webp` | 165 KB |
| 4 | `cancer-care-housing.webp` ≡ `cancer-care-visit.webp` | 125 KB |
| 5 | `bangladesh-community-children.webp` ≡ `hero-bangladesh-community.webp` ≡ `qurbani-hero.webp` | 108 KB (×2 extra copies) |
| 6 | `bangladesh-housing.webp` ≡ `zakat-bangladesh-family.webp` | 30 KB |

Cleanup recipe: pick a canonical filename per group, grep for the others (`grep -r "filename"`), update imports, delete the rest.

## Format-conversion candidates

JPEG/JPG files that should become WebP for ~30–50% smaller transfer (combined ~1.4 MB → ~0.8 MB):

- `public/images/qurbani-distribution.jpg` (425 KB)
- `public/images/qurbani-hero-v3.jpeg` (340 KB)
- `public/images/gaza-displacement-camp-children.jpeg` (222 KB)
- `public/images/gaza-aid-handover.jpeg` (214 KB)
- `public/images/qurbani-hero-v2.jpeg` (196 KB)
- `public/images/partners/read-foundation.jpeg` (11 KB)

`logo.png` (334 KB) can also be deleted — `logo.webp` (25 KB) is already the in-use file at the same dimensions.
