# Phase 4o — Social audit findings

**Audit date:** 2026-05-28
**Goal:** Catalogue what makes Instagram / Facebook / X posts work in DR's aspirational + competitor space. Translate findings into prompt edits + slide format additions while preserving DR brand voice.

---

## Methodology

For each brand: scan grid, sample 3–5 posts, capture:
- **Layout** — canvas division, photo position, text position
- **Type** — font choices, hierarchy, sizes, register
- **Colour** — palette, contrast, mood
- **Photo** — subject, composition, treatment
- **Copy** — length, voice, register, lead
- **CTA** — where, how prominent
- **What to steal** — specific takeaway for DR

---

## Baseline — @deenrelief (DR's own grid)

**828 posts · 10.3K followers · Charity organisation · UK Islamic Charity est. 2013, Brighton-based**

**Important reality check:** DR's actual grid is NOT one consistent style. It's at least four distinct visual modes:

1. **"INTRODUCING…" series** (pinned at top — what we've been emulating)
   - Bowlby One SC display titles, Caveat eyebrows, dark forest green canvas
   - Four-point amber sparkle decorations
   - White brand chip top-left
   - This is the *educational / brand-identity* mode

2. **Religious motif posts** (Eid Mubarak, Ramadan Kareem, Dhul-Hijjah)
   - Ornate frames, Arabic calligraphy, Kaaba illustrations, crescent moons
   - **Serif italic display** (looks like Lora or Playfair Display) — NOT Bowlby
   - Cream + deep green or white + deep green palette
   - Decorative gold/amber accents
   - These are the *cultural / festival* mode

3. **Photographic product / appeal posts** (Qurbani 2026, Zakat appeals)
   - Real photographic renders of sheep/cattle/Kaaba
   - Pricing tables with country tier ladders
   - Mix of typography + photographic product imagery
   - These are the *commercial / fundraising* mode

4. **Ground-level field imagery** (Brighton seafront, Gaza children with Shabek)
   - Real photos of operations
   - White text overlay with mid-tone shadow
   - Less typography-heavy, more photojournalism feel
   - These are the *witness / proof* mode

**Implication for the generator:** we've been treating slide design as ONE template (mode 1) but DR's brand actually flexes across four modes depending on the post's purpose. The packet generator should pick the visual mode that fits the strategy_brief's narrative arc, not always default to "INTRODUCING" style.

**Mode-to-arc mapping (proposed):**
- `evidence` arc → mode 1 (typography-led INTRODUCING style)
- `quiet_dignity` arc → mode 4 (photo-led witness)
- `hero_image` arc → mode 4 (photo-led witness)
- `testimony` arc → mode 4 (photo-led witness)
- `before_after` arc → mode 3 (commercial/comparison)
- Festival posts → mode 2 (cultural)

This is the central architectural finding. Everything below either reinforces or refines it.

---


## @islamicreliefuk — 200K followers, UK's biggest Muslim charity

### Post 1: "All Eyes On Sudan" newspaper reel (9.2K likes, Jan 2026)

**Format**: Reel — a person holds up an actual printed newspaper with the headline "All Eyes On Sudan" / "Sudan is in Crisis" / "Officials confirm Famine in Sudan". The camera frames their hands + the newspaper. The newspaper IS the message.

**Copy structure**:
1. Lead: "💔 Sudan. The world's largest humanitarian crisis, actively ignored by the world."
2. Pull quote from named partner (@ziasalik): "The international community has failed. Failed to deliver meaningful political action. Failed to deliver a ceasefire. And failed the Sudanese people."
3. Action mechanism: "👉 Comment 'PETITION' and we'll DM you a link to sign our petition and demand the UK govt to take action for Sudan."

**What to steal:**
- **Format invention is the headline-grabber** — they invented a visual conceit (newspaper held up by hands) that is itself a piece of content. DR's generator should be capable of inventing format conceits per story, not just filling slide templates.
- **Petition / signal posts are a distinct mode** — no donation tiers, no price ladder. Action = "comment PETITION → DM funnel". The packet schema should support an `awareness_petition` arc as a sibling to `evidence` / `before_after` / `hero_image`.
- **Anger as register** — "actively ignored", "Failed... Failed... Failed..." — Islamic charities can be ANGRY in copy without being unprofessional. DR's voice rules are too restrained for moments like this.
- **External voice (quoted partner)** — pulls in authority/celebrity capital. We could support an optional "external_quote" field on testimony slides.
- **Comment-as-CTA leverages the IG algorithm** — engagement = reach. Different muscle than "link in bio".


### Post 2: "Wondering how to perform Eid prayers?" carousel (Eid al-Adha 1447AH)

**Format**: 8-slide carousel, religious explainer
**Cover slide**: cinematic motion-blurred photo of a man kneeling in worship, surrounded by standing figures in white thobes. Title in white **serif italic** ("Wondering how to perform Eid prayers?" with "Eid prayers?" italicised for emphasis). Tiny eyebrow top-left: "Eid al-Adha 1447AH · @islamicreliefuk". A small "Here's how" tag with a swipe icon at the bottom.

**Copy**:
- "Eid Mubarak! 🌙"
- "Here's our guide on Eid prayers. From, how to pray Eid prayers to what the Takbeerat is, we've got you covered. 🤲🏽"
- "May Allah SWT accept all of our worship. We pray that you have a wonderful day celebrating with your loved ones!"

**What to steal:**
- **Serif italics for contemplative/religious content** — Bowlby is wrong for this register. The packet renderer should support a secondary display face (Lora or Playfair Display Italic) for `quiet_dignity` arc and festival/religious posts.
- **Cinematic dim photography with motion blur** — shows life/movement while preserving reverence. Distinct from our current "clean photo + chunky headline" stack.
- **Hijri calendar dating** — "Eid al-Adha 1447AH" is culturally specific signalling. The packet could use Hijri date alongside Gregorian for religious moments.
- **Explainer carousel format** — different from appeal carousel. No tiers, no CTA. Just useful information. DR could repurpose this for "how to give Zakat", "what is Sadaqah Jariyah", etc.
- **Swipe-cue tag on cover slide** — small "Here's how →" prompt teaches the reader to swipe. Lifts engagement.


## @pennyappeal — 3.8K followers, UK Muslim charity

### Post: "GAZA EMERGENCY" reel (38 likes, March 2025)

- Reel with shaky-cam aid forklift
- Centered "GAZA / EMERGENCY" — orange brand wordmark + white display + orange display
- Bottom strip: "DONATE NOW ▶ PENNYAPPEAL.ORG · 📞 03000 11 11 11" (phone number CTA)
- Caption: "🚛On the ground, making an impact. / 🧡Here we are, travelling into Gaza, with some life-saving packs... / 📺Send your support to Palestine."

**What to learn:** PA's heavy-brand-orange + urgency-theatre approach UNDERPERFORMS (38 likes vs IR's 9.2K). Confirms that editorial photojournalism > over-branded crisis billboards. **Negative finding** — don't do this.

