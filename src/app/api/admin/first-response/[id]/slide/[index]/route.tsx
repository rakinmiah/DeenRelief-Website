/**
 * GET /api/admin/first-response/:id/slide/:index — render a single
 * launch-packet carousel slide as a 1080×1080 PNG.
 *
 * The launch packet (stored on emergency_events.draft_packet_json)
 * includes a `carousel_slides` array of 5 typed slides. This route
 * pulls that array, picks the slide at :index (0–4), and renders the
 * matching template via next/og's ImageResponse → Satori → PNG.
 *
 * Why server-rendered (rather than rendering on the client)?
 *   • PNG output — the SMM downloads the file and uploads to IG/FB.
 *   • Brand-consistent fonts (Source Serif 4 + DM Sans) loaded from
 *     Google Fonts as binary buffers at request time.
 *   • No CSS environment quirks — Satori's subset of CSS is the
 *     contract.
 *
 * Auth: requireAdminSession (same as the detail page). 'social' or
 * 'admin' roles. Anyone else gets a 401/redirect.
 *
 * Caching: NoStore. The packet can be regenerated and we want every
 * slide download to reflect the latest draft.
 */

import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLIDE_SIZE = 1080;
const SLIDE_COUNT = 5;

// Cream / charcoal / green / amber from the DR brand tokens. Kept
// inline so the renderer doesn't reach into Tailwind config — Satori
// only understands the subset of CSS it explicitly supports.
const COLORS = {
  cream: "#FAF6EE",
  charcoal: "#1A1A2E",
  charcoalSoft: "#1A1A2E99",
  green: "#1B5E3F",
  greenDark: "#0E3D27",
  amber: "#C8843B",
  hairline: "#1A1A2E1A",
} as const;

/**
 * Fetch a Google Font as an ArrayBuffer for Satori. Cached per-process
 * via module-level memoisation — fonts are static, so re-downloading
 * them per render is wasteful. The promise itself is memoised so
 * concurrent requests share one fetch.
 */
