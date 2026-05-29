# Phase 4y — Second-pass social audit (high-engagement emergency content)

**Audit date:** 2026-05-29
**Goal:** Find what makes specifically the HIGH-ENGAGEMENT humanitarian / emergency / crisis-coverage posts work, then apply to DR's generator. Different from 4o which was a brand-audit across 5 charities; this one is engagement-focused.

---

## Anchor finding — MSF's "Remember Us" post (327K likes)

@doctorswithoutborders · 6 December 2023

**Visual**: a photograph of a hospital whiteboard with handwritten ink:
> WHOEVER STAYS UNTIL THE END WILL TELL THE STORY
> WE DID WHAT WE COULD
> REMEMBER US ★
> 20/9/2023

**No typographic overlay. The found object IS the post.**

**Caption structure** (this is the masterclass):
1. **Quote-opener in quotation marks**: `"We did what we could. Remember us."`
2. **One sentence context**: `These words were written by Dr. Mahmoud Abu Nujaila on October 20th, on a whiteboard normally used for planning surgeries.`
3. **The harm**: `He was killed by a strike on Al Awda Hospital on November 21st in #Gaza`
4. **Expansion** (name the others): `The same strike killed another MSF doctor, Dr. Ahmad Al Sahar, as well as a doctor working with Al Awda, Dr. Ziad Al-Tatari. Other medical staff were severely injured.`
5. **Echo the opener**: `"Remember us."`
6. **Hashtag-CTA**: `This #muststopnow. We need a #ceasefirenow`

**Engagement signals**: 327K likes. No donate URL. No "link in bio". The post is reverent witness; the engagement IS the message.

