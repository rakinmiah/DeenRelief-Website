/**
 * GET /api/admin/first-response/:id/social-image
 *
 * Renders a single 1200×675 (16:9) PNG condensing the launch packet
 * into one post suitable for Facebook and X (where 5-slide carousels
 * don't translate well — X caps at 4 images per tweet, FB's algorithm
 * currently favours single striking images over multi-photo posts).
 *
 * Two layouts:
 *   • With photo:  split-screen, photo left 50%, dark green text
 *                  panel right 50%. Clean (no overlay on photo).
 *   • Typography:  full dark green canvas with chunky title + URL,
 *                  same visual vocabulary as the typography-only
 *                  carousel slides.
 *
 * Same auth + data resolution as the slide route, just a different
 * output size + composition. Image bytes inlined as data URI to
 * avoid Satori fetch issues (see slide route header comment).
 */

import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/admin-session";
import { getLogoDataUri } from "@/lib/brand-assets";
import {
  getExternalImageryDataUri,
  markImagerySelected,
} from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import { LaunchPacketSchema } from "@/lib/first-response-packet";
import { getMediaById } from "@/lib/media-library";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import {
  CAMPAIGNS,
  isValidCampaign,
  type CampaignSlug,
} from "@/lib/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 675;
const SITE_HOST = "deenrelief.org";

// Same DR palette as the slide route — duplicated rather than imported
// because Satori reads from a tight inline-CSS subset and shared
// modules can drag in unsupported globals.
const DR = {
  forest: "#1F4D3B",
  forestDeep: "#163827",
  cream: "#F7F3E8",
  amber: "#E0A636",
  red: "#C0392B",
} as const;

/* ─── Font loader (mirrors slide route) ──────────────────────────── */

const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(cssUrl).then((r) => r.text());
    const match = css.match(
      /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/
    );
    if (!match || !match[1]) {
      throw new Error(
        `Could not extract TTF font URL for ${family} ${weight}. Response preview: ${css.slice(0, 200)}`
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

/* ─── Route ─────────────────────────────────────────────────────── */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await params;

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

  // Pick the hero slide's media (if any) as the photo for this image —
  // the hero already represents the most striking image Claude picked.
  // Falls back to the response slide's media if hero has none.
  const heroSlide = packet.carousel_slides.find((s) => s.layout === "hero");
  const responseSlide = packet.carousel_slides.find((s) => s.layout === "response");
  // Source slide that contributes the photo — needed so we honour
  // that slide's per-slide logo_variant choice (set by Stage 2/3 based
  // on actually looking at the photo).
  const sourceSlide = heroSlide?.media_id ? heroSlide : responseSlide;
  const mediaId = sourceSlide?.media_id ?? null;
  const photoLogoVariant: "white" | "green" =
    sourceSlide?.logo_variant === "green" ? "green" : "white";

  // Resolve via prefix switch — same shape as the slide route:
  //   • 'dr:<uuid>'   → DR's media_library
  //   • 'ext:<uuid>'  → external_imagery (third-party, attribution
  //                     required on display)
  let mediaDataUri: string | null = null;
  let creditText: string | null = null;

  if (mediaId?.startsWith("dr:")) {
    const drId = mediaId.slice(3);
    const media = await getMediaById(drId);
    if (media && !media.archivedAt) {
      try {
        const imgRes = await fetch(media.publicUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const mimeType =
            imgRes.headers.get("content-type") ?? media.mimeType ?? "image/jpeg";
          const base64 = Buffer.from(buf).toString("base64");
          mediaDataUri = `data:${mimeType};base64,${base64}`;
        } else {
          console.warn(
            `[social-image] DR media fetch failed (${imgRes.status}) for ${media.publicUrl}`
          );
        }
      } catch (err) {
        console.error(
          `[social-image] DR media fetch exception for ${media.publicUrl}:`,
          err
        );
      }
    }
  } else if (mediaId?.startsWith("ext:")) {
    const extId = mediaId.slice(4);
    const ext = await getExternalImageryDataUri(extId);
    if (ext) {
      mediaDataUri = ext.dataUri;
      creditText = ext.creditText;
      // Same selected-tracking as the slide route — surfaces which
      // sources produce the most-used social imagery.
      await markImagerySelected(extId);
    }
  }

  // Derive the campaign URL (deenrelief.org/<slug>) from the top
  // matched campaign for the event — used as the visible CTA.
  const topCampaign = event.matchedCampaigns.find((c) =>
    isValidCampaign(c)
  ) as CampaignSlug | undefined;
  const campaignPath = topCampaign
    ? CAMPAIGN_LANDING_PATHS[topCampaign]
    : "/donate";
  const ctaUrl = `${SITE_HOST}${campaignPath}`;

  // Headline + eyebrow are drawn from the hero slide (which mirrors
  // the appeal-page headline). One supporting body line maximum to
  // keep the composition tight at 1200×675.
  const eyebrow = heroSlide?.eyebrow ?? "EMERGENCY APPEAL";
  const title = heroSlide?.title ?? packet.headline;
  const body = heroSlide?.body ?? null;

  const [bowlby, dmBold, dmReg, caveat, logoOnLight, logoOnDark] =
    await Promise.all([
      loadGoogleFont("Bowlby One SC", 400),
      loadGoogleFont("DM Sans", 700),
      loadGoogleFont("DM Sans", 400),
      loadGoogleFont("Caveat", 600),
      // Split mode (photo half) uses the green logo directly on the
      // photo; typography mode uses the white logo on dark green.
      getLogoDataUri("logo-on-light"),
      getLogoDataUri("logo-on-dark"),
    ]);

  return new ImageResponse(
    <Composition
      title={title}
      eyebrow={eyebrow}
      body={body}
      ctaUrl={ctaUrl}
      campaignLabel={
        topCampaign && isValidCampaign(topCampaign)
          ? CAMPAIGNS[topCampaign]
          : null
      }
      mediaUrl={mediaDataUri}
      creditText={creditText}
      photoLogoVariant={photoLogoVariant}
      logoOnLight={logoOnLight?.dataUri ?? null}
      logoOnDark={logoOnDark?.dataUri ?? null}
    />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Bowlby One SC", data: bowlby, weight: 400, style: "normal" },
        { name: "DM Sans", data: dmBold, weight: 700, style: "normal" },
        { name: "DM Sans", data: dmReg, weight: 400, style: "normal" },
        { name: "Caveat", data: caveat, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'inline; filename="social-post.png"',
      },
    }
  );
}

