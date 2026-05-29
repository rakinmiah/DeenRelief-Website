/**
 * GET /api/admin/first-response/:id/slide/:index — render a single
 * launch-packet carousel slide as a 1080×1080 PNG.
 *
 * Design system sourced from a live audit of @deenrelief's actual
 * designed Instagram posts (the "INTRODUCING…" series + Qurbani 2026
 * appeal). Key visual rules captured from the real brand:
 *
 *   • Deep forest-green field — #1F4D3B. NOT cream. The hero canvas.
 *   • White brand chip top-left — "Deen Relief™" wordmark + tagline,
 *     posted-stamp style. Anchors every slide to DR identity.
 *   • Eyebrow in Caveat brush script — "INTRODUCING…" was DR's go-to
 *     opener; we adapt it to "EMERGENCY APPEAL · {date}" etc.
 *   • Display titles in Bowlby One SC — heavy rounded uppercase, the
 *     closest free Google Font to DR's chunky display face. This is
 *     the dominant visual move.
 *   • Body / supporting copy in DM Sans Bold UPPERCASE, tight tracking.
 *   • Amber/gold accent (#E0A636) for prices + emphasis — matches the
 *     Qurbani 2026 pricing treatment.
 *   • Decorative four-point sparkles flanking type — DR uses these
 *     liberally on the educational series.
 *   • CTA slide is INVERTED — cream background, green type, red
 *     accent — mirrors the Eid Mubarak / festival aesthetic for the
 *     closing emotional beat.
 *
 * Auth: requireAdminSession (admin or social role). Anyone else 307s
 * to /admin/login.
 */

import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/admin-session";
import { getLogoDataUri } from "@/lib/brand-assets";
import {
  getExternalImageryDataUri,
  listImageryForEvent,
  markImagerySelected,
} from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  pickBestCandidateForEvent,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { getCandidateMediaForEvent, getMediaById } from "@/lib/media-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLIDE_SIZE = 1080;
/** Upper bound on slide index — actual count is read from the packet
 *  at request time (3–8 per strategy_brief.slide_count). This is the
 *  hard ceiling for input validation. */
const MAX_SLIDE_COUNT = 8;

// DR brand palette — sampled visually from real Instagram posts.
// Kept inline rather than imported from Tailwind config: Satori
// processes a subset of CSS that doesn't include Tailwind variables.
const DR = {
  forest: "#1F4D3B",       // hero background, primary brand green
  forestDeep: "#163827",   // shadow / deeper accents on dark slides
  cream: "#F7F3E8",        // warm off-white text + CTA slide background
  creamSoft: "#F7F3E8B8",  // ~72% — for secondary copy on green
  amber: "#E0A636",        // pricing accent + CTA highlights
  amberDeep: "#B97F23",    // pressed/contrast variant
  red: "#C0392B",          // "Donate now" emphasis (matches Eid posts)
  white: "#FFFFFF",
  hairlineLight: "#F7F3E833", // 20% cream — dividers on green
  hairlineDark: "#1F4D3B22",  // ~13% green — dividers on cream
} as const;

/* ─── Font loading ────────────────────────────────────────────────── */
/**
 * Google Fonts content-negotiates on User-Agent: a modern UA returns
 * WOFF (Satori can't decode), absent/unknown UA returns TTF. We rely
 * on Node's default fetch UA (unidentified by Google's classifier) to
 * stay on the TTF path. Fonts are memoised per-process — the same
 * Vercel function instance serves many slide requests, no point
 * re-downloading.
 */
const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(cssUrl).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!match || !match[1]) {
      throw new Error(
        `Could not extract TTF font URL for ${family} ${weight}. ` +
          `Response preview: ${css.slice(0, 200)}`
      );
    }
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) {
      throw new Error(`Font fetch failed (${family} ${weight}): ${fontRes.status}`);
    }
    return fontRes.arrayBuffer();
  })();
  fontCache.set(key, promise);
  return promise;
}

/**
 * Same shape as loadGoogleFont but fetches the italic variant.
 * Google Fonts encodes italic in the URL as `ital,wght@1,{weight}`.
 * Used for Lora Italic (the secondary display face introduced in
 * Phase 4p for contemplative arcs).
 */