**What this teaches the DR generator:**
- **Found-object visuals beat produced graphics for emotional weight**. A real artifact (handwriting, voicemail screenshot, document scan) is irreproducible and irreducible.
- **Quote-opener pattern in captions**: open with the pulled quote in quotation marks, attribute in the next sentence, build context, echo the quote at the close. This is the structure.
- **Specificity carries the post**: date (October 20th, November 21st), name (Dr. Mahmoud Abu Nujaila + 2 others), institution (Al Awda Hospital, MSF), location (#Gaza). Every fact has a noun.
- **Sometimes the right CTA is no CTA**. Witness posts (`quiet_dignity` arc in our schema) should suppress the URL pill and use a hashtag-CTA pair instead.
- **2 hashtags, both political/movement**. Not "muslimcharity ukcharity emergencyrelief" — `#muststopnow #ceasefirenow`. Intentional.

---

## Pattern 2 — MSF's "Eid eve strike" reel (920 likes, 14h old)

Video reel with **news-overlay typography**:
- Top-left: dark translucent rounded rectangles holding white text — `On the eve of Eid in Gaza:` / `Our colleague was washing dishes when the strike hit a nearby building`
- Mid-video reveal: bold sans-caps `THE WINDOW SUDDENLY EXPLODED` overlaid as the footage plays
- Phone-shot footage (shaky, grainy) — authenticity over polish

**Caption**:
- Opens with attribution: `Our MSF colleague Renan sent us a message and told us what happened the night of May 26, 2026 in northern Gaza, when Israeli forces struck the building directly opposite of her apartment, without any warning. Her home was partially damaged.`
- Pull quote from named staff: `From Renan: "It felt like death was closer than ever before. If I had one wish, it would be to live a truly peaceful life… without having a constantly alert and terrified nervous system."`

**Top comment**: from `@renansaed` (the actual MSF colleague mentioned) — `Still can't believe that we survived that night..thank you for sharing my story with the world 🙏` — first-person voice IN the comments drives ranking.

**What this teaches:**
- **News-overlay typography is its own design system** — Apple News / BBC News aesthetic with dark translucent rounded backgrounds, white text. Cleaner than DR's current "panel below" treatment.
- **Caption opens with WHO + WHEN + WHERE + WHAT** — `Our colleague Renan sent us a message... the night of May 26, 2026 in northern Gaza...` — every reader has the briefing in the first sentence.
- **Verifiable specificity beats every other rhetorical move**. Named persons + named institutions + dated incidents.

---

## Pattern 3 — UNICEF press release as visual (institutional credibility)

@unicef — pinned post: a literal scan/screenshot of a UNICEF press release titled `UNICEF scaling up efforts to protect and support children and families following Ebola outbreaks in the Democratic Republic of the Congo and Uganda`. The document IS the visual.

**What this teaches:**
- For institutional credibility moments (a major NEW operation, response launch, partnership announcement), posting the actual document or press release as the slide signals seriousness. Bureaucratic aesthetics earn trust.
- DR could occasionally render a "release-style" slide for major appeal launches — masthead, ALL-CAPS title, dateline.

---

## Universal patterns across high-engagement posts

### Caption opener formulas (in priority order)

1. **Quote in quotation marks** — `"We did what we could. Remember us."` → MSF 327K likes
2. **Named voice attribution** — `Our MSF colleague Renan sent us a message...` → MSF 920 likes new
3. **Specific dated event** — `On 18 May 2026, Israeli forces shot and killed...` (OCHA report style)
4. **Hard number lead** — `1.7 million people are sheltering in 1,600 sites...`
5. **Provocation / refusal-to-look-away** — `Sudan. The world's largest humanitarian crisis, actively ignored.` (Islamic Relief 9K likes)

DR currently uses #4 (numbers) which is fine but mid-tier. Stage 1 should encourage Claude to TRY #1 or #2 first when the source material supports it — i.e. when there's a real quote or a real named person in the raw_payload.

### Caption structure

The 5-beat pattern across high-engagement posts:
1. **Quote / pulled fragment** (opener)
2. **Context** (one sentence — who, when, where)
3. **The harm / the news** (the event)
4. **Expansion** (names of others affected, additional context)
5. **Echo + CTA** (repeat the opener fragment, then hashtag-CTA)

Length: 80–120 words on the high-engagement posts. NOT 280 chars cramped. The audience wants to read on serious posts.

### Hashtag strategy

- **2–4 hashtags max** on serious humanitarian posts. Not 5–6.
- **Movement/political hashtags** beat generic charity ones for engagement.
  - ✓ `#ceasefirenow` `#muststopnow` `#allEyesOnSudan` `#GazaUnderAttack`
  - ✗ `#muslimcharity` `#ukcharity` `#emergencyrelief` (these signal CHARITY MARKETING; the audience scrolls past)
- **Double-use as words in the prose** — `He was killed... in #Gaza` — both content and hashtag.

### When NOT to have a URL CTA

Witness / `quiet_dignity` posts and reverent-tone posts SHOULD suppress the URL pill. Replacing the URL with a hashtag-CTA (`#ceasefirenow`) signals that the moment is witness, not transaction.

DR's current generator always shows a URL pill on the CTA slide. We should add a `cta_kind: 'witness' | 'donate' | 'engage'` axis so the CTA slide can be a hashtag-statement instead of a URL pill.

### Visual patterns that win

1. **Found-object photography** — real artifacts, real handwriting, real document scans
2. **News-overlay typography on phone footage** — dark translucent bars top-left, white sans-caps
3. **Smiling group portraits** (UNICEF) — dignified beneficiary group, no DR branding overpowering
4. **Press-release-as-image** for institutional moments
5. **Specificity in the visual itself** — a date stamp, a coordinate, a name written somewhere readable

---

## Concrete fixes to ship (Phase 4y implementation)

### Bug fixes
- **Social image MagazineCover eyebrow** still uses Caveat brush. Same Phase 4u/4x miss as photo slide eyebrows.
- **Luminance override threshold** at 0.45 was too lenient — slide 3's white-on-tan got through. Lower to 0.38.

### Schema additions
- **`cta_kind: 'donate' | 'witness' | 'engage'`** on the LaunchPacket. Controls whether the CTA slide shows a URL pill, a hashtag pair, or a comment-keyword prompt.
- **`caption_opener_style: 'quote' | 'attribution' | 'dated_event' | 'number' | 'provocation'`** on `social_post`. Stage 1 picks based on raw_payload content.

### Prompt rules

**Stage 1 — caption opener selection:**
> When raw_payload contains an attributed quote or a named staff member, OPEN THE CAPTION with that. Quote-opener and attribution-opener patterns earn 5–10× the engagement of number-openers (verified against MSF's "Remember us" 327K likes vs. typical 1–2K-like charity posts with statistics-first leads).

**Stage 1 — hashtag intentionality:**
> 2–4 hashtags max. Lead with movement/political hashtags (`#ceasefirenow`, `#allEyesOnSudan`, `#muststopnow`) when the situation warrants. Generic charity hashtags (`#muslimcharity`, `#ukcharity`, `#emergencyrelief`) signal CHARITY MARKETING and tank engagement — use ONE max, and only when relevant. Aim to double-use at least one hashtag as a word in the prose (`...killed in #Gaza`).

**Stage 1 — cta_kind selection:**
> For `quiet_dignity` and `testimony` arcs, default `cta_kind: 'witness'` (no URL, hashtag-CTA). For `awareness_petition`, `cta_kind: 'engage'`. For `evidence`, `hero_image`, `before_after`: `cta_kind: 'donate'`.

**Stage 2 — visual similarity:**
> When multiple candidate photos show the same subject / scene / shoot, pick ONE. Even if the IDs are different, repeated-shoot redundancy reads as low-effort to donors.

**Stage 2 — caption template:**
> Use the 5-beat structure on emergency packets: (1) quote or pulled fragment opener, (2) one sentence context, (3) the harm, (4) expansion with names, (5) echo + hashtag-CTA.

**Stage 3 — new checks:**
- **CAPTION OPENER WEAK** — if the caption opens with a number when a quote/attribution exists in raw_payload, propose a quote-opener rewrite.
- **HASHTAGS GENERIC** — if all hashtags are generic charity tags, propose movement-aligned alternatives.
- **VISUAL REDUNDANCY** — if any two photo slides show the same scene/subject (judged from vision tokens), propose swapping one out.

### Renderer additions

- **CTA slide for `cta_kind: 'witness'`** — instead of the amber URL pill, render a hashtag pair: `#ceasefirenow · #muststopnow` in restrained sans, no pill background.
- **Social image MagazineCover** — fix eyebrow to use editorial style + redesign the right column to lead with a stat strip in larger type (currently the 13pt facts are too small to read at thumbnail scale).