/* ─── Composition — two editorial layouts ──────────────────────────
 *
 * Photo case → MagazineCover: photo full-bleed background, dark
 *   gradient panel on the bottom 38% with the eyebrow / title / URL
 *   pill / charity tag. Reads like an Economist cover or a Choose
 *   Love editorial card — the photo is the post, the type frames it.
 *
 * No-photo case → EditorialType: dark forest canvas with a real
 *   editorial type stack — date pip, large headline, supporting
 *   strapline, amber separator rule, URL pill, charity microcopy.
 *   Reads like a newspaper front-page lede block rather than a
 *   "DONATE NOW" billboard.
 *
 * Both share DR's palette + type stack so brand identity is intact;
 * the composition + hierarchy do the heavy lifting.
 */

function Composition({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  mediaUrl,
  creditText,
  photoLogoVariant,
  logoOnLight,
  logoOnDark,
}: {
  title: string;
  eyebrow: string | null;
  body: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
  mediaUrl: string | null;
  creditText: string | null;
  photoLogoVariant: "white" | "green";
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  if (mediaUrl) {
    return (
      <MagazineCover
        title={title}
        eyebrow={eyebrow}
        body={body}
        ctaUrl={ctaUrl}
        campaignLabel={campaignLabel}
        mediaUrl={mediaUrl}
        creditText={creditText}
        photoLogoVariant={photoLogoVariant}
        logoOnLight={logoOnLight}
        logoOnDark={logoOnDark}
      />
    );
  }
  return (
    <EditorialType
      title={title}
      eyebrow={eyebrow}
      body={body}
      ctaUrl={ctaUrl}
      campaignLabel={campaignLabel}
      logoOnDark={logoOnDark}
    />
  );
}

/* ─── Layout A — Magazine cover (photo case) ───────────────────── */

function MagazineCover({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  mediaUrl,
  creditText,
  photoLogoVariant,
  logoOnLight,
  logoOnDark,
}: {
  title: string;
  eyebrow: string | null;
  body: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
  mediaUrl: string;
  creditText: string | null;
  photoLogoVariant: "white" | "green";
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  const PANEL_H = Math.round(HEIGHT * 0.38);
  const PHOTO_H = HEIGHT - PANEL_H;
  const photoLogo = photoLogoVariant === "green" ? logoOnLight : logoOnDark;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {/* ─── Photo zone (top) ─── */}
      <div
        style={{
          width: WIDTH,
          height: PHOTO_H,
          display: "flex",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          width={WIDTH}
          height={PHOTO_H}
          style={{ width: WIDTH, height: PHOTO_H, objectFit: "cover" }}
        />

        {/* Top-left: DR wordmark sitting directly on the photo. */}
        <SocialLogo logoDataUri={photoLogo} />

        {/* Top-right: a thin date pip — newspaper micro-detail. The
            eyebrow string is e.g. 'EMERGENCY APPEAL · 28 MAY 2026';
            we surface just the date half in the pip for a tighter
            edit and let the bottom panel carry the full eyebrow. */}
        <DatePip eyebrow={eyebrow} />

        {/* Photo credit pill — only when third-party, sits at the
            bottom edge of the photo zone (just above the panel). */}
        {creditText && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              right: 16,
              display: "flex",
              backgroundColor: "rgba(22, 56, 39, 0.78)",
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 3,
              maxWidth: WIDTH - 60,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 12,
                color: DR.cream,
                opacity: 0.94,
                letterSpacing: 0.3,
              }}
            >
              {creditText}
            </div>
          </div>
        )}
      </div>

      {/* ─── Editorial panel (bottom) ─── */}
      <div
        style={{
          width: WIDTH,
          height: PANEL_H,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          backgroundColor: DR.forest,
          paddingTop: 22,
          paddingBottom: 22,
          paddingLeft: 44,
          paddingRight: 44,
        }}
      >
        {/* Left column: eyebrow + title + body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            paddingRight: 28,
          }}
        >
          {eyebrow && (
            <div
              style={{
                display: "flex",
                fontFamily: "Caveat",
                fontWeight: 600,
                fontSize: 30,
                color: DR.amber,
                fontStyle: "italic",
                marginBottom: 4,
              }}
            >
              {eyebrow.toLowerCase()}…
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: coverTitleSize(title.length),
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.02,
            }}
          >
            {title}
          </div>
          {body && (
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 400,
                fontSize: 18,
                color: DR.cream,
                opacity: 0.78,
                lineHeight: 1.4,
                marginTop: 12,
                maxWidth: 720,
              }}
            >
              {body}
            </div>
          )}
        </div>

        {/* Right column: vertical divider + URL pill + charity tag */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingLeft: 28,
            borderLeft: `1px solid ${DR.amber}55`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 11,
              color: DR.cream,
              opacity: 0.55,
              textTransform: "uppercase",
              letterSpacing: 2.5,
              marginBottom: 10,
            }}
          >
            Donate · respond
          </div>
          <UrlPill url={ctaUrl} />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 12,
              color: DR.cream,
              opacity: 0.55,
              letterSpacing: 1,
              marginTop: 12,
              textAlign: "right",
            }}
          >
            {campaignLabel ? `${campaignLabel} · ` : ""}Charity No. 1158608
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout B — Editorial typography (no-photo case) ────────── */