---

## @muslimhandsuk — 95.7K followers

### Post: "YOUR QURBANI in NIGER" portrait (6 likes, 7 hours old)

**Visual**:
- Ground-level portrait of an elderly Niger man, white skullcap, blue shirt, gentle smile
- Holding a Muslim Hands branded plastic bag (visible logo — proof of delivery)
- Terracotta wall background — cultural specificity
- Display type "YOUR QURBANI in NIGER" — all-caps condensed sans, white, top-third positioned, doesn't block face
- Hierarchy: "YOUR" small, "QURBANI" huge, "IN NIGER" medium

**Copy**: Two sentences. The image carries it.
- "Your sacrifices are feeding vulnerable families in Niger! 💙"
- "May Allah (swt) accept your Qurbani and reward you, amin! 🤲"

**What to steal:**
- **"YOUR" possessive opener** — implicates the donor as agent ("YOUR sacrifices", "YOUR Qurbani"). Much stronger than "Help families" passive. The Stage 1 prompt should encourage second-person possessive framing where it fits.
- **Type positioned to respect the subject's face** — the photographer + designer collaborated. Photo composition leaves space for type. Our generator should consider this when picking media.
- **Branded aid visible in beneficiary's hand** — proof of delivery without sanctimony. We should encourage this in DR's library tagging — flag photos showing DR-branded aid in beneficiaries' hands.
- **Spare copy** — two sentences. The image does the work. DR's caption discipline should match.