const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    // The Google Fonts CSS API serves us a tiny CSS file containing
    // the actual TTF/WOFF URL — extract and fetch it.
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    // Counter-intuitive but verified: sending a MODERN User-Agent makes
    // Google Fonts return WOFF, which Satori can't decode. Sending NO
    // User-Agent (or an old/unknown one) triggers the TTF fallback. The
    // Node fetch default UA is unidentified by Google, so omitting any
    // explicit UA header gets us TTF.
    const css = await fetch(cssUrl).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!match || !match[1]) {
      throw new Error(
        `Could not extract TTF font URL for ${family} ${weight} from Google Fonts CSS. ` +
          `Response preview: ${css.slice(0, 200)}`
      );
    }
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) {
      throw new Error(`Font fetch failed: ${fontRes.status}`);
    }
    return fontRes.arrayBuffer();
  })();
  fontCache.set(key, promise);
  return promise;
}

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

  // Load fonts in parallel. Satori needs them embedded — no <link>.
  const [serifBold, sansRegular, sansBold] = await Promise.all([
    loadGoogleFont("Source Serif 4", 700),
    loadGoogleFont("DM Sans", 400),
    loadGoogleFont("DM Sans", 700),
  ]);

  return new ImageResponse(<SlideContent slide={slide} packet={packet} />, {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
    fonts: [
      { name: "Source Serif 4", data: serifBold, weight: 700, style: "normal" },
      { name: "DM Sans", data: sansRegular, weight: 400, style: "normal" },
      { name: "DM Sans", data: sansBold, weight: 700, style: "normal" },
    ],
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="slide-${index + 1}.png"`,
    },
  });
}

/* ─── Slide rendering ─────────────────────────────────────────────── */

type Slide = LaunchPacket["carousel_slides"][number];

function SlideContent({
  slide,
  packet,
}: {
  slide: Slide;
  packet: LaunchPacket;
}) {
  // CTA slide uses the inverted palette (charcoal background, cream
  // text) so it stands out at the end of the carousel — gives the
  // closing call-to-action visual weight.
  const inverted = slide.layout === "cta";
  const bg = inverted ? COLORS.charcoal : COLORS.cream;
  const fg = inverted ? COLORS.cream : COLORS.charcoal;
  const accent = inverted ? COLORS.amber : COLORS.green;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        padding: 80,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {/* Hairline border-frame for the slide so the typography breathes
          inside a clear edge — a subtle "card" look. */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          right: 32,
          bottom: 32,
          border: `1px solid ${inverted ? "#FAF6EE33" : COLORS.hairline}`,
          borderRadius: 16,
          display: "flex",
        }}
      />

      {/* ─── Eyebrow (small uppercase tag) ─── */}
      {slide.eyebrow && (
        <div
          style={{
            display: "flex",
            color: accent,
            fontFamily: "DM Sans",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          {slide.eyebrow}
        </div>
      )}

      {/* ─── Main body switches on layout ─── */}
      <SlideBody slide={slide} fg={fg} accent={accent} />

      {/* ─── Footer ─── */}
      <SlideFooter packet={packet} slide={slide} fg={fg} accent={accent} />
    </div>
  );
}

function SlideBody({
  slide,
  fg,
  accent,
}: {
  slide: Slide;
  fg: string;
  accent: string;
}) {
  // Different layouts get different vertical rhythm — tiers needs
  // tight stacking, hero/fact/response give the title room to breathe.
  if (slide.layout === "tiers") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Source Serif 4",
            fontWeight: 700,
            fontSize: 60,
            lineHeight: 1.05,
            color: fg,
            marginBottom: 40,
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
              gap: 28,
              borderTop: `1px solid ${COLORS.hairline}`,
              paddingTop: 24,
              paddingBottom: 24,
              ...(i === (slide.tier_lines?.length ?? 0) - 1
                ? { borderBottom: `1px solid ${COLORS.hairline}` }
                : {}),
            }}
          >
            <div
              style={{
                display: "flex",
                color: accent,
                fontFamily: "Source Serif 4",
                fontWeight: 700,
                fontSize: 56,
                width: 200,
                flexShrink: 0,
              }}
            >
              £{tier.amount_gbp}
            </div>
            <div
              style={{
                display: "flex",
                color: fg,
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 30,
                lineHeight: 1.3,
                flex: 1,
              }}
            >
              {tier.short_description}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // hero, fact, response, cta — title + optional body
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Source Serif 4",
          fontWeight: 700,
          fontSize: titleSizeFor(slide.layout),
          lineHeight: 1.05,
          color: fg,
          letterSpacing: -0.5,
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
            fontSize: 34,
            lineHeight: 1.3,
            color: fg,
            opacity: 0.78,
            maxWidth: 880,
          }}
        >
          {slide.body}
        </div>
      )}
    </div>
  );
}

function SlideFooter({
  packet,
  slide,
  fg,
  accent,
}: {
  packet: LaunchPacket;
  slide: Slide;
  fg: string;
  accent: string;
}) {
  // Left side varies per slide; right side is always DR brand + page #
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slide.source_attribution && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 22,
              color: fg,
              opacity: 0.55,
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
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 700,
            fontSize: 26,
            color: accent,
            letterSpacing: 1,
          }}
        >
          Deen Relief
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "DM Sans",
            fontWeight: 400,
            fontSize: 18,
            color: fg,
            opacity: 0.55,
            letterSpacing: 0.5,
          }}
        >
          Slide {slideIndexFor(slide, packet)} / {packet.carousel_slides.length}
          {" · Charity No. 1158608"}
        </div>
      </div>
    </div>
  );
}

/** Larger type for the hero, slightly tighter for fact/response/cta. */
function titleSizeFor(layout: Slide["layout"]): number {
  switch (layout) {
    case "hero":
      return 110;
    case "fact":
      return 92;
    case "response":
      return 84;
    case "cta":
      return 130;
    default:
      return 90;
  }
}

function slideIndexFor(slide: Slide, packet: LaunchPacket): number {
  return packet.carousel_slides.indexOf(slide) + 1;
}
