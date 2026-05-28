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
  const mediaId = heroSlide?.media_id ?? responseSlide?.media_id ?? null;

  const media = mediaId ? await getMediaById(mediaId) : null;
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
      } else {
        console.warn(
          `[social-image] media fetch failed (${imgRes.status}) for ${media.publicUrl}`
        );
      }
    } catch (err) {
      console.error(
        `[social-image] media fetch exception for ${media.publicUrl}:`,
        err
      );
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
      // Split mode uses the green logo inside a cream chip on photo;
      // typography mode uses the white logo directly on dark green.
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

/* ─── Composition ────────────────────────────────────────────────── */

function Composition({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  mediaUrl,
  logoOnLight,
  logoOnDark,
}: {
  title: string;
  eyebrow: string | null;
  body: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
  mediaUrl: string | null;
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  const hasPhoto = mediaUrl != null;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "row",
        backgroundColor: DR.forest,
        fontFamily: "DM Sans",
        position: "relative",
      }}
    >
      {hasPhoto ? (
        <>
          {/* ─── Left half — photo, no overlay ─── */}
          <div
            style={{
              width: WIDTH / 2,
              height: HEIGHT,
              display: "flex",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt=""
              width={WIDTH / 2}
              height={HEIGHT}
              style={{
                width: WIDTH / 2,
                height: HEIGHT,
                objectFit: "cover",
              }}
            />
            {/* Brand chip on photo — framed (cream chip + green logo)
                for guaranteed contrast against arbitrary photo content. */}
            <BrandChip logoDataUri={logoOnLight} framed />
          </div>

          {/* ─── Right half — text panel ─── */}
          <TextPanel
            title={title}
            eyebrow={eyebrow}
            body={body}
            ctaUrl={ctaUrl}
            campaignLabel={campaignLabel}
            width={WIDTH / 2}
          />
        </>
      ) : (
        <>
          {/* Typography-only — single full-canvas dark green panel.
              White logo (logo-on-dark) directly on the green field,
              no chip wrapper. */}
          <div
            style={{
              position: "absolute",
              top: 36,
              left: 36,
              display: "flex",
            }}
          >
            <BrandChip logoDataUri={logoOnDark} />
          </div>
          <TextPanel
            title={title}
            eyebrow={eyebrow}
            body={body}
            ctaUrl={ctaUrl}
            campaignLabel={campaignLabel}
            width={WIDTH}
            centered
          />
        </>
      )}
    </div>
  );
}

/* ─── Text panel ─────────────────────────────────────────────────── */

function TextPanel({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  width,
  centered = false,
}: {
  title: string;
  eyebrow: string | null;
  body: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
  width: number;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: DR.forest,
        paddingTop: 56,
        paddingBottom: 48,
        paddingLeft: centered ? 80 : 56,
        paddingRight: centered ? 80 : 56,
        justifyContent: "space-between",
        alignItems: centered ? "center" : "flex-start",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: centered ? "center" : "flex-start",
          textAlign: centered ? "center" : "left",
        }}
      >
        {eyebrow && (
          <div
            style={{
              display: "flex",
              fontFamily: "Caveat",
              fontWeight: 600,
              fontSize: 36,
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
            fontSize: titleSize(title.length, centered),
            color: DR.cream,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.0,
            maxWidth: width - 80,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 20,
              color: DR.cream,
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: 1,
              lineHeight: 1.35,
              marginTop: 18,
              maxWidth: width - 80,
            }}
          >
            {body}
          </div>
        )}
      </div>

      {/* Footer: URL + campaign label + charity number. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: centered ? "center" : "flex-start",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Bowlby One SC",
            fontWeight: 400,
            fontSize: centered ? 44 : 32,
            color: DR.amber,
            letterSpacing: 0.5,
          }}
        >
          {ctaUrl.toUpperCase()}
        </div>
        {campaignLabel && (
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 700,
              fontSize: 14,
              color: DR.cream,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginTop: 2,
            }}
          >
            {campaignLabel} · Charity No. 1158608
          </div>
        )}
      </div>
    </div>
  );
}

/** Title scales by length AND layout — centered (typography-only)
 *  fits more characters per line, split-panel less. */
function titleSize(length: number, centered: boolean): number {
  if (centered) {
    if (length > 40) return 72;
    if (length > 24) return 92;
    return 110;
  }
  if (length > 40) return 44;
  if (length > 24) return 56;
  return 72;
}

/* ─── Brand chip (compact variant) ──────────────────────────────── */

function BrandChip({
  logoDataUri,
  framed = false,
}: {
  logoDataUri: string | null;
  /** Wrap the logo in a cream chip — used when the background it sits
   *  on is an unpredictable photo. False (default) renders the logo
   *  directly on the slide bg; the caller must pass the correct
   *  colour variant. */
  framed?: boolean;
}) {
  // Direct mode: logo on background, no chip wrapper. ~14% of slide
  // height (90px on 675) for similar visual weight to slide route.
  if (logoDataUri && !framed) {
    return (
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 36,
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          alt="Deen Relief"
          height={90}
          style={{ height: 90, width: "auto", objectFit: "contain" }}
        />
      </div>
    );
  }

  // Framed mode: logo inside a cream chip — used on the photo half
  // of the split-screen composition where the bg is variable imagery.
  if (logoDataUri && framed) {
    return (
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.cream,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 22,
          paddingRight: 22,
          borderRadius: 6,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          alt="Deen Relief"
          height={52}
          style={{ height: 52, width: "auto", objectFit: "contain" }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        left: 32,
        display: "flex",
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