---

## @charitywater — 528K followers, aspirational tier

### Post: "HI, WE'RE CHARITY: WATER" reel (1.5K likes, brand identity)

**Visual**:
- Cinematic close-up reel of a boy drinking from a glass of water; soft lens flares; eyes looking up
- Yellow hand-painted brush script overlay: "HI, / WE'RE / CHARITY: WATER" (stacked)
- White sans-serif sub-text: "If we lost you at charity, we get it." (self-aware!)

**Caption — masterclass manifesto chapter structure**:
> New here? Nice to meet you. We're charity: water and we're on a mission to end the global water crisis. Here's a few things that make us, us…
>
> **We believe in giving 100%.**
> That means when you donate to charity: water, 100%, every single penny, goes directly to funding clean water projects.
>
> **We always keep the receipts.**
> Since the beginning, charity: water donations have come with GPS coordinates, photos and stories about completed projects and community updates.
>
> **We love making an impact.**
> In the last 18 years, charity: water supporters have brought clean water to over 20 million people through 171,000 projects in 29 countries!
>
> **We know that water changes everything.** Join us at charitywater.org.

**What to steal:**
- **Manifesto chapter pattern** — "We believe X. That means Y." — each chapter = one short declarative claim + one sentence of specific proof. Reusable across packet generation. This pattern translates beautifully to a 4-slide carousel where each slide IS one chapter.
- **Self-aware voice** — "If we lost you at charity, we get it" — acknowledges donor skepticism. DR's voice could afford this kind of meta-humour for brand-identity moments (less so for emergency appeals).
- **Specifics replace claims** — "GPS coordinates, photos and stories" / "20 million people through 171,000 projects in 29 countries" — every claim has granular proof. The Stage 3 critique should flag generic charity-claims and demand specifics.
- **Hand-painted script for warmth** — Caveat is in our stack but underused. Should be the lead voice for "we're DR" moments, not just eyebrows.
- **"Transparency Tuesday" / "Journal" / "Stream" highlights** — they make trust + meta-content a content category. Worth considering for DR's IG story strategy.
- **Cinematic close-up over wide-shot** — children's faces, water in motion, soft lens flares. The shallow depth + light play feels premium without being slick.


## @wckitchen — 865K followers, aspirational tier (food + frontline humanitarian)

### Post: "What is WCK's mission?" carousel (525 likes, 11 May)

**Visual**:
- Cover slide: overhead shot looking down at a circle of hands holding WCK-branded orange paper plates around a huge dish of saffron rice. Hands + food + plates form a radial composition. Brand props (the paper plates) ARE the visual.
- White lowercase sans-serif: "What is WCK's mission?"
- "Goal #1:" in WCK orange, then white text "Move quickly and be first to the frontlines to feed people in need after disaster strikes"
- "Goal #2:" orange + white "Fuel community recovery so they can keep going after we leave"

**Caption** — long, honest:
> WCK's mission is simple: move quickly, feed people in need, and fuel community recovery after disaster strikes. To reach those goals, we work alongside local partners who know their communities best and equip them to support their neighbors both in the moment and after we leave. Take a look at how a WCK response works and how we reach people in need with warm, nourishing meals. #ChefsForTheWorld

