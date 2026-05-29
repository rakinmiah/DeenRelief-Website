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
  // Lora failed to load → degrade to Bowlby across the board. Renderer
  // still works; aesthetics suffer slightly.
  if (!loraAvailable) return "Bowlby One SC";
  if (layout === "testimony" || layout === "chapter") return "Lora";
  if (arc === "quiet_dignity" || arc === "manifesto") {
    // Tiers + CTA stay on Bowlby — those are price-ladder + headline
    // moments where the chunky register still reads better.
    if (layout === "tiers" || layout === "cta") return "Bowlby One SC";
    return "Lora";
  }
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
          `[slide ${index}] render-time hero enforcement: stored media_id was null, assigning ${best.id} (${best.reason})`
        );
        slide = { ...slide, media_id: best.id, logo_variant: "white" };
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
  const hasPhoto = !isCta && mediaUrl != null;
  const slideIndex = packet.carousel_slides.indexOf(slide) + 1;
  const slideTotal = packet.carousel_slides.length;

  // Photo slides get a fundamentally different layout — magazine-cover
  // style with the photo full-bleed on top and a solid green text
  // panel anchoring the bottom. Far more legible + visually striking
  // than tinting the photo with a green overlay, which washes out the
  // imagery and makes text hard to read against arbitrary backgrounds.
  if (hasPhoto) {
    // Per-slide logo variant comes from Claude's Stage 2 choice
    // (reviewed in Stage 3) — based on actually LOOKING at the photo:
    //   'green' = logo-on-light variant (green wordmark)
    //   'white' = logo-on-dark variant (white wordmark)
    // No more global "always green on photos" rule — that produced
    // green-on-green disappearances on foliage scenes.
    const photoLogo =
      slide.logo_variant === "green" ? logoOnLight : logoOnDark;
    return (
      <PhotoSlide
        slide={slide}
        mediaUrl={mediaUrl}
        creditText={creditText}
        slideIndex={slideIndex}
        slideTotal={slideTotal}
        logoOnPhoto={photoLogo}
      />
    );
  }

  // Typography-only path (the original Phase 4d design): full dark
  // green canvas with chunky uppercase title + sparkles + brand chip.
  const bg = isCta ? DR.cream : DR.forest;
  const fg = isCta ? DR.forest : DR.cream;

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
      {/* Brand logo — top-left. Per-slide logo_variant comes from
          Stage 2/3 — Claude picked it for THIS slide's background.
          Typography-only slides default to white on forest, green on
          cream (CTA), matching the slide bg colour. */}
      <BrandChip
        inverted={isCta}
        logoDataUri={slide.logo_variant === "green" ? logoOnLight : logoOnDark}
      />

      {/* Slide-number pip top-right. Tiny visual progress indicator. */}
      <SlidePip current={slideIndex} total={slideTotal} fg={fg} />

      {/* Decorative sparkles bracketing the title — DR uses these
          liberally as visual rhythm on the educational series. */}
      <SparkleField inverted={isCta} />

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
}) {
  const PHOTO_HEIGHT = 670; // ~62% of 1080
  const PANEL_HEIGHT = SLIDE_SIZE - PHOTO_HEIGHT;

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
          }}
        />
        {/* Green logo directly on the photo — no chip wrapper. */}
        <BrandChip inverted={false} logoDataUri={logoOnPhoto} />
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
              {slide.eyebrow.toLowerCase()}…
            </div>
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

/** Slightly more aggressive size-down for photo-slide titles since
 *  the available vertical real-estate is smaller than the typography-
 *  only layout. */
function photoSlideTitleSize(titleLength: number): number {
  if (titleLength > 40) return 52;
  if (titleLength > 24) return 64;
  return 80;
}

/* ─── Brand chip ──────────────────────────────────────────────────── */

function BrandChip({
  inverted,
  logoDataUri,
}: {
  inverted: boolean;
  logoDataUri: string | null;
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
          position: "absolute",
          top: 56,
          left: 56,
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
        position: "absolute",
        top: 48,
        left: 48,
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
}: {
  slide: Slide;
  fg: string;
  isCta: boolean;
  /** Computed by displayFontFor() — Bowlby for chunky factual register,
   *  Lora for contemplative / quote / chapter register. Threaded down
   *  to each body component so titles render in the right voice. */
  displayFont: "Bowlby One SC" | "Lora";
}) {
  if (slide.layout === "tiers") return <TiersBody slide={slide} fg={fg} />;
  if (isCta) return <CtaBody slide={slide} />;
  if (slide.layout === "chapter")
    return <ChapterBody slide={slide} fg={fg} displayFont={displayFont} />;
  if (slide.layout === "testimony")
    return <TestimonyBody slide={slide} fg={fg} displayFont={displayFont} />;
  return <DisplayBody slide={slide} fg={fg} displayFont={displayFont} />;
}

/** Testimony slide — quote-styled. The title is the quote itself,
 *  rendered in Lora Italic (sourced from the social audit — quoted
 *  testimony reads as voice, not declaration). Amber quotation mark
 *  opens the quote, source_attribution closes it. */
function TestimonyBody({
  slide,
  fg,
  displayFont,
}: {
  slide: Slide;
  fg: string;
  /** Always 'Lora' for testimony slides, but plumbed through for
   *  consistency with the broader SlideBody contract. */
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
        alignItems: "center",
        textAlign: "center",
        paddingTop: 100,
        paddingBottom: 60,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {slide.eyebrow && (
        <div
          style={{
            display: "flex",
            fontFamily: "Caveat",
            fontWeight: 600,
            fontSize: 48,
            color: DR.amber,
            marginBottom: 14,
            fontStyle: "italic",
          }}
        >
          {slide.eyebrow.toLowerCase()}…
        </div>
      )}
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

/** Hero / fact / response — eyebrow + chunky title + supporting body.
 *  displayFont decides whether the title runs in chunky Bowlby (default)
 *  or Lora Italic (quiet_dignity / manifesto arcs — Phase 4p). */
function DisplayBody({
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
        alignItems: "center",
        textAlign: "center",
        paddingTop: 100,
        paddingBottom: 60,
      }}
    >
      {slide.eyebrow && (
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
          {slide.eyebrow.toLowerCase()}…
        </div>
      )}
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
function TiersBody({ slide, fg }: { slide: Slide; fg: string }) {
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
        <div
          style={{
            display: "flex",
            fontFamily: "Caveat",
            fontWeight: 600,
            fontSize: 48,
            color: DR.amber,
            marginBottom: 8,
            alignSelf: "center",
            fontStyle: "italic",
          }}
        >
          {slide.eyebrow.toLowerCase()}…
        </div>
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
            alignItems: "baseline",
            gap: 36,
            paddingTop: 22,
            paddingBottom: 22,
            borderTop: i === 0 ? `1px solid ${DR.hairlineLight}` : "none",
            borderBottom: `1px solid ${DR.hairlineLight}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: 76,
              color: DR.amber,
              width: 220,
              flexShrink: 0,
            }}
          >
            £{tier.amount_gbp}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 30,
              color: fg,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              lineHeight: 1.3,
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
function CtaBody({ slide }: { slide: Slide }) {
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
  const base = (() => {
    switch (layout) {
      case "hero":
        return 124;
      case "fact":
        return 96;
      case "response":
        return 88;
      default:
        return 90;
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
