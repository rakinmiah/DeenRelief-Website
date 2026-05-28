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
  markImagerySelected,
} from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { getMediaById } from "@/lib/media-library";

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
  const slide = packet.carousel_slides[index];
  if (!slide) {
    return new Response("Slide missing from packet.", { status: 422 });
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

  // Four fonts + both brand logo variants in parallel. The chip
  // background depends on slide type (cream for non-CTA, forest for
  // CTA), and we want the LOGO to contrast with the chip background:
  //   cream chip   → logo-on-light variant (dark/green logo)
  //   forest chip  → logo-on-dark variant (white logo)
  // Either may be null if the SMM hasn't uploaded that variant yet —
  // BrandChip falls back to the inline SVG approximation.
  const [bowlby, dmBold, dmReg, caveat, logoOnLight, logoOnDark] =
    await Promise.all([
      loadGoogleFont("Bowlby One SC", 400),
      loadGoogleFont("DM Sans", 700),
      loadGoogleFont("DM Sans", 400),
      loadGoogleFont("Caveat", 600),
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
      />,
      {
        width: SLIDE_SIZE,
        height: SLIDE_SIZE,
        fonts: [
          { name: "Bowlby One SC", data: bowlby, weight: 400, style: "normal" },
          { name: "DM Sans", data: dmBold, weight: 700, style: "normal" },
          { name: "DM Sans", data: dmReg, weight: 400, style: "normal" },
          { name: "Caveat", data: caveat, weight: 600, style: "normal" },
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

      {/* Main composition switches on layout. */}
      <SlideBody slide={slide} fg={fg} isCta={isCta} />

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
}: {
  slide: Slide;
  fg: string;
  isCta: boolean;
}) {
  if (slide.layout === "tiers") return <TiersBody slide={slide} fg={fg} />;
  if (isCta) return <CtaBody slide={slide} />;
  if (slide.layout === "testimony")
    return <TestimonyBody slide={slide} fg={fg} />;
  return <DisplayBody slide={slide} fg={fg} />;
}

/** Testimony slide — quote-styled. The title is the quote itself,
 *  rendered in a slightly more humane register than the chunky fact
 *  display, with a leading quotation mark in DR's amber. The
 *  source_attribution becomes the speaker line. */
function TestimonyBody({ slide, fg }: { slide: Slide; fg: string }) {
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
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: 56,
          color: DR.amber,
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        “
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: titleSizeFor("fact", slide.title.length),
          color: fg,
          textAlign: "center",
          textTransform: "uppercase",
          lineHeight: 1.1,
          letterSpacing: 0.5,
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

/** Hero / fact / response — eyebrow + chunky title + supporting body. */
function DisplayBody({ slide, fg }: { slide: Slide; fg: string }) {
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
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: titleSizeFor(slide.layout, slide.title.length),
          color: fg,
          textAlign: "center",
          textTransform: "uppercase",
          lineHeight: 1.05,
          letterSpacing: 1,
          maxWidth: 900,
          // Satori sometimes drops vertical centering when long titles
          // wrap to 3 lines — explicit alignSelf keeps the block tight.
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
function titleSizeFor(layout: Slide["layout"], titleLength: number): number {
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
  if (titleLength > 40) return Math.round(base * 0.7);
  if (titleLength > 24) return Math.round(base * 0.82);
  return base;
}