function loadGoogleFontItalic(
  family: string,
  weight: number
): Promise<ArrayBuffer> {
  const key = `${family}:${weight}:italic`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@1,${weight}`;
    const css = await fetch(cssUrl).then((r) => r.text());
    const match = css.match(
      /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/
    );
    if (!match || !match[1]) {
      throw new Error(
        `Could not extract TTF italic URL for ${family} ${weight}. ` +
          `Response preview: ${css.slice(0, 200)}`
      );
    }
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) {
      throw new Error(
        `Italic font fetch failed (${family} ${weight}): ${fontRes.status}`
      );
    }
    return fontRes.arrayBuffer();
  })();
  fontCache.set(key, promise);
  return promise;
}

/**
 * Phase 4p — pick the display font per slide based on the packet's
 * narrative arc + the slide's layout. Bowlby is the chunky factual
 * default; Lora Italic is the contemplative / witness / quote
 * register sourced from the social audit (Islamic Relief's Eid
 * prayers cover slide, Charity:Water's manifesto chapter type).
 *
 *   • Layout-driven (always wins): testimony + chapter slides → Lora
 *   • Arc-driven: quiet_dignity + manifesto packets → Lora across
 *     all non-tiers / non-cta slides
 *   • Everything else → Bowlby
 *
 * Returns the inline `fontFamily` string the body components write
 * into their style props.
 */
function displayFontFor(
  arc: LaunchPacket["strategy_brief"]["arc"],
  layout: LaunchPacket["carousel_slides"][number]["layout"],
  loraAvailable: boolean
): "Bowlby One SC" | "Lora" {
  // Lora failed to load → degrade to Bowlby across the board.
  if (!loraAvailable) return "Bowlby One SC";
  // Phase 5a — Lora is restricted to slides DESIGNED for it. The
  // arc-driven propagation to fact / response slides was causing
  // Lora italic to surface where Bowlby's chunky declarative voice
  // belongs (e.g. "4,000 PEOPLE AT RISK" on a fact slide). Now
  // testimony + chapter are the only layouts that use Lora.
  if (layout === "testimony" || layout === "chapter") return "Lora";
  return "Bowlby One SC";
}

/* ─── Route handler ───────────────────────────────────────────────── */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  await requireAdminSession();
  const { id, index: indexStr } = await params;
  const index = Number.parseInt(indexStr, 10);
  if (!Number.isFinite(index) || index < 0 || index >= MAX_SLIDE_COUNT) {
    return new Response(`Slide index must be 0..${MAX_SLIDE_COUNT - 1}.`, {
      status: 400,
    });
  }

  const event = await getEmergencyEventById(id);
  if (!event) return new Response("Event not found.", { status: 404 });
  if (!event.draftPacketJson) {
    return new Response(
      "This event has no draft packet yet — generate one first.",
      { status: 400 }
    );
  }
  const parsed = LaunchPacketSchema.safeParse(event.draftPacketJson);
  if (!parsed.success) {
    return new Response(
      "Stored packet doesn't match the current schema — redraft it.",
      { status: 422 }
    );
  }
  const packet = parsed.data;
  let slide = packet.carousel_slides[index];
  if (!slide) {
    return new Response("Slide missing from packet.", { status: 422 });
  }

  // RENDER-TIME HERO PHOTO ENFORCEMENT (Phase 4q belt-and-braces).
  // If the stored packet has a hero slide with no media_id (because it
  // was generated under old code, or Stage 2 + Stage 3 + the post-pass
  // all somehow failed to assign one), enforce a photo right now.
  // Re-queries the candidate pool the same way the generator does and
  // picks the best fit. This is per-render — the stored packet is not
  // mutated — but the SMM sees the photo regardless.
  if (slide.layout === "hero" && !slide.media_id) {
    try {
      const [drCands, extCands] = await Promise.all([
        getCandidateMediaForEvent({
          countryIso: event.countryIso,
          eventType: event.eventType,
          campaignSlugs: event.matchedCampaigns,
          limit: 12,
        }),
        listImageryForEvent(event.id),
      ]);
      const best = pickBestCandidateForEvent(event, drCands, extCands);
      if (best) {
        console.warn(
          `[slide ${index}] render-time hero enforcement: stored media_id was null, assigning ${best.id} (${best.reason}) with logo=${best.logoVariant}`
        );
        slide = {
          ...slide,
          media_id: best.id,
          logo_variant: best.logoVariant,
        };
      }
    } catch (err) {
      console.warn(
        `[slide ${index}] render-time hero enforcement failed (non-fatal):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Resolve the slide's chosen media. media_id is prefixed:
  //   • 'dr:<uuid>'   → DR's media_library
  //   • 'ext:<uuid>'  → external_imagery (third-party verified)
  // Either path inlines the image bytes as a data URI (Satori
  // workaround) and exposes a creditText when the source is external.
  let mediaDataUri: string | null = null;
  let creditText: string | null = null;

  if (slide.media_id?.startsWith("dr:")) {
    const drId = slide.media_id.slice(3);
    const media = await getMediaById(drId);
    if (media && !media.archivedAt) {
      try {
        const imgRes = await fetch(media.publicUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const mimeType =
            imgRes.headers.get("content-type") ??
            media.mimeType ??
            "image/jpeg";
          mediaDataUri = `data:${mimeType};base64,${Buffer.from(buf).toString("base64")}`;
          console.log(
            `[slide ${index}] inlined DR media ${drId} (${buf.byteLength}B)`
          );
        }
      } catch (err) {
        console.error(`[slide ${index}] DR media fetch exception:`, err);
      }
    }
  } else if (slide.media_id?.startsWith("ext:")) {
    const extId = slide.media_id.slice(4);
    const ext = await getExternalImageryDataUri(extId);
    if (ext) {
      mediaDataUri = ext.dataUri;
      creditText = ext.creditText;
      // Mark as selected so we can analytics-track which sources
      // produce the most-used imagery vs noise.
      await markImagerySelected(extId);
      console.log(
        `[slide ${index}] inlined external imagery ${extId} · "${ext.creditText.slice(0, 40)}"`
      );
    }
  }

  if (slide.media_id && !mediaDataUri) {
    console.warn(
      `[slide ${index}] slide.media_id=${slide.media_id} did not resolve to bytes`
    );
  }

  // Five fonts + both brand logo variants in parallel. Lora Italic
  // was added in Phase 4p (audit findings) for contemplative arcs
  // (quiet_dignity, testimony, manifesto chapters) where Bowlby's
  // chunky display register is wrong.
  //
  // CRITICAL: Lora is treated as OPTIONAL. The Google Fonts CSS2
  // endpoint occasionally fails to expose a TTF for a specific
  // ital,wght combination, which would throw in Promise.all and
  // kill the entire slide render. We wrap Lora's load and fall back
  // to null on failure — the body components see no Lora in the
  // fonts list and Satori uses Bowlby (or its own default) instead.
  // Strictly worse aesthetically but the route stays up.
  const [bowlby, dmBold, dmReg, caveat, loraItalic, logoOnLight, logoOnDark] =
    await Promise.all([
      loadGoogleFont("Bowlby One SC", 400),
      loadGoogleFont("DM Sans", 700),
      loadGoogleFont("DM Sans", 400),
      loadGoogleFont("Caveat", 600),
      loadGoogleFontItalic("Lora", 600).catch((err) => {
        console.warn(
          `[slide] Lora italic load failed, falling back to Bowlby everywhere: ${err instanceof Error ? err.message : err}`
        );
        return null as ArrayBuffer | null;
      }),
      getLogoDataUri("logo-on-light"),
      getLogoDataUri("logo-on-dark"),
    ]);

  // Surface what got loaded so logos that DIDN'T resolve show up
  // clearly in Vercel function logs. Most common cause when one is
  // null: SMM uploaded both files under the same variant name.
  console.log(
    `[slide ${index}] logo-on-light: ${
      logoOnLight ? `${logoOnLight.mimeType}` : "null"
    } · logo-on-dark: ${
      logoOnDark ? `${logoOnDark.mimeType}` : "null"
    } · slide.layout=${slide.layout}`
  );

  try {
    return new ImageResponse(
      <SlideContent
        slide={slide}
        packet={packet}
        mediaUrl={mediaDataUri}
        creditText={creditText}
        logoOnLight={logoOnLight?.dataUri ?? null}
        logoOnDark={logoOnDark?.dataUri ?? null}
        loraAvailable={loraItalic != null}
      />,
      {
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        fonts: [
          { name: "Bowlby One SC", data: bowlby, weight: 400, style: "normal" as const },
          { name: "DM Sans", data: dmBold, weight: 700, style: "normal" as const },
          { name: "DM Sans", data: dmReg, weight: 400, style: "normal" as const },
          { name: "Caveat", data: caveat, weight: 600, style: "normal" as const },
          ...(loraItalic
            ? [
                {
                  name: "Lora",
                  data: loraItalic,
                  weight: 600 as const,
                  style: "italic" as const,
                },
              ]
            : []),
        ],
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `inline; filename="slide-${index + 1}.png"`,
        },
      }
    );
  } catch (err) {
    // Surface render errors as a plain-text 500 with the message so
    // they show up in Vercel function logs AND as a debuggable hint
    // when the SMM right-clicks the broken image. Without this Satori
    // failures get swallowed and the slot just shows alt text.
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[slide ${index}] ImageResponse threw: layout=${slide.layout} logo_variant=${slide.logo_variant} media_id=${slide.media_id ?? "null"} — ${message}`
    );
    return new Response(`Slide render failed: ${message}`, { status: 500 });
  }
}

/* ─── Slide composition ───────────────────────────────────────────── */

type Slide = LaunchPacket["carousel_slides"][number];

function SlideContent({
  slide,
  packet,
  mediaUrl,
  creditText,
  logoOnLight,
  logoOnDark,
  loraAvailable,
}: {
  slide: Slide;
  packet: LaunchPacket;
  mediaUrl: string | null;
  /** Attribution string when the resolved media is external (Wikimedia,
   *  NASA, etc.). Null for DR-library media (no extra credit required —
   *  it's our own imagery). Rendered as a small italic line bottom-right
   *  of the slide so the legal/license obligation is always visible but
   *  doesn't compete with the headline. */
  creditText: string | null;
  logoOnLight: string | null;
  logoOnDark: string | null;
  /** False when the Lora Italic load failed at the route entry point.
   *  When false, displayFontFor returns Bowlby everywhere so the route
   *  still renders something — graceful degradation. */
  loraAvailable: boolean;
}) {
  // CTA slide flips to a cream canvas with green type + red emphasis,
  // mirroring the Eid Mubarak / festival treatment — gives the closing
  // beat emotional warmth instead of more dark intensity.
  const isCta = slide.layout === "cta";
  // Phase 4v — fact slides can now carry media, joining hero /
  // response / testimony. Stat / tiers / cta / chapter stay
  // typography-only by design (the focal element is the number /
  // price ladder / claim, not a photo).
  const photoEligibleLayouts: Slide["layout"][] = [
    "hero",
    "response",
    "fact",
    "testimony",
  ];
  const hasPhoto =
    !isCta &&
    mediaUrl != null &&
    photoEligibleLayouts.includes(slide.layout);
  const slideIndex = packet.carousel_slides.indexOf(slide) + 1;
  const slideTotal = packet.carousel_slides.length;

  // Photo slides get a fundamentally different layout — magazine-cover
  // style with the photo full-bleed on top and a solid green text
  // panel anchoring the bottom. Far more legible + visually striking
  // than tinting the photo with a green overlay, which washes out the
  // imagery and makes text hard to read against arbitrary backgrounds.
  if (hasPhoto) {
    // Per-slide logo variant comes from Claude's Stage 2 choice
    // (reviewed in Stage 3) OR from the render-time enforcement's
    // luminance-derived pick (Phase 4t):
    //   'green' = logo-on-light variant (green wordmark)
    //   'white' = logo-on-dark variant (white wordmark)
    const photoLogo =
      slide.logo_variant === "green" ? logoOnLight : logoOnDark;
    // Composition mode (Phase 4t) — Claude picks based on photo
    // aspect + subject placement. Defaults to panel_below.
    const composition = slide.photo_composition ?? "panel_below";
    const focalPoint = slide.photo_focal_point ?? "center";

    // Phase 4x — briefing flag for the editorial eyebrow swap on
    // photo slide variants. Manifesto keeps the Caveat brush; every
    // other arc gets the editorial small-caps treatment.
    const photoBriefing = packet.strategy_brief.arc !== "manifesto";
    // Phase 5d — Claude's per-slide logo_position pick (added to the
    // schema in 5a, but the renderer was hardcoded to top_left). Now
    // honoured everywhere a logo lands on a photo.
    const logoPos: LogoPosition = slide.logo_position ?? "top_left";
    if (composition === "panel_right") {
      return (
        <PhotoSlideRightPanel
          slide={slide}
          mediaUrl={mediaUrl}
          creditText={creditText}
          slideIndex={slideIndex}
          slideTotal={slideTotal}
          logoOnPhoto={photoLogo}
          focalPoint={focalPoint}
          briefing={photoBriefing}
          logoPosition={logoPos}
        />
      );
    }
    if (composition === "full_bleed_overlay") {
      return (
        <PhotoSlideFullBleed
          slide={slide}
          mediaUrl={mediaUrl}
          creditText={creditText}
          slideIndex={slideIndex}
          slideTotal={slideTotal}
          logoOnPhoto={photoLogo}
          focalPoint={focalPoint}
          briefing={photoBriefing}
          logoPosition={logoPos}
        />
      );
    }
    return (
      <PhotoSlide
        slide={slide}
        mediaUrl={mediaUrl}
        creditText={creditText}
        slideIndex={slideIndex}
        slideTotal={slideTotal}
        logoOnPhoto={photoLogo}
        focalPoint={focalPoint}
        briefing={photoBriefing}
        logoPosition={logoPos}
      />
    );
  }

  // Typography-only path. CTA flips to cream only on the warmer
  // 'manifesto' arc (preserves the festival-style Eid Mubarak treatment
  // DR uses on brand-identity posts); emergency arcs keep the forest
  // canvas so the carousel reads as one continuous news briefing.
  const briefingMode = packet.strategy_brief.arc !== "manifesto";
  const ctaCream = isCta && !briefingMode;
  const bg = ctaCream ? DR.cream : DR.forest;
  const fg = ctaCream ? DR.forest : DR.cream;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        padding: 64,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {/* Brand logo — position-aware (Phase 5d). Per-slide logo_variant
          comes from Stage 2/3 — Claude picked it for THIS slide's
          background. Typography-only slides default to white on forest,
          green on cream (CTA), matching the slide bg colour. */}
      <BrandChip
        inverted={ctaCream}
        logoDataUri={slide.logo_variant === "green" ? logoOnLight : logoOnDark}
        position={slide.logo_position ?? "top_left"}
      />

      {/* Slide-number pip top-right. Tiny visual progress indicator. */}
      <SlidePip current={slideIndex} total={slideTotal} fg={fg} />

      {/* Phase 4u — sparkles dropped on emergency arcs (the audit
          captured them from the educational INTRODUCING series; on
          actual disaster coverage they read as charity-event-flyer).
          Manifesto arc keeps the warmer ornamental treatment. */}
      {packet.strategy_brief.arc === "manifesto" && (
        <SparkleField inverted={isCta} />
      )}

      {/* Main composition switches on layout. displayFont comes from
          packet.strategy_brief.arc + slide.layout — Bowlby for chunky
          factual slides, Lora Italic for contemplative ones (when the
          Lora font actually loaded). */}
      <SlideBody
        slide={slide}
        fg={fg}
        isCta={isCta}
        displayFont={displayFontFor(
          packet.strategy_brief.arc,
          slide.layout,
          loraAvailable
        )}
        arc={packet.strategy_brief.arc}
        ctaKind={packet.cta_kind ?? "donate"}
        fallbackHashtags={packet.social_post.hashtags}
      />

      {/* Footer — source attribution, URL on CTA, hairline divider. */}
      <SlideFooter slide={slide} fg={fg} isCta={isCta} />
    </div>
  );
}

/* ─── Photo slide (magazine-cover layout) ────────────────────────── */

/**
 * Used for hero + response slides that have a media_id selected.
 * Layout: photo full-bleed on top (~62% of slide height), solid dark
 * green text panel anchoring the bottom (~38%). No overlay on the
 * photo — clean imagery as DR uses on their actual Instagram posts.
 *
 * The text panel hosts the eyebrow + title + body, sized to fit the
 * shorter vertical space (Title font scaled down vs the typography-
 * only hero). Footer info (source/URL/charity#) sits inside the panel
 * too rather than at slide-edge.
 */
function PhotoSlide({
  slide,
  mediaUrl,
  creditText,
  slideIndex,
  slideTotal,
  logoOnPhoto,
  focalPoint,
  briefing,
  logoPosition,
}: {
  slide: Slide;
  mediaUrl: string;
  /** Non-null only when this photo came from an external (third-party)
   *  source — we render a discreet attribution strip along the bottom
   *  edge of the photo. CC-BY licensing mandates visible credit. */
  creditText: string | null;
  slideIndex: number;
  slideTotal: number;
  /** Green/dark logo variant — used directly on the photo (no chip).
   *  DR uses the green wordmark on their own photo posts. */
  logoOnPhoto: string | null;
  /** Vertical anchor for object-position so cropping doesn't cut off
   *  faces. Phase 4t — picked by Claude from the vision thumbnail. */
  focalPoint: "top" | "center" | "bottom";
  /** Phase 4x — editorial eyebrow for non-manifesto arcs. */
  briefing: boolean;
  /** Phase 5d — Claude's per-slide logo placement pick. */
  logoPosition: LogoPosition;
}) {
  const PHOTO_HEIGHT = 670; // ~62% of 1080
  const PANEL_HEIGHT = SLIDE_SIZE - PHOTO_HEIGHT;
  const objPos = `center ${focalPoint}`;

  return (
    <div
      style={{
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        display: "flex",
        flexDirection: "column",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {/* ─── Photo half (top) — clean, no overlay ─── */}
      <div
        style={{
          width: SLIDE_SIZE,
          height: PHOTO_HEIGHT,
          display: "flex",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          width={SLIDE_SIZE}
          height={PHOTO_HEIGHT}
          style={{
            width: SLIDE_SIZE,
            height: PHOTO_HEIGHT,
            objectFit: "cover",
            objectPosition: objPos,
          }}
        />
        {/* Green logo directly on the photo — no chip wrapper.
            Phase 5d: position honours slide.logo_position so the brand
            doesn't crash into the subject's face. */}
        <BrandChip
          inverted={false}
          logoDataUri={logoOnPhoto}
          position={logoPosition}
        />
        {/* Slide pip — wrapped in a small dark green chip for legibility
            against arbitrary photo backgrounds. The existing SlidePip
            component assumes a single foreground colour; the wrap gives
            us a guaranteed dark background to put cream pips on. */}
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 44,
            display: "flex",
            backgroundColor: "rgba(22, 56, 39, 0.85)",
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: 999,
            alignItems: "center",
            gap: 6,
          }}
        >
          {Array.from({ length: slideTotal }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: i + 1 === slideIndex ? 20 : 8,
                height: 8,
                backgroundColor: DR.cream,
                opacity: i + 1 === slideIndex ? 1 : 0.45,
                borderRadius: 4,
              }}
            />
          ))}
        </div>

        {/* Attribution strip — only when the photo is third-party.
            CC-BY/CC0/Public Domain licensing requires visible credit on
            display. Rendered along the bottom edge of the photo as a
            slim translucent pill so it reads cleanly without competing
            with the headline below. */}
        {creditText && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              right: 18,
              display: "flex",
              backgroundColor: "rgba(22, 56, 39, 0.78)",
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 4,
              maxWidth: 760,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 14,
                color: DR.cream,
                opacity: 0.92,
                letterSpacing: 0.3,
              }}
            >
              {creditText}
            </div>
          </div>
        )}
      </div>

      {/* ─── Text panel (bottom) — solid dark green ─── */}
      <div
        style={{
          width: SLIDE_SIZE,
          height: PANEL_HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.forest,
          paddingTop: 36,
          paddingBottom: 32,
          paddingLeft: 56,
          paddingRight: 56,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {slide.eyebrow && (
            <PhotoEyebrow text={slide.eyebrow} briefing={briefing} />
          )}
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: photoSlideTitleSize(slide.title.length),
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.0,
            }}
          >
            {slide.title}
          </div>
          {slide.body && (
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 22,
                color: DR.cream,
                opacity: 0.82,
                textTransform: "uppercase",
                letterSpacing: 1,
                lineHeight: 1.3,
                marginTop: 14,
                maxWidth: 920,
              }}
            >
              {slide.body}
            </div>
          )}
        </div>

        {/* Footer line — source/URL/charity number, single horizontal row. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 18,
              color: DR.cream,
              opacity: 0.55,
            }}
          >
            {slide.source_attribution ?? ""}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 18,
                color: DR.cream,
                opacity: 0.7,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              deenrelief.org
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 13,
                color: DR.cream,
                opacity: 0.45,
                letterSpacing: 1,
              }}
            >
              Charity No. 1158608
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Phase 4x — eyebrow for photo slides. Compact variant of the
 * editorial Eyebrow above, sized for the tighter panel space, with
 * the Caveat brush fallback for manifesto arcs.
 */
function PhotoEyebrow({
  text,
  briefing,
}: {
  text: string;
  briefing: boolean;
}) {
  if (!briefing) {
    return (
      <div
        style={{
          display: "flex",
          fontFamily: "Caveat",
          fontWeight: 600,
          fontSize: 38,
          color: DR.amber,
          fontStyle: "italic",
          marginBottom: 10,
        }}
      >
        {text.toLowerCase()}…
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 24,
          height: 2,
          backgroundColor: DR.amber,
        }}
      />
      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 13,
          color: DR.amber,
          textTransform: "uppercase",
          letterSpacing: 3,
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Slightly more aggressive size-down for photo-slide titles since
 *  the available vertical real-estate is smaller than the typography-
 *  only layout. */
function photoSlideTitleSize(titleLength: number): number {
  if (titleLength > 40) return 52;
  if (titleLength > 24) return 64;
  return 80;
}

/* ─── Photo slide — right-panel composition (Phase 4t) ─────────── */

/**
 * Used when slide.photo_composition='panel_right' — typically for tall
 * portrait photos and shots where the subject's head/feet would be
 * cropped by a horizontal split. Photo fills the left 60%, dark green
 * text panel takes the right 40%.
 */
function PhotoSlideRightPanel({
  slide,
  mediaUrl,
  creditText,
  slideIndex,
  slideTotal,
  logoOnPhoto,
  focalPoint,
  briefing,
  logoPosition,
}: {
  slide: Slide;
  mediaUrl: string;
  creditText: string | null;
  slideIndex: number;
  slideTotal: number;
  logoOnPhoto: string | null;
  focalPoint: "top" | "center" | "bottom";
  briefing: boolean;
  logoPosition: LogoPosition;
}) {
  const PHOTO_WIDTH = 648; // 60% of 1080
  const PANEL_WIDTH = SLIDE_SIZE - PHOTO_WIDTH;
  const objPos = `center ${focalPoint}`;

  return (
    <div
      style={{
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        display: "flex",
        flexDirection: "row",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {/* ── Photo column (left) ── */}
      <div
        style={{
          width: PHOTO_WIDTH,
          height: SLIDE_SIZE,
          display: "flex",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          width={PHOTO_WIDTH}
          height={SLIDE_SIZE}
          style={{
            width: PHOTO_WIDTH,
            height: SLIDE_SIZE,
            objectFit: "cover",
            objectPosition: objPos,
          }}
        />
        {/* Logo on the photo — Phase 5d position-aware. Note the
            photo column is PHOTO_WIDTH wide (648px), not the full
            slide width — right-aligned positions anchor to the right
            edge of the photo column. */}
        <div
          style={{
            ...logoPositionToStyle(logoPosition, 56),
            display: "flex",
          }}
        >
          {logoOnPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoOnPhoto}
              alt="Deen Relief"
              width={300}
              height={100}
              style={{
                width: 300,
                height: 100,
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          ) : null}
        </div>
        {creditText && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              display: "flex",
              backgroundColor: "rgba(22, 56, 39, 0.78)",
              paddingTop: 6,
              paddingBottom: 6,
              paddingLeft: 12,
              paddingRight: 12,
              borderRadius: 4,
              maxWidth: PHOTO_WIDTH - 60,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 14,
                color: DR.cream,
                opacity: 0.92,
              }}
            >
              {creditText}
            </div>
          </div>
        )}
      </div>

      {/* ── Text panel (right) ── */}
      <div
        style={{
          width: PANEL_WIDTH,
          height: SLIDE_SIZE,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.forest,
          paddingTop: 56,
          paddingBottom: 48,
          paddingLeft: 36,
          paddingRight: 36,
          justifyContent: "space-between",
        }}
      >
        {/* Slide pip top-right inside the panel. */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {Array.from({ length: slideTotal }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: i + 1 === slideIndex ? 18 : 8,
                height: 8,
                backgroundColor: DR.cream,
                opacity: i + 1 === slideIndex ? 1 : 0.4,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {slide.eyebrow && (
            <PhotoEyebrow text={slide.eyebrow} briefing={briefing} />
          )}
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: slide.title.length > 30 ? 48 : 64,
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.0,
            }}
          >
            {slide.title}
          </div>
          {slide.body && (
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 18,
                color: DR.cream,
                opacity: 0.78,
                lineHeight: 1.45,
                marginTop: 18,
              }}
            >
              {slide.body}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 16,
              color: DR.amber,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            deenrelief.org
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 12,
              color: DR.cream,
              opacity: 0.55,
              letterSpacing: 1,
            }}
          >
            Charity No. 1158608
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Photo slide — full-bleed-overlay composition (Phase 4t) ──── */

/**
 * Used when slide.photo_composition='full_bleed_overlay' — for dramatic
 * environmental / landscape photos where breaking the frame would hurt
 * the composition. Photo fills the slide; a dark forest gradient
 * occupies the bottom ~40% with the text on top.
 */
function PhotoSlideFullBleed({
  slide,
  mediaUrl,
  creditText,
  slideIndex,
  slideTotal,
  logoOnPhoto,
  focalPoint,
  briefing,
  logoPosition,
}: {
  slide: Slide;
  mediaUrl: string;
  creditText: string | null;
  slideIndex: number;
  slideTotal: number;
  logoOnPhoto: string | null;
  focalPoint: "top" | "center" | "bottom";
  briefing: boolean;
  logoPosition: LogoPosition;
}) {
  const objPos = `center ${focalPoint}`;

  return (
    <div
      style={{
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        display: "flex",
        position: "relative",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl}
        alt=""
        width={SLIDE_SIZE}
        height={SLIDE_SIZE}
        style={{
          width: SLIDE_SIZE,
          height: SLIDE_SIZE,
          objectFit: "cover",
          objectPosition: objPos,
        }}
      />
      {/* Bottom gradient overlay — transparent → forest. Satori
          requires rgba() (not 8-char hex) for alpha; using a solid
          dark band with a soft top edge approximated by a second
          translucent band on top. */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: SLIDE_SIZE,
          height: 420,
          display: "flex",
          background:
            "linear-gradient(to top, rgba(22, 56, 39, 0.95) 0%, rgba(22, 56, 39, 0.85) 60%, rgba(22, 56, 39, 0) 100%)",
        }}
      />

      {/* Logo — Phase 5d position-aware. Full-bleed slides have the
          most flexibility for placement since the photo spans the
          entire canvas; Claude should pick a position the subject
          doesn't occupy. */}
      <div
        style={{
          ...logoPositionToStyle(logoPosition, 56),
          display: "flex",
        }}
      >
        {logoOnPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoOnPhoto}
            alt="Deen Relief"
            width={300}
            height={100}
            style={{
              width: 300,
              height: 100,
              objectFit: "contain",
              objectPosition: "left center",
            }}
          />
        ) : null}
      </div>

      {/* Slide pip top-right against a dark chip. */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          display: "flex",
          backgroundColor: "rgba(22, 56, 39, 0.78)",
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 999,
          alignItems: "center",
          gap: 6,
        }}
      >
        {Array.from({ length: slideTotal }, (_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: i + 1 === slideIndex ? 20 : 8,
              height: 8,
              backgroundColor: DR.cream,
              opacity: i + 1 === slideIndex ? 1 : 0.45,
              borderRadius: 4,
            }}
          />
        ))}
      </div>

      {/* Text overlay on the gradient. */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 56,
          right: 56,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {slide.eyebrow && (
          <PhotoEyebrow text={slide.eyebrow} briefing={briefing} />
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: photoSlideTitleSize(slide.title.length),
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.0,
            maxWidth: SLIDE_SIZE - 120,
          }}
        >
          {slide.title}
        </div>
        {slide.body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 22,
              color: DR.cream,
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: 1,
              lineHeight: 1.3,
              marginTop: 16,
              maxWidth: SLIDE_SIZE - 120,
            }}
          >
            {slide.body}
          </div>
        )}
      </div>

      {creditText && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            right: 18,
            display: "flex",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 4,
            maxWidth: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 13,
              color: DR.cream,
              opacity: 0.92,
            }}
          >
            {creditText}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Brand chip ──────────────────────────────────────────────────── */

type LogoPosition = "top_left" | "top_right" | "bottom_left" | "bottom_right";

/** Map a logo_position enum value to the absolute-position style
 *  fields for the BrandChip wrapper. Phase 5d — wires the schema
 *  field that was added in Phase 5a but never actually rendered.
 *  Lets Claude place the logo wherever the subject's face is NOT,
 *  so the brand doesn't crash into the visual focal point. */
function logoPositionToStyle(
  position: LogoPosition,
  inset: number = 56
): React.CSSProperties {
  switch (position) {
    case "top_right":
      return { position: "absolute", top: inset, right: inset };
    case "bottom_left":
      return { position: "absolute", bottom: inset, left: inset };
    case "bottom_right":
      return { position: "absolute", bottom: inset, right: inset };
    case "top_left":
    default:
      return { position: "absolute", top: inset, left: inset };
  }
}

function BrandChip({
  inverted,
  logoDataUri,
  position = "top_left",
}: {
  inverted: boolean;
  logoDataUri: string | null;
  /** Phase 5d — per-slide logo placement. Default top_left preserves
   *  the historical layout. Photo slides where the subject sits in
   *  the upper-left should pass "top_right" or "bottom_right" so
   *  the brand chip doesn't cover the face / focal element. */
  position?: LogoPosition;
}) {
  // `inverted` only affects the inline-SVG fallback (chip background
  // colour). When an uploaded logo is present, the chip wrapper is
  // dropped entirely and the logo sits directly on the slide bg —
  // caller is responsible for passing the correct colour variant.
  const cardBg = inverted ? DR.forest : DR.cream;
  const cardFg = inverted ? DR.cream : DR.forest;

  // ─── Logo directly on slide background, no chip wrapper ────────
  // The uploaded logo file has transparency + its own tagline —
  // no chip frame or duplicate text needed. Caller passes the right
  // colour variant for the slide background.
  //
  // Satori-critical: both width AND height MUST be explicit pixel
  // values. Auto / percentage / unset = image renders at zero width,
  // invisibly. objectFit:'contain' preserves the logo's intrinsic
  // aspect ratio inside the explicit box.
  if (logoDataUri) {
    return (
      <div
        style={{
          ...logoPositionToStyle(position),
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          alt="Deen Relief"
          width={360}
          height={120}
          style={{
            width: 360,
            height: 120,
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
      </div>
    );
  }

  // Fallback: inline-SVG approximation when the SMM hasn't uploaded
  // a logo asset yet. Same proportions + position so the layout is
  // visually consistent during onboarding.
  return (
    <div
      style={{
        ...logoPositionToStyle(position, 48),
        display: "flex",
        flexDirection: "column",
        backgroundColor: cardBg,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 22,
        paddingRight: 22,
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="9" r="4.5" fill={cardFg} />
          <path d="M 7 28 Q 7 17 16 17 Q 25 17 25 28 Z" fill={cardFg} />
        </svg>
        <span
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: 26,
            color: cardFg,
            letterSpacing: 0.5,
          }}
        >
          DEEN RELIEF
        </span>
      </div>
      <span
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 9,
          color: cardFg,
          opacity: 0.7,
          letterSpacing: 1.5,
          marginTop: 2,
          textTransform: "uppercase",
        }}
      >
        Helping vulnerable communities globally
      </span>
    </div>
  );
}

/* ─── Slide-number pip (top-right) ────────────────────────────────── */

function SlidePip({
  current,
  total,
  fg,
}: {
  current: number;
  total: number;
  fg: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 64,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: i + 1 === current ? 22 : 10,
            height: 10,
            backgroundColor: fg,
            opacity: i + 1 === current ? 1 : 0.3,
            borderRadius: 5,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Decorative sparkles ─────────────────────────────────────────── */

function Sparkle({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: React.CSSProperties;
}) {
  // 4-point star — same shape DR uses across the educational series.
  // Built as SVG path so Satori renders consistently across runtimes.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", ...style }}
    >
      <path
        d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z"
        fill={color}
      />
    </svg>
  );
}

function SparkleField({ inverted }: { inverted: boolean }) {
  const color = inverted ? DR.amber : DR.amber;
  return (
    <>
      <Sparkle size={28} color={color} style={{ top: 200, left: 80 }} />
      <Sparkle size={18} color={color} style={{ top: 280, right: 140 }} />
      <Sparkle size={22} color={color} style={{ bottom: 280, left: 140 }} />
      <Sparkle size={14} color={color} style={{ bottom: 200, right: 100 }} />
    </>
  );
}

/* ─── Slide body switches on layout ───────────────────────────────── */

function SlideBody({
  slide,
  fg,
  isCta,
  displayFont,
  arc,
  ctaKind,
  fallbackHashtags,
}: {
  slide: Slide;
  fg: string;
  isCta: boolean;
  /** Computed by displayFontFor() — Bowlby for chunky factual register,
   *  Lora for contemplative / quote / chapter register. Threaded down
   *  to each body component so titles render in the right voice. */
  displayFont: "Bowlby One SC" | "Lora";
  /** Drives the eyebrow + CTA register branch (Phase 4u). Manifesto
   *  keeps the warm Caveat-brush ornamentation; everything else
   *  gets the editorial briefing treatment. */
  arc: LaunchPacket["strategy_brief"]["arc"];
  /** Phase 4y — CTA slide picks one of three registers based on
   *  arc + kind. donate=URL pill, witness=hashtag pair, engage=
   *  comment-keyword prompt. */
  ctaKind: "donate" | "witness" | "engage";
  /** Phase 5c — fallback hashtag pair for the witness CTA when Claude
   *  forgets to put one in slide.body (we've seen URLs leak in there
   *  instead). Pulled from packet.social_post.hashtags. */
  fallbackHashtags: string[];
}) {
  const briefing = arc !== "manifesto";
  if (slide.layout === "tiers") return <TiersBody slide={slide} fg={fg} briefing={briefing} />;
  if (isCta)
    return (
      <CtaBody
        slide={slide}
        briefing={briefing}
        ctaKind={ctaKind}
        fallbackHashtags={fallbackHashtags}
      />
    );
  if (slide.layout === "stat")
    return <StatBody slide={slide} fg={fg} />;
  if (slide.layout === "chapter")
    return <ChapterBody slide={slide} fg={fg} displayFont={displayFont} />;
  if (slide.layout === "testimony")
    return <TestimonyBody slide={slide} fg={fg} displayFont={displayFont} briefing={briefing} />;
  return (
    <DisplayBody
      slide={slide}
      fg={fg}
      displayFont={displayFont}
      briefing={briefing}
    />
  );
}

/** Testimony slide — quote-styled. The title is the quote itself,
 *  rendered in Lora Italic (sourced from the social audit — quoted
 *  testimony reads as voice, not declaration). Amber quotation mark
 *  opens the quote, source_attribution closes it. */
function TestimonyBody({
  slide,
  fg,
  displayFont,
  briefing,
}: {
  slide: Slide;
  fg: string;
  /** Always 'Lora' for testimony slides, but plumbed through for
   *  consistency with the broader SlideBody contract. */
  displayFont: "Bowlby One SC" | "Lora";
  briefing: boolean;
}) {
  const useLora = displayFont === "Lora";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 100,
        paddingBottom: 60,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {slide.eyebrow && <Eyebrow text={slide.eyebrow} briefing={briefing} />}
      <div
        style={{
          display: "flex",
          fontFamily: useLora ? "Lora" : "Bowlby One SC",
          fontStyle: useLora ? "italic" : "normal",
          fontWeight: useLora ? 600 : 400,
          fontSize: 96,
          color: DR.amber,
          marginBottom: useLora ? -10 : 6,
          lineHeight: 1,
        }}
      >
        “
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: useLora ? "Lora" : "Bowlby One SC",
          fontStyle: useLora ? "italic" : "normal",
          fontWeight: useLora ? 600 : 400,
          fontSize: titleSizeFor("fact", slide.title.length, useLora),
          color: fg,
          textAlign: "center",
          textTransform: useLora ? "none" : "uppercase",
          lineHeight: useLora ? 1.2 : 1.1,
          letterSpacing: useLora ? 0 : 0.5,
          maxWidth: 880,
          alignSelf: "center",
        }}
      >
        {slide.title}
      </div>
      {slide.source_attribution && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 24,
            color: fg,
            opacity: 0.7,
            marginTop: 28,
          }}
        >
          {slide.source_attribution}
        </div>
      )}
    </div>
  );
}

/** Manifesto chapter slide — "We believe X. That means Y." pattern.
 *  Title is the claim (sentence case, Lora Italic medium-large);
 *  body is the proof line (DM Sans, smaller, ~70% opacity). Visual
 *  reference: Charity:Water's brand identity carousel where each
 *  chapter sits as its own slide.
 *
 *  Falls back to Bowlby uppercase when Lora isn't loaded — strictly
 *  worse aesthetically but keeps the slide rendering. */
function ChapterBody({
  slide,
  fg,
  displayFont,
}: {
  slide: Slide;
  fg: string;
  displayFont: "Bowlby One SC" | "Lora";
}) {
  const useLora = displayFont === "Lora";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        alignItems: "flex-start",
        textAlign: "left",
        paddingTop: 110,
        paddingBottom: 70,
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      {slide.eyebrow && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 700,
            fontSize: 16,
            color: DR.amber,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 18,
          }}
        >
          {slide.eyebrow}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontFamily: useLora ? "Lora" : "Bowlby One SC",
          fontStyle: useLora ? "italic" : "normal",
          fontWeight: useLora ? 600 : 400,
          fontSize: slide.title.length > 32 ? 84 : 104,
          color: fg,
          lineHeight: useLora ? 1.1 : 1.05,
          textTransform: useLora ? "none" : "uppercase",
          letterSpacing: useLora ? 0 : 0.5,
          maxWidth: 880,
          marginBottom: 28,
        }}
      >
        {slide.title}
      </div>
      {/* Thin amber accent rule between claim and proof — a typographic
          beat to mirror Charity:Water's chapter layout. */}
      <div
        style={{
          display: "flex",
          width: 56,
          height: 3,
          backgroundColor: DR.amber,
          marginBottom: 22,
        }}
      />
      {slide.body && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 28,
            color: fg,
            opacity: 0.78,
            lineHeight: 1.45,
            maxWidth: 820,
          }}
        >
          {slide.body}
        </div>
      )}
    </div>
  );
}

/** Phase 4u — editorial small-caps eyebrow for emergency arcs.
 *  Replaces the Caveat brush script on briefing content; manifesto
 *  arcs still get the warmer ornamental Caveat treatment.
 *
 *  Visually: thin amber rule + tracked-out tiny sans label. Reads as
 *  "BBC News" / "Reuters dispatch" rather than charity-event-flyer. */
function Eyebrow({
  text,
  briefing,
  inverted = false,
  centered = true,
}: {
  text: string;
  briefing: boolean;
  /** When true (CTA / cream slides) flip the amber on the rule to
   *  forest so it reads against the lighter background. */
  inverted?: boolean;
  centered?: boolean;
}) {
  if (!briefing) {
    // Manifesto / warm register — keep the existing brush style.
    return (
      <div
        style={{
          display: "flex",
          fontFamily: "Caveat",
          fontWeight: 600,
          fontSize: 56,
          color: DR.amber,
          marginBottom: 16,
          fontStyle: "italic",
        }}
      >
        {text.toLowerCase()}…
      </div>
    );
  }
  const ruleColor = inverted ? DR.forest : DR.amber;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 22,
        alignSelf: centered ? "center" : "flex-start",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 32,
          height: 2,
          backgroundColor: ruleColor,
        }}
      />
      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 16,
          color: ruleColor,
          textTransform: "uppercase",
          letterSpacing: 4,
        }}
      >
        {text}
      </div>
      <div
        style={{
          display: "flex",
          width: 32,
          height: 2,
          backgroundColor: ruleColor,
        }}
      />
    </div>
  );
}

/** Hero / fact / response — eyebrow + chunky title + supporting body.
 *  displayFont decides whether the title runs in chunky Bowlby (default)
 *  or Lora Italic (quiet_dignity / manifesto arcs — Phase 4p). */
function DisplayBody({
  slide,
  fg,
  displayFont,
  briefing,
}: {
  slide: Slide;
  fg: string;
  displayFont: "Bowlby One SC" | "Lora";
  /** Phase 4u — true for non-manifesto arcs; flips eyebrow style. */
  briefing: boolean;
}) {
  const useLora = displayFont === "Lora";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 100,
        paddingBottom: 60,
      }}
    >
      {slide.eyebrow && <Eyebrow text={slide.eyebrow} briefing={briefing} />}
      <div
        style={{
          display: "flex",
          fontFamily: useLora ? "Lora" : "Bowlby One SC",
          fontStyle: useLora ? "italic" : "normal",
          fontWeight: useLora ? 600 : 400,
          fontSize: titleSizeFor(slide.layout, slide.title.length, useLora),
          color: fg,
          textAlign: "center",
          // Lora-Italic is sentence case, not uppercase — that's what
          // gives it the contemplative editorial register vs Bowlby's
          // chunky declarative voice.
          textTransform: useLora ? "none" : "uppercase",
          lineHeight: useLora ? 1.15 : 1.05,
          letterSpacing: useLora ? 0 : 1,
          maxWidth: 900,
          alignSelf: "center",
        }}
      >
        {slide.title}
      </div>
      {slide.body && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 700,
            fontSize: 32,
            color: fg,
            opacity: 0.85,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            lineHeight: 1.35,
            marginTop: 32,
            maxWidth: 820,
            textAlign: "center",
          }}
        >
          {slide.body}
        </div>
      )}
    </div>
  );
}

/** Tiers slide — 3 amount/description rows with amber prices. */
function TiersBody({ slide, fg, briefing }: { slide: Slide; fg: string; briefing: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        paddingTop: 110,
        paddingBottom: 60,
        paddingLeft: 40,
        paddingRight: 40,
      }}
    >
      {slide.eyebrow && (
        <Eyebrow text={slide.eyebrow} briefing={briefing} />
      )}
      <div
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: 64,
          color: fg,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 40,
          alignSelf: "center",
          textAlign: "center",
        }}
      >
        {slide.title}
      </div>
      {slide.tier_lines?.map((tier, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            // Phase 5a — vertical center, not baseline. Multi-line
            // descriptions were misaligning against the amount column
            // because baseline anchored to the first line only.
            alignItems: "center",
            gap: 32,
            paddingTop: 24,
            paddingBottom: 24,
            borderTop: i === 0 ? `1px solid ${DR.hairlineLight}` : "none",
            borderBottom: `1px solid ${DR.hairlineLight}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: 72,
              color: DR.amber,
              width: 200,
              flexShrink: 0,
              // Anchor the £ amount to baseline of its own typography
              // (still chunky display) but the whole row is centred.
              lineHeight: 1,
            }}
          >
            £{tier.amount_gbp}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 26,
              color: fg,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              lineHeight: 1.35,
              flex: 1,
              alignItems: "center",
            }}
          >
            {tier.short_description}
          </div>
        </div>
      ))}
    </div>
  );
}