function EditorialType({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  logoOnDark,
}: {
  title: string;
  eyebrow: string | null;
  body: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
  logoOnDark: string | null;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
        position: "relative",
        padding: 56,
      }}
    >
      {/* ─── Top strip: logo + date pip ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          height: 70,
        }}
      >
        <SocialLogo logoDataUri={logoOnDark} inline />
        <DatePip eyebrow={eyebrow} inline />
      </div>

      {/* ─── Centre: large editorial headline + supporting strap ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          paddingTop: 18,
          paddingBottom: 18,
        }}
      >
        {eyebrow && (
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
            {eyebrow.toLowerCase()}…
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: editorialTitleSize(title.length),
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.0,
            maxWidth: WIDTH - 200,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 22,
              color: DR.cream,
              opacity: 0.78,
              lineHeight: 1.45,
              marginTop: 20,
              maxWidth: WIDTH - 280,
            }}
          >
            {body}
          </div>
        )}
      </div>

      {/* ─── Bottom strip: amber rule + URL pill + charity microcopy ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 64,
            height: 3,
            backgroundColor: DR.amber,
            marginBottom: 16,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 13,
              color: DR.cream,
              opacity: 0.55,
              letterSpacing: 1,
            }}
          >
            {campaignLabel ? `${campaignLabel} · ` : ""}Charity No. 1158608 · Brighton, UK
          </div>
          <UrlPill url={ctaUrl} />
        </div>
      </div>
    </div>
  );
}

/* ─── Shared display elements ──────────────────────────────────── */

/** Amber pill that reads as a clickable button — much stronger CTA
 *  than the raw amber wordmark we shipped before. Used by both
 *  layouts so the URL treatment is consistent. */
function UrlPill({ url }: { url: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: DR.amber,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 26,
        paddingRight: 26,
        borderRadius: 999,
      }}
    >
      <span
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize: 26,
          color: DR.forest,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {url}
      </span>
    </div>
  );
}

