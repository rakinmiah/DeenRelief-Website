# Design reference library

These PNGs are fed to **Stage 1 (strategy brief)** of the First Response
packet generator. Each image is a screenshot of a high-engagement
humanitarian post — Claude sees them as vision input before writing
the brief, so it pattern-matches against actual editorial discipline
instead of just our text-described audit findings.

The wiring is automatic — drop a PNG with the right filename and
the next packet redraft picks it up.

## Required filenames

The IDs come from `src/lib/social-design-references.ts`. Save each
screenshot as `<id>.{png|jpg|jpeg|webp}` — the loader tries each
extension in order so any common image format works.

| Filename                          | Source post URL                                                 | Status |
| --------------------------------- | --------------------------------------------------------------- | ------ |
| `msf-remember-us.jpg`             | https://www.instagram.com/p/C0hUw1-O346/                        | ✅ shipped |
| `ir-all-eyes-sudan.jpg`           | https://www.instagram.com/p/DTTRMMRDEAh/                        | ✅ shipped |
| `charity-water-manifesto.jpg`     | https://www.instagram.com/p/DE07wKHRbVV/                        | ✅ shipped |
| `muslim-hands-qurbani.jpg`        | https://www.instagram.com/p/DY6x_uADvC-/                        | ✅ shipped (Yemen variant) |
| `unicef-restraint.jpg`            | https://www.instagram.com/p/DX7DgPDFsEV/ (UNICEF Darfur post)   | ⚠️ pending — see below |
| `ir-eid-prayers.jpg`              | @islamicreliefuk Eid prayers carousel (seasonal — search profile) | ⚠️ pending |

### Capturing the remaining 2

Brave throttled the automated downloads on the last couple. Easiest manual approach:

1. Open the post URL in a browser tab
2. Right-click the post image → "Save image as…"
3. Save with the exact filename above into this directory

## Format

- PNG only (the loader is hardcoded to `image/png` — JPG won't work)
- Capture the WHOLE post tile, including caption preview if visible
- Square crop preferred (Instagram default) but not mandatory
- Reasonable size — Claude reads them at modest resolution, so
  ~1080×1080 is plenty. Files over 2MB will slow Stage 1 noticeably.

## Without PNGs

The system still works without screenshots — the structured text
brief (conceit + steal bullets) is sent regardless. But the vision
pattern-match is where the real lift comes from. Even one or two
screenshots improves Stage 1 output noticeably.

## Adding a new reference

1. Add an entry to `DESIGN_REFERENCES` in
   `src/lib/social-design-references.ts` with a unique kebab-case `id`,
   the source + metric, conceit, steal bullets, and which `arc` values
   it informs.
2. Drop the PNG here as `<id>.png`.
3. Redraft any packet to see Stage 1 use the new reference.