**What to steal:**
- **Overhead food photography** — WCK's signature angle. Looking DOWN at hands working creates intimacy + scale at once. DR could adopt this angle for food-distribution photography.
- **Numbered chapter / "Goal #N" format** — works as a multi-slide carousel where each goal = one slide. More pragmatic than Charity:Water's manifesto but functions the same way.
- **Lowercase sans-serif for friendly tone** — "What is WCK's mission?" vs an all-caps Bowlby. DR could deploy lowercase + sans for "warmer" beats.
- **"After we leave" voice** — open acknowledgment that they're temporary partners, not saviors. Dignified self-positioning.
- **Brand props as design language** — WCK's paper plates are themselves the visual identity. DR's equivalent could be the white logo wordmark + orange t-shirts on field volunteers — make those visual constants.
- **Active comments** — WCK doesn't disable comments even on Gaza-related posts. Pushback ("Why would you close kitchens in Gaza?") gets engaged. Trust.

---

## @chooselove — 627K followers, activist-charity hybrid

### Grid observations (no single-post deep dive — they all riff on the same visual register)

**Brand**: refugee support / displaced people. Bio: "🌍Supporting refugees & displaced people globally / ❤️Changing the world with love / ⬇️Sign up to our mailing list"

**Highlights are explicit politics**: "Stop the Genocide Now", "We cannot normalise what is happening in Sudan", "No Human Is Illegal", "Merch 💕"

**Visual language**:
- Brand palette: black + pink + red + cream — protest-poster aesthetic
- Headlines read like protest signs: "NO HUMAN IS ILLEGAL", "THIS IS NOT A CEASEFIRE"
- Heavy uppercase + serif/sans contrast
- Real protest/march photography embedded in the work
- Satirical-headline framing: "BREAKING: TOMMY ROBINSON IS FUNDRAISING FOR REFUGEES" (using anti-immigration figure's name in ironic context for engagement)
- Merch as content category

**What to steal (carefully):**
- **Activist register IS a valid mode** — Choose Love has shown a charity can wear activist clothes and grow to 627K followers. DR's Palestine + Sudan content could borrow this energy for specific moments (NOT general — DR's broader voice should remain humanitarian-aid not activist-movement).
- **Headlines as protest signs** — short, declarative, uppercase, often confrontational. The packet generator could support an `activist_headline` mode for events where the right register IS confrontational.
- **Visual identity from the protest aesthetic** — bold red/black contrast. Worth knowing but probably not for DR's broader palette.
- **Negative finding**: this register is high-risk for DR. It works for Choose Love because their whole brand IS a movement. DR's brand is humanitarian-aid first — we shouldn't wholesale copy this.

---

# Synthesis — what to change in the packet generator

## Finding 1: ONE template for design is wrong. DR's own brand flexes across 4 modes.

DR's own Instagram uses at least 4 distinct visual languages depending on post purpose. Our generator was emulating only one (the "INTRODUCING…" educational mode). **The packet generator needs to pick visual mode by strategy_brief.arc, not default to a single template.**

Proposed mapping:
| Arc | Visual mode | Type face | Photo treatment | Reference |
|---|---|---|---|---|
| `evidence` | Typography-led editorial | Bowlby SC + Caveat | Optional, supporting | DR INTRODUCING series + Islamic Relief "Sudan is in Crisis" |
| `hero_image` | Magazine cover | Lora/Playfair italic + DM Sans | Photo full-bleed | Islamic Relief Eid prayers, Muslim Hands "YOUR QURBANI in NIGER" |
| `quiet_dignity` | Witness photojournalism | Light sans, minimal type | Photo dominant, type small | Charity:Water "HI, WE'RE CHARITY: WATER" |
| `testimony` | Quote-led with attribution | Caveat opener + serif body | Subject portrait | Islamic Relief @ziasalik quote post |
| `before_after` | Comparison split | Display sans | Two-photo grid | DR Qurbani pricing |
| `awareness_petition` | Activist headline | Heavy uppercase | Optional, supporting | Choose Love "NO HUMAN IS ILLEGAL" |
| `manifesto` | Numbered chapters | Sans + accent colour | Overhead/cinematic | Charity:Water manifesto + WCK "Goal #1, #2, #3" |

## Finding 2: The schema needs new arcs.

Add to `StrategyBriefSchema.arc`:
- `awareness_petition` — for non-monetary call-to-action posts (signature, comment, share)
- `manifesto` — for brand-identity / mission-statement posts using the "We believe X. That means Y." pattern