/** Newspaper-style date pip — horizontal rule + date + rule. Used as
 *  a top-right accent on both layouts so the post reads as dated
 *  reportage, not generic appeal. Extracts the date half of the
 *  eyebrow string (after the last '·' separator). */
function DatePip({
  eyebrow,
  inline = false,
}: {
  eyebrow: string | null;
  inline?: boolean;
}) {
  if (!eyebrow) return null;
  const parts = eyebrow.split("·").map((s) => s.trim());
  const date = parts.length > 1 ? parts[parts.length - 1]! : eyebrow;
  const positionStyle = inline
    ? { display: "flex" as const }
    : {
        position: "absolute" as const,
        top: 28,
        right: 32,
        display: "flex" as const,
      };
  return (
    <div
      style={{
        ...positionStyle,
        alignItems: "center",
        backgroundColor: "rgba(22, 56, 39, 0.82)",
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 14,
          height: 1,
          backgroundColor: DR.amber,
          marginRight: 10,
        }}
      />
      <div
        style={{
          display: "flex",
          fontFamily: "DM Sans",
          fontWeight: 700,
          fontSize: 12,
          color: DR.cream,
          textTransform: "uppercase",
          letterSpacing: 2.5,
        }}
      >
        {date}
      </div>
      <div
        style={{
          display: "flex",
          width: 14,
          height: 1,
          backgroundColor: DR.amber,
          marginLeft: 10,
        }}
      />
    </div>
  );
}

/** Title size for the cover panel — runs at smaller scale than the
 *  editorial layout because it shares vertical space with the photo. */
function coverTitleSize(length: number): number {
  if (length > 50) return 38;
  if (length > 30) return 48;
  if (length > 18) return 58;
  return 72;
}

/** Title size for the editorial-typography layout — has the full
 *  canvas to itself so it runs larger. */
function editorialTitleSize(length: number): number {
  if (length > 50) return 64;
  if (length > 30) return 86;
  if (length > 18) return 104;
  return 124;
}

/* ─── DR wordmark ──────────────────────────────────────────────── */

/**
 * Top-left brand wordmark. Two positioning modes:
 *   - default (absolute): used on the magazine-cover photo zone, sits
 *     over the image. Tighter sizing than the carousel slides because
 *     the social image is 1200x675 not 1080x1080.
 *   - inline: used in the editorial-type top strip alongside the
 *     date pip, sits in flex flow.
 */
function SocialLogo({
  logoDataUri,
  inline = false,
}: {
  logoDataUri: string | null;
  inline?: boolean;
}) {
  const wrapperStyle = inline
    ? ({ display: "flex" } as const)
    : ({
        position: "absolute" as const,
        top: 24,
        left: 28,
        display: "flex" as const,
      } as const);
  if (logoDataUri) {
    return (
      <div style={wrapperStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          alt="Deen Relief"
          width={220}
          height={70}
          style={{
            width: 220,
            height: 70,
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />
      </div>
    );
  }
  // SVG fallback when no uploaded logo — same positioning mode as
  // the uploaded-logo branch so the layout is stable.
  return (
    <div
      style={{
        ...wrapperStyle,
        flexDirection: "column",
        backgroundColor: DR.cream,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 18,
        paddingRight: 18,
        borderRadius: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="9" r="4.5" fill={DR.forest} />
          <path d="M 7 28 Q 7 17 16 17 Q 25 17 25 28 Z" fill={DR.forest} />
        </svg>
        <span
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: 22,
            color: DR.forest,
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
          fontSize: 8,
          color: DR.forest,
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