/** CTA slide — inverted cream canvas with green type + red emphasis. */
/** Phase 4u — stat slide. News-infographic style: tiny editorial
 *  eyebrow, MASSIVE focal number (the title), one-line context (the
 *  body), source chip bottom-right (source_attribution).
 *
 *  Shifts the carousel from "fundraising poster" into "news briefing
 *  graphic". Title is treated as a short numeric / magnitude string
 *  ('33M', 'M 7.0', '£0.40 per meal') — not a sentence. */
function StatBody({ slide, fg }: { slide: Slide; fg: string }) {
  // Stat title is intentionally large. Step down only for very long
  // strings (e.g. "2,000+ families"). Use Bowlby's chunky display for
  // numeric weight.
  const len = slide.title.length;
  const statSize = len > 12 ? 200 : len > 8 ? 260 : 320;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 90,
        paddingBottom: 90,
        paddingLeft: 48,
        paddingRight: 48,
        position: "relative",
      }}
    >
      {slide.eyebrow && <Eyebrow text={slide.eyebrow} briefing={true} />}
      <div
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: statSize,
          color: DR.amber,
          lineHeight: 0.95,
          letterSpacing: -2,
          marginBottom: 24,
        }}
      >
        {slide.title}
      </div>
      {slide.body && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            // Phase 5d — sentence case + lighter weight + tighter
            // letter-spacing. The previous ALL-CAPS bold body was
            // unreadable on long supporting prose (the user flagged
            // it on the "6 A DAY" West Bank stat). Editorial-style
            // body reads as journalism, not poster shouting.
            fontWeight: 500,
            fontSize: 28,
            color: fg,
            opacity: 0.9,
            lineHeight: 1.35,
            maxWidth: 860,
            textAlign: "center",
          }}
        >
          {slide.body}
        </div>
      )}
      {/* Source chip — anchored bottom centre. Wire-service tag feel. */}
      {slide.source_attribution && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(247, 243, 232, 0.08)",
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 18,
            paddingRight: 18,
            borderRadius: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 18,
              height: 2,
              backgroundColor: DR.amber,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 13,
              color: DR.cream,
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            {slide.source_attribution.replace(/^source:\s*/i, "")}
          </div>
        </div>
      )}
    </div>
  );
}

