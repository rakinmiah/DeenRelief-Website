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
  listImageryForEvent,
  markImagerySelected,
} from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  overrideLogoVariantIfMismatched,
  pickBestCandidateForEvent,
} from "@/lib/first-response-packet";
import { getCandidateMediaForEvent, getMediaById } from "@/lib/media-library";
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
  let mediaId = sourceSlide?.media_id ?? null;
  let photoLogoVariant: "white" | "green" =
    sourceSlide?.logo_variant === "green" ? "green" : "white";
  // Phase 4x — focal point for image cropping. Threaded through to
  // the magazine-cover composition so the image isn't always
  // centre-cropped.
  let photoFocalPoint: "top" | "center" | "bottom" =
    sourceSlide?.photo_focal_point ?? "center";
  // Phase 5d — logo placement, mirrors the source slide's pick so
  // the X/FB image treats the photo the same way the carousel does.
  const photoLogoPosition: LogoPosition =
    (sourceSlide?.logo_position as LogoPosition | undefined) ?? "top_left";

  // RENDER-TIME HERO PHOTO ENFORCEMENT (Phase 4q belt-and-braces).
  // If neither hero nor response had a photo in the stored packet,
  // look up the candidate pool and pick the best fit so the social
  // image still gets a photo backdrop instead of degrading to the
  // typography-only EditorialType layout.
  if (!mediaId) {
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
          `[social-image] render-time hero enforcement: stored media_id was null, assigning ${best.id} (${best.reason}) with logo=${best.logoVariant}`
        );
        mediaId = best.id;
        photoLogoVariant = best.logoVariant;
      }
    } catch (err) {
      console.warn(
        `[social-image] render-time hero enforcement failed (non-fatal):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Resolve via prefix switch — same shape as the slide route:
  //   • 'dr:<uuid>'   → DR's media_library
  //   • 'ext:<uuid>'  → external_imagery (third-party, attribution
  //                     required on display)
  let mediaDataUri: string | null = null;
  let creditText: string | null = null;

  if (mediaId?.startsWith("dr:")) {
    const drId = mediaId.slice(3);
    const media = await getMediaById(drId);
    if (media) {
      // Phase 4x — override Claude's logo_variant if it disagrees
      // with the photo's dominantColor. Catches white-on-pale.
      photoLogoVariant = overrideLogoVariantIfMismatched(
        photoLogoVariant,
        media.dominantColor
      );
    }
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
      photoFocalPoint={photoFocalPoint}
      photoLogoPosition={photoLogoPosition}
      // Phase 4x — pass the top verified_facts so the single image
      // can render a small stat strip. A senior SMM packs the
      // single post with substantive numbers, not just a headline.
      verifiedFacts={packet.verified_facts.slice(0, 3).map((f) => f.fact)}
      // Phase 5a — composition picker. Falls back to panel_below for
      // packets generated before the schema added the field.
      composition={packet.social_image_composition ?? "panel_below"}
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
  photoFocalPoint,
  photoLogoPosition,
  verifiedFacts,
  composition,
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
  /** Phase 4x — drives object-position so cropping anchors to the
   *  subject's vertical zone. Wasn't honoured in 4n. */
  photoFocalPoint: "top" | "center" | "bottom";
  /** Phase 5d — logo placement, mirrors the hero slide's pick. */
  photoLogoPosition: LogoPosition;
  /** Phase 4x — top verified facts surfaced as a stat strip on the
   *  X/FB image so it reads like a briefing, not a poster. */
  verifiedFacts: string[];
  /** Phase 5a — picks panel_below vs panel_right based on hero
   *  photo's aspect. Portrait photos use panel_right so they aren't
   *  centre-cropped awful. */
  composition: "panel_below" | "panel_right";
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  if (mediaUrl) {
    if (composition === "panel_right") {
      return (
        <MagazineCoverPanelRight
          title={title}
          eyebrow={eyebrow}
          body={body}
          ctaUrl={ctaUrl}
          campaignLabel={campaignLabel}
          mediaUrl={mediaUrl}
          creditText={creditText}
          photoLogoVariant={photoLogoVariant}
          photoFocalPoint={photoFocalPoint}
          photoLogoPosition={photoLogoPosition}
          verifiedFacts={verifiedFacts}
          logoOnLight={logoOnLight}
          logoOnDark={logoOnDark}
        />
      );
    }
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
        photoFocalPoint={photoFocalPoint}
        photoLogoPosition={photoLogoPosition}
        verifiedFacts={verifiedFacts}
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
  photoFocalPoint,
  photoLogoPosition,
  verifiedFacts,
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
  photoFocalPoint: "top" | "center" | "bottom";
  photoLogoPosition: LogoPosition;
  verifiedFacts: string[];
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  const PANEL_H = Math.round(HEIGHT * 0.38);
  const PHOTO_H = HEIGHT - PANEL_H;
  const photoLogo = photoLogoVariant === "green" ? logoOnLight : logoOnDark;
  const objPos = `center ${photoFocalPoint}`;

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
          style={{
            width: WIDTH,
            height: PHOTO_H,
            objectFit: "cover",
            objectPosition: objPos,
          }}
        />

        {/* DR wordmark — Phase 5d position-aware, placed where the
            photo subject isn't. */}
        <SocialLogo logoDataUri={photoLogo} position={photoLogoPosition} />

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
          // Phase 5a — bumped paddingBottom 22 → 36 because the URL
          // pill was rendering flush against the slide bottom edge.
          paddingTop: 22,
          paddingBottom: 36,
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
          {/* Phase 4y — editorial small-caps eyebrow with thin amber
              rule, matching the carousel slide register. Drops the
              Caveat brush script that read as charity-event-flyer. */}
          {eyebrow && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 20,
                  height: 2,
                  backgroundColor: DR.amber,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontWeight: 700,
                  fontSize: 11,
                  color: DR.amber,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                }}
              >
                {eyebrow}
              </div>
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

        {/* Right column: stat strip + URL pill + charity tag.
            Phase 4x — added the stat strip so the X/FB post reads
            like a briefing instead of just a headline poster. Up to
            three verified facts render as short bullet lines with an
            amber rule between them, sourced from packet.verified_facts. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingLeft: 28,
            borderLeft: `1px solid ${DR.amber}55`,
            height: "100%",
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {/* Top: stat strip — up to 3 verified facts. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              maxWidth: 360,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 10,
                color: DR.amber,
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 4,
              }}
            >
              By the numbers
            </div>
            {verifiedFacts.slice(0, 3).map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontWeight: 400,
                  fontSize: 13,
                  color: DR.cream,
                  opacity: 0.92,
                  lineHeight: 1.35,
                  textAlign: "right",
                }}
              >
                {trimToStatBeat(f)}
              </div>
            ))}
          </div>
          {/* Bottom: URL pill + charity tag */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
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
                marginTop: 10,
                textAlign: "right",
              }}
            >
              {campaignLabel ? `${campaignLabel} · ` : ""}Charity No. 1158608
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout A2 — Magazine cover with right panel (Phase 5a) ──── */

/**
 * Used when the hero photo is PORTRAIT (taller than wide). The
 * panel_below layout would centre-crop the subject's head or feet;
 * panel_right gives the photo its natural vertical proportions and
 * puts the text alongside on the right.
 *
 * Photo fills left 55% (660 × 675). Right panel fills 45% (540 × 675)
 * with eyebrow / title / body / stat-strip / URL pill stacked.
 */
function MagazineCoverPanelRight({
  title,
  eyebrow,
  body,
  ctaUrl,
  campaignLabel,
  mediaUrl,
  creditText,
  photoLogoVariant,
  photoFocalPoint,
  photoLogoPosition,
  verifiedFacts,
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
  photoFocalPoint: "top" | "center" | "bottom";
  photoLogoPosition: LogoPosition;
  verifiedFacts: string[];
  logoOnLight: string | null;
  logoOnDark: string | null;
}) {
  const PHOTO_W = Math.round(WIDTH * 0.55);
  const PANEL_W = WIDTH - PHOTO_W;
  const photoLogo = photoLogoVariant === "green" ? logoOnLight : logoOnDark;
  const objPos = `center ${photoFocalPoint}`;

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
      {/* ─── Photo column (left) ─── */}
      <div
        style={{
          width: PHOTO_W,
          height: HEIGHT,
          display: "flex",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          width={PHOTO_W}
          height={HEIGHT}
          style={{
            width: PHOTO_W,
            height: HEIGHT,
            objectFit: "cover",
            objectPosition: objPos,
          }}
        />
        {/* Logo on the photo column — Phase 5d position-aware.
            Anchored within the photo column (not the full canvas) so
            right-aligned positions land at the right edge of the photo,
            not the right edge of the slide. */}
        {photoLogo ? (
          <div
            style={{
              ...positionStyle(photoLogoPosition, { v: 28, h: 32 }),
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoLogo}
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
        ) : null}
        {/* Photo credit chip. */}
        {creditText && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              display: "flex",
              backgroundColor: "rgba(22, 56, 39, 0.78)",
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 3,
              maxWidth: PHOTO_W - 40,
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
                opacity: 0.92,
              }}
            >
              {creditText}
            </div>
          </div>
        )}
      </div>

      {/* ─── Text panel (right) ─── */}
      <div
        style={{
          width: PANEL_W,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: DR.forest,
          paddingTop: 36,
          paddingBottom: 36,
          paddingLeft: 32,
          paddingRight: 32,
          justifyContent: "space-between",
        }}
      >
        {/* Top block: eyebrow + headline + supporting body. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 22,
                  height: 2,
                  backgroundColor: DR.amber,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontWeight: 700,
                  fontSize: 11,
                  color: DR.amber,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                }}
              >
                {eyebrow}
              </div>
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontFamily: "Bowlby One SC",
              fontWeight: 400,
              fontSize: title.length > 24 ? 38 : title.length > 18 ? 46 : 56,
              color: DR.cream,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 0.96,
              marginBottom: 18,
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
                fontSize: 14.5,
                color: DR.cream,
                opacity: 0.78,
                lineHeight: 1.45,
                maxWidth: PANEL_W - 64,
              }}
            >
              {body}
            </div>
          )}
        </div>

        {/* Stat strip — top 3 verified facts, trimmed to short beats so
            the narrow 540px column doesn't wrap each one across 4 lines
            (which is what made the X post read like a poster — Phase 5c
            spacing fix). Each fact becomes a single-line headline beat. */}
        {verifiedFacts.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingTop: 18,
              paddingBottom: 18,
              borderTop: `1px solid ${DR.amber}55`,
              borderBottom: `1px solid ${DR.amber}55`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontWeight: 700,
                fontSize: 10,
                color: DR.amber,
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 4,
              }}
            >
              By the numbers
            </div>
            {verifiedFacts.slice(0, 3).map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  fontFamily: "DM Sans",
                  fontWeight: 400,
                  fontSize: 13,
                  color: DR.cream,
                  opacity: 0.92,
                  lineHeight: 1.35,
                }}
              >
                {trimToStatBeat(f)}
              </div>
            ))}
          </div>
        )}

        {/* Bottom block: URL pill + charity tag. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <UrlPill url={ctaUrl} variant="compact" />
          <div
            style={{
              display: "flex",
              fontFamily: "DM Sans",
              fontWeight: 400,
              fontSize: 11,
              color: DR.cream,
              opacity: 0.55,
              letterSpacing: 1,
              marginTop: 10,
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
        {/* Phase 4y — editorial eyebrow for the EditorialType
            (no-photo) layout too. */}
        {eyebrow && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 28,
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
                letterSpacing: 3.5,
              }}
            >
              {eyebrow}
            </div>
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
 *  layouts so the URL treatment is consistent.
 *
 *  Auto-sizes the font + padding to fit the URL on ONE line in the
 *  available width. Previously hardcoded 26px which wrapped any
 *  campaign URL longer than ~18 chars in the narrow panel_right
 *  column ("DEENRELIEF.ORG/PALESTINE" was breaking onto two lines).
 *
 *  `variant`:
 *    - "compact"  — used inside the 540px-wide panel_right column.
 *                   Smaller fonts so even "/orphan-sponsorship" fits.
 *    - "standard" — used inside the full-width panel_below + EditorialType
 *                   layouts. Bigger fonts since there's no column constraint.
 */
function UrlPill({
  url,
  variant = "standard",
}: {
  url: string;
  variant?: "compact" | "standard";
}) {
  const fontSize = urlPillFontSize(url, variant);
  // Padding scales with font so the pill looks balanced at every size.
  const padV = Math.round(fontSize * 0.55);
  const padH = Math.round(fontSize * 1.05);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: DR.amber,
        paddingTop: padV,
        paddingBottom: padV,
        paddingLeft: padH,
        paddingRight: padH,
        borderRadius: 999,
      }}
    >
      <span
        style={{
          display: "flex",
          fontFamily: "Bowlby One SC",
          fontWeight: 400,
          fontSize,
          color: DR.forest,
          letterSpacing: 1,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </span>
    </div>
  );
}

/** Phase 5c — trim a verified_fact to a short, scannable "stat beat"
 *  so the panel_right stat strip reads as three crisp headline lines
 *  rather than three wrapped paragraphs. We grab the leading clause
 *  before the first em-dash / comma / period that would split the
 *  number from its label, then cap at ~85 chars on a word boundary.
 *
 *  Examples:
 *   '1.7M people are now sheltering across 1,600 sites — 88% of them
 *    makeshift.'  →  '1.7M people sheltering across 1,600 sites'
 *   '881 Palestinians have been killed and 2,621 injured in Gaza since
 *    the October 2025 ceasefire, per the Gaza Ministry of Health.'
 *    →  '881 Palestinians killed, 2,621 injured since Oct 2025 ceasefire'
 *
 *  We don't try to be clever — just cut at the first natural breakpoint
 *  and apply an 85-char hard cap on a word boundary. If the original is
 *  already short (<60 chars) we leave it alone.
 */
function trimToStatBeat(fact: string): string {
  const trimmed = fact.trim().replace(/\.$/, "");
  if (trimmed.length <= 60) return trimmed;
  // First break: em-dash, en-dash, or ' — ' / ' - '
  const dashCut = trimmed.search(/\s[—–-]\s/);
  let candidate = dashCut > 24 ? trimmed.slice(0, dashCut) : trimmed;
  // Hard cap on a word boundary at ~85 chars.
  if (candidate.length > 85) {
    const slice = candidate.slice(0, 85);
    const lastSpace = slice.lastIndexOf(" ");
    candidate = (lastSpace > 50 ? slice.slice(0, lastSpace) : slice) + "…";
  }
  return candidate.trim();
}

/** Pick a Bowlby font size that keeps the URL on ONE line in the
 *  available width. Bowlby is a wide condensed display face — caps like
 *  M, W, D occupy ~0.7× fontSize horizontally, so we step down by URL
 *  length. The two variants reflect the two real container widths:
 *  panel_right has a ~424px text area inside the pill; the standard
 *  contexts (panel_below stat-card row + EditorialType bottom strip)
 *  have ~1000px+. */
function urlPillFontSize(
  url: string,
  variant: "compact" | "standard"
): number {
  const len = url.length;
  if (variant === "compact") {
    if (len <= 14) return 28;
    if (len <= 18) return 24;
    if (len <= 22) return 22;
    if (len <= 26) return 19;
    return 17;
  }
  // standard — much more horizontal room.
  if (len <= 16) return 36;
  if (len <= 22) return 32;
  if (len <= 28) return 28;
  if (len <= 34) return 24;
  return 20;
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
type LogoPosition = "top_left" | "top_right" | "bottom_left" | "bottom_right";

function positionStyle(
  position: LogoPosition,
  inset: { v: number; h: number }
): React.CSSProperties {
  switch (position) {
    case "top_right":
      return { position: "absolute", top: inset.v, right: inset.h };
    case "bottom_left":
      return { position: "absolute", bottom: inset.v, left: inset.h };
    case "bottom_right":
      return { position: "absolute", bottom: inset.v, right: inset.h };
    case "top_left":
    default:
      return { position: "absolute", top: inset.v, left: inset.h };
  }
}

function SocialLogo({
  logoDataUri,
  inline = false,
  position = "top_left",
}: {
  logoDataUri: string | null;
  inline?: boolean;
  /** Phase 5d — pass the hero slide's logo_position so the X/FB
   *  social image places the logo where the subject isn't, matching
   *  how the hero slide treats the same photo. */
  position?: LogoPosition;
}) {
  const wrapperStyle = inline
    ? ({ display: "flex" } as const)
    : ({
        ...positionStyle(position, { v: 24, h: 28 }),
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