## Finding 3: Tier descriptions need specifics, not generic charity-speak.

Already partly captured in Phase 4n-ii Stage 3 checklist. Reinforce: "rice + dahl + cooking oil for six people" beats "food for a family". Mention named items, weights, durations.

## Finding 4: "YOUR" as possessive opener — second-person possessive framing.

Muslim Hands' "YOUR QURBANI in NIGER" / "YOUR sacrifices" is consistently stronger than passive "Help families". Stage 1 prompt should encourage second-person possessive framing for the donor's relationship to the cause.

## Finding 5: Photography needs library tags for SUBJECT ANGLE.

The vision re-tagger should propose a new tag dimension: `composition_angle` ∈ {overhead, ground-level, eye-level, portrait, wide-environmental}. This lets the generator pick angle to match arc (overhead → manifesto; portrait → testimony; wide-environmental → evidence).

## Finding 6: Long, honest captions beat short urgency.

WCK + Charity:Water both write 100+ word captions with substantive content. Penny Appeal writes 20 words with emoji-heavy urgency. The engagement gap matches.

Stage 1 should set caption length by arc:
- `evidence` / `awareness_petition` — short (~140 chars), punchy lead
- `quiet_dignity` / `manifesto` / `testimony` — longform (200-400 chars), chapter-structured

## Finding 7: Manifesto chapter pattern is reusable.

"We believe X. That means Y." — short claim + sentence of specific proof — works as caption structure AND as a 4-slide carousel (one chapter per slide). Add `manifesto_chapters` as an optional schema field; if present, the generator renders one slide per chapter.

## Finding 8: Comment-as-CTA leverages the IG algorithm.

Islamic Relief's "Comment 'PETITION' and we'll DM you a link" generated 9.2K likes. The action mechanism is itself algorithmic catnip. The packet should support a `cta_mechanism` enum:
- `link_in_bio` (current default)
- `comment_keyword` (e.g. "Comment PETITION")
- `phone` (older donors, like Penny Appeal's 0300...)
- `share` (awareness multiplication)

## Finding 9: Editorial serif italic display for contemplative content.

Bowlby One SC is correct for chunky/factual moments. WRONG for religious, contemplative, or quiet-dignity content. We need a secondary display face — **Lora Italic** or **Playfair Display Italic** — for those modes. Already partly in our stack (Lora exists) but the renderer currently defaults to Bowlby.

## Finding 10: Aspirational charities make TRUST a content category.

Charity:Water has a "Transparency" highlight. They put "We always keep the receipts. GPS coordinates, photos, stories" prominently in brand identity posts. Trust is a content pillar, not a footer disclaimer.

For DR's packet: add an optional `proof_paragraph` to brand-identity packets ("Since 2013, we've...") AND in the credibility-building section of every emergency appeal email.

---

# Concrete next steps for the codebase

1. **Schema**: extend `StrategyBriefSchema.arc` enum to include `awareness_petition`, `manifesto`. Extend per-slide `layout` to include `chapter` (numbered manifesto-style).
2. **Renderer**: add Lora Italic as a loaded font alongside Bowlby. Switch type face per slide based on layout + arc.
3. **Stage 1 prompt**: include the arc → visual-mode mapping table. Force Stage 1 to articulate which mode applies and why.
4. **Stage 1 prompt**: encourage second-person possessive framing ("YOUR sacrifices", "YOUR Qurbani") where it fits.
5. **Stage 3 critique**: add checks for (a) generic-charity-speak in tier descriptions, (b) caption-too-short for the arc's expected length, (c) missing specifics where claims are made.
6. **Library re-tagger schema**: add `composition_angle` field to `MediaTagSuggestionsSchema`. Update the system prompt with the new dimension.
7. **Packet schema**: optional `cta_mechanism` field on packet — `link_in_bio` (default) | `comment_keyword` | `phone` | `share`.
8. **Packet schema**: optional `manifesto_chapters` field — when present, generator renders one slide per chapter.