/** Phase 5c — resolve the witness CTA's hashtag pair. Claude is
 *  prompted to put 'tag1 · tag2' in slide.body but sometimes leaks a
 *  URL or other text there instead. This guard:
 *    1. Strips any URL-shaped tokens from slide.body
 *    2. Pulls the first two hashtag-like tokens (with or without '#')
 *    3. Falls back to the caption's hashtag pair if body is empty/wrong
 *    4. Always returns "#tag · #tag" — never a bare word, never a URL
 */
function resolveWitnessHashtagPair(
  body: string | null,
  fallbackHashtags: string[]
): string {
  const fromBody = body
    ? body
        // Kill anything that looks like a URL or domain.
        .replace(/\bhttps?:\/\/\S+/gi, "")
        .replace(/\b\w+\.(org|com|net|co|uk|io)(\/\S*)?/gi, "")
        .split(/[·•|,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && /^#?[a-z0-9_]+$/i.test(s))
        .slice(0, 2)
    : [];
  const fromCaption = fallbackHashtags
    .filter((h) => h && /^[a-z0-9_]+$/i.test(h))
    .slice(0, 2);
  const tags = (fromBody.length === 2 ? fromBody : fromCaption).map((t) =>
    t.startsWith("#") ? t.toLowerCase() : `#${t.toLowerCase()}`
  );
  if (tags.length === 2) return tags.join(" · ");
  if (tags.length === 1) return `${tags[0]} · #standwiththem`;
  return "#standwiththem · #ceasefirenow";
}

/** Phase 4u — CTA has two registers now:
 *    • Manifesto / festival (briefing=false): inverted cream canvas
 *      with red Bowlby 'DONATE NOW' (the original DR brand moment
 *      from Eid Mubarak posts).
 *    • Emergency briefing (briefing=true): forest canvas, restrained
 *      'Support the response' + URL pill. Reads as the end of a news
 *      briefing, not a charity event flyer.
 *
 *  The parent SlideContent paints the canvas bg differently per mode
 *  (cream for manifesto/festival, forest otherwise) — this body just
 *  fills the appropriate composition. */
function CtaBody({
  slide,
  briefing,
  ctaKind,
  fallbackHashtags,
}: {
  slide: Slide;
  briefing: boolean;
  ctaKind: "donate" | "witness" | "engage";
  fallbackHashtags: string[];
}) {
  // Phase 4y — witness mode replaces the URL pill with a hashtag pair.
  // For quiet_dignity / testimony arcs where reverence beats
  // transactional asks (MSF "Remember Us" pattern). Phase 5c — denser
  // visual hierarchy, URL-leak guard (Claude sometimes ignores the
  // "hashtags in body" rule and writes a URL there), fallback to the
  // caption's hashtag pair when slide.body is missing or wrong.
  if (briefing && ctaKind === "witness") {
    const hashtagPair = resolveWitnessHashtagPair(slide.body, fallbackHashtags);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          paddingTop: 110,
          paddingBottom: 80,
          paddingLeft: 64,
          paddingRight: 64,
        }}
      >
        {/* Top: eyebrow + statement */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Eyebrow text="REMEMBER" briefing={true} />
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: slide.title.length > 30 ? 76 : 110,
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.0,
              maxWidth: 880,
              textAlign: "center",
              alignSelf: "center",
            }}
          >
            {slide.title}
          </div>
        </div>

        {/* Middle: amber divider rule + hashtag pair as the typographic
            anchor. The rule gives the slide visual rhythm that a
            text-only canvas otherwise lacks. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 96,
              height: 3,
              backgroundColor: DR.amber,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 36,
              color: DR.amber,
              letterSpacing: 1.5,
              textTransform: "lowercase",
              textAlign: "center",
            }}
          >
            {hashtagPair}
          </div>
        </div>

        {/* Bottom: charity grounding so the slide doesn't feel adrift. */}
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 14,
            color: DR.cream,
            opacity: 0.5,
            letterSpacing: 3,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Deen Relief · Charity No. 1158608
        </div>
      </div>
    );
  }
  if (briefing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingTop: 80,
          paddingBottom: 60,
        }}
      >
        <Eyebrow text="ACT NOW" briefing={true} />
        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: 96,
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.0,
            maxWidth: 880,
            marginBottom: 36,
            textAlign: "center",
            alignSelf: "center",
          }}
        >
          {slide.title}
        </div>
        {slide.body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 26,
              color: DR.cream,
              opacity: 0.78,
              lineHeight: 1.4,
              maxWidth: 740,
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            {slide.body}
          </div>
        )}
        {/* URL pill — amber rounded, dark forest text, real button feel. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: DR.amber,
            paddingTop: 22,
            paddingBottom: 22,
            paddingLeft: 44,
            paddingRight: 44,
            borderRadius: 999,
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: 40,
              color: DR.forest,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            deenrelief.org
          </span>
        </div>
      </div>
    );
  }
  // Original festival / manifesto CTA — preserved unchanged.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 100,
        paddingBottom: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Caveat",
          fontWeight: 600,
          fontSize: 56,
          color: DR.amber,
          marginBottom: 8,
          fontStyle: "italic",
        }}
      >
        every gift counts…
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: 180,
          color: DR.red,
          textTransform: "uppercase",
          letterSpacing: 1,
          lineHeight: 0.95,
        }}
      >
        {slide.title}
      </div>
      {slide.body && (
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 700,
            fontSize: 36,
            color: DR.forest,
            opacity: 0.85,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginTop: 32,
            textAlign: "center",
          }}
        >
          {slide.body}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 28,
          color: DR.amber,
          marginTop: 24,
          letterSpacing: 1,
        }}
      >
        deenrelief.org
      </div>
    </div>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────── */

function SlideFooter({
  slide,
  fg,
  isCta,
}: {
  slide: Slide;
  fg: string;
  isCta: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {slide.source_attribution && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: 22,
              color: fg,
              opacity: 0.6,
            }}
          >
            {slide.source_attribution}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        {!isCta && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 20,
              color: fg,
              opacity: 0.7,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            deenrelief.org
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 14,
            color: fg,
            opacity: 0.45,
            letterSpacing: 1,
          }}
        >
          Charity No. 1158608
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

/**
 * Title size scales by layout AND by length — long hero headlines
 * (8 words) need a smaller size to fit on 2 lines without overflowing
 * the brand chip / pip clearances at top.
 */
function titleSizeFor(
  layout: Slide["layout"],
  titleLength: number,
  useLora = false
): number {
  // Phase 4u — toned the base sizes down ~12% across the board.
  // The audit found previous sizes read as poster-shout; editorial
  // news graphics use a smaller-but-more-confident type scale.
  const base = (() => {
    switch (layout) {
      case "hero":
        return 108;
      case "fact":
        return 84;
      case "response":
        return 76;
      default:
        return 80;
    }
  })();
  // Long titles step down once past ~24 chars, again past ~40.
  let size = base;
  if (titleLength > 40) size = Math.round(base * 0.7);
  else if (titleLength > 24) size = Math.round(base * 0.82);
  // Lora's lowercase / italic metrics render lighter than Bowlby's
  // chunky uppercase. Step UP ~8% so the visual weight is comparable
  // at the same slide scale.
  return useLora ? Math.round(size * 1.08) : size;
}
