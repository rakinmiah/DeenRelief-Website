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
screenshot as `<id>.png`:

| Filename                       | What to capture                                            |
| ------------------------------ | ---------------------------------------------------------- |
| `msf-remember-us.png`          | MSF's Gaza "Remember Us" post (Dr Mahmoud Abu Nujaila quote) |
| `ir-all-eyes-sudan.png`        | Islamic Relief UK's "All Eyes On Sudan" newspaper reel cover |
| `ir-eid-prayers.png`           | Islamic Relief UK's "Wondering how to perform Eid prayers?" carousel cover |
| `charity-water-manifesto.png`  | charity:water's "HI, WE'RE CHARITY: WATER" identity reel cover |
| `muslim-hands-qurbani.png`     | Muslim Hands UK's "YOUR QURBANI in NIGER" portrait post    |
| `unicef-restraint.png`         | A UNICEF child-portrait or displacement post showing institutional restraint |

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
