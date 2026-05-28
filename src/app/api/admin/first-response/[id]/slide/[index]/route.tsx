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
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { getMediaById } from "@/lib/media-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLIDE_SIZE = 1080;
const SLIDE_COUNT = 5;

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
  if (!Number.isFinite(index) || index < 0 || index >= SLIDE_COUNT) {
    return new Response(`Slide index must be 0..${SLIDE_COUNT - 1}.`, {
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

  // Resolve the slide's chosen media item (if any) — slides on hero or
  // response layouts can carry a media_id pointing at media_library.
  // Non-fatal if the media has been archived since the draft: we fall
  // back to typography-only.
  //
  // We fetch the image bytes ourselves and inline as a base64 data URI
  // rather than passing the public URL to Satori. Two reasons:
  //   (1) Satori's image fetcher silently fails on some hosts/URLs
  //       with no error surfaced — observed live with Supabase Storage
  //       URLs not rendering on slides despite the route reporting OK.
  //   (2) Inline data URIs guarantee the bytes are present at render
  //       time. Adds one HTTP hop per slide (Vercel → Supabase) but
  //       it's a few hundred ms — well within the 60s function budget.
  const media = slide.media_id ? await getMediaById(slide.media_id) : null;
  let mediaDataUri: string | null = null;
  if (media && !media.archivedAt) {
    try {
      const imgRes = await fetch(media.publicUrl);
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        const mimeType =
          imgRes.headers.get("content-type") ?? media.mimeType ?? "image/jpeg";
        const base64 = Buffer.from(buf).toString("base64");
        mediaDataUri = `data:${mimeType};base64,${base64}`;
        console.log(
          `[slide ${index}] inlined media ${media.id} (${buf.byteLength}B, ${mimeType})`
        );
      } else {
        console.warn(
          `[slide ${index}] media fetch failed (${imgRes.status}) for ${media.publicUrl}`
        );
      }
    } catch (err) {
      console.error(
        `[slide ${index}] media fetch exception for ${media.publicUrl}:`,
        err
      );
    }
  } else if (slide.media_id) {
    console.warn(
      `[slide ${index}] slide.media_id=${slide.media_id} but media resolved to ${media ? "archived" : "null"}`
    );
  }

  // Four fonts in parallel — every slide uses at least three of them.
  //   Bowlby One SC 400  → chunky uppercase display titles
  //   DM Sans 700        → bold uppercase body
  //   DM Sans 400        → ordinary cream-on-green prose
  //   Caveat 600         → italic brush eyebrow (the "INTRODUCING…" voice)
  const [bowlby, dmBold, dmReg, caveat] = await Promise.all([
    loadGoogleFont("Bowlby One SC", 400),
    loadGoogleFont("DM Sans", 700),
    loadGoogleFont("DM Sans", 400),
    loadGoogleFont("Caveat", 600),
  ]);

  return new ImageResponse(
    <SlideContent slide={slide} packet={packet} mediaUrl={mediaDataUri} />,
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
}

/* ─── Slide composition ───────────────────────────────────────────── */

type Slide = LaunchPacket["carousel_slides"][number];

function SlideContent({
  slide,
  packet,
  mediaUrl,
}: {
  slide: Slide;
  packet: LaunchPacket;
  mediaUrl: string | null;
}) {
  // CTA slide flips to a cream canvas with green type + red emphasis,
  // mirroring the Eid Mubarak / festival treatment — gives the closing
  // beat emotional warmth instead of more dark intensity.
  const isCta = slide.layout === "cta";
  const bg = isCta ? DR.cream : DR.forest;
  const fg = isCta ? DR.forest : DR.cream;
  const hasPhoto = !isCta && mediaUrl != null;

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
      {/* Photo background (hero/response slides with media_id set).
          Renders as a full-bleed image absolutely positioned beneath
          everything else, with a dark green gradient overlay so the
          typography remains legible regardless of underlying contrast.
          Notes for Satori compatibility:
            • Explicit pixel dimensions, not percentages
            • rgba() not 8-char hex (Satori treats #RRGGBBAA as opaque)
            • Image src is a data URI (inlined in the route) so Satori
              doesn't need to do its own fetch */}
      {hasPhoto && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt=""
            width={SLIDE_SIZE}
            height={SLIDE_SIZE}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SLIDE_SIZE,
              height: SLIDE_SIZE,
              objectFit: "cover",
            }}
          />
          {/* Dark green gradient overlay. Heavy at top + bottom to
              anchor the brand chip + footer, lighter in the middle so
              the underlying photo reads through behind the title. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SLIDE_SIZE,
              height: SLIDE_SIZE,
              backgroundImage:
                "linear-gradient(180deg, rgba(22, 56, 39, 0.88) 0%, rgba(31, 77, 59, 0.55) 35%, rgba(31, 77, 59, 0.55) 65%, rgba(22, 56, 39, 0.92) 100%)",
              display: "flex",
            }}
          />
        </>
      )}

      {/* Brand chip — top-left. Pinned to every slide for identity. */}
      <BrandChip inverted={isCta} />

      {/* Slide-number pip top-right. Tiny visual progress indicator. */}
      <SlidePip
        current={packet.carousel_slides.indexOf(slide) + 1}
        total={packet.carousel_slides.length}
        fg={fg}
      />

      {/* Decorative sparkles bracketing the title — DR uses these
          liberally as visual rhythm on the educational series. Skip
          them on photo slides where the imagery carries the visual
          weight already. */}
      {!hasPhoto && <SparkleField inverted={isCta} />}

      {/* Main composition switches on layout. */}
      <SlideBody slide={slide} fg={fg} isCta={isCta} />

      {/* Footer — source attribution, URL on CTA, hairline divider. */}
      <SlideFooter slide={slide} fg={fg} isCta={isCta} />
    </div>
  );
}

/* ─── Brand chip ──────────────────────────────────────────────────── */

function BrandChip({ inverted }: { inverted: boolean }) {
  // On the dark green slides the chip is a cream card (high contrast,
  // postage-stamp style). On the cream CTA slide we flip — the chip is
  // a green card so it still pops against the cream field.
  const cardBg = inverted ? DR.forest : DR.cream;
  const cardFg = inverted ? DR.cream : DR.forest;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Simple geometric mark — abstract family/tree silhouette. Pure
            SVG so it scales cleanly at any density. */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="9" r="4.5" fill={cardFg} />
          <path
            d="M 7 28 Q 7 17 16 17 Q 25 17 25 28 Z"
            fill={cardFg}
          />
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
  return <DisplayBody slide={slide} fg={fg} />;
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
