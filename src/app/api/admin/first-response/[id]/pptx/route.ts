/**
 * GET /api/admin/first-response/:id/pptx
 *
 * Generates an editable PowerPoint (.pptx) of the carousel slides so
 * the SMM can either:
 *   • Open in PowerPoint / Keynote and edit text/images directly
 *   • Import into Canva (Canva supports .pptx import — each text box
 *     and image becomes an editable element in Canva)
 *
 * Why .pptx (vs SVG / PDF / native Canva API):
 *   • Canva's native API requires an enterprise Connect app + OAuth.
 *     Months of compliance work for one client.
 *   • SVG is editable but Canva's SVG import is lossy — text often
 *     becomes paths.
 *   • PDF is not editable in Canva at all.
 *   • .pptx with pptxgenjs gives every text run + image as a real
 *     editable object on Canva import. Zero infra, ships today.
 *
 * Layout is a stripped-down version of the Satori-rendered slides:
 *   • Same brand palette (forest / cream / amber / red)
 *   • Same composition (eyebrow → title → body / photo top + panel bottom)
 *   • System fonts (PowerPoint substitutes if the user doesn't have
 *     Bowlby/Lora/DM Sans/Caveat installed — the SMM can re-pick in Canva)
 *
 * Render-time hero photo enforcement runs here too — same pattern as
 * the slide + social-image routes. The .pptx never ships without a
 * photo on the hero if one was available.
 */

import type PptxGenJSType from "pptxgenjs";
import { requireAdminSession } from "@/lib/admin-session";

// Convenience aliases — the pptxgenjs namespace exports the inner
// types under the same identifier as the default class.
type PptxInstance = InstanceType<typeof PptxGenJSType>;
type SlideInstance = ReturnType<PptxInstance["addSlide"]>;
import { getLogoDataUri } from "@/lib/brand-assets";
import {
  getImageryById,
  listImageryForEvent,
} from "@/lib/external-imagery";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  pickBestCandidateForEvent,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import {
  getCandidateMediaForEvent,
  getMediaById,
} from "@/lib/media-library";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import {
  CAMPAIGNS,
  isValidCampaign,
  type CampaignSlug,
} from "@/lib/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Image fetches (8+) + pptx assembly can run ~15s in cold start;
// 60s leaves comfortable headroom on Vercel Pro.
export const maxDuration = 60;

/* ─── DR palette (PowerPoint hex, no #) ─────────────────────────── */

const DR = {
  forest: "1F4D3B",
  forestDeep: "163827",
  cream: "F7F3E8",
  amber: "E0A636",
  amberDeep: "B97F23",
  red: "C0392B",
  white: "FFFFFF",
} as const;

/* ─── Helpers ───────────────────────────────────────────────────── */

/** Fetch any image (DR media library OR external imagery) as a data
 *  URI suitable for pptxgenjs's addImage({ data }) call. Returns null
 *  on failure — the slide is still generated, just without the photo. */
async function fetchImageDataUri(
  mediaId: string | null
): Promise<string | null> {
  if (!mediaId) return null;
  try {
    if (mediaId.startsWith("dr:")) {
      const media = await getMediaById(mediaId.slice(3));
      if (!media || media.archivedAt) return null;
      const res = await fetch(media.publicUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const mime =
        res.headers.get("content-type") ?? media.mimeType ?? "image/jpeg";
      return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    }
    if (mediaId.startsWith("ext:")) {
      const ext = await getImageryById(mediaId.slice(4));
      if (!ext || ext.archivedAt) return null;
      const res = await fetch(ext.url, {
        headers: {
          "User-Agent":
            "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)",
        },
      });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const mime = res.headers.get("content-type") ?? "image/jpeg";
      return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
    }
  } catch (err) {
    console.warn(
      `[pptx] image fetch failed for ${mediaId}:`,
      err instanceof Error ? err.message : err
    );
  }
  return null;
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

  // Same render-time hero photo enforcement as the slide + social-image
  // routes — if the stored packet has hero.media_id = null and a DR
  // library candidate fits, override for this export.
  let enforcedSlides: LaunchPacket["carousel_slides"] = packet.carousel_slides;
  const heroIndex = packet.carousel_slides.findIndex((s) => s.layout === "hero");
  if (heroIndex !== -1 && !packet.carousel_slides[heroIndex]!.media_id) {
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
        enforcedSlides = enforcedSlides.map((s, i) =>
          i === heroIndex
            ? { ...s, media_id: best.id, logo_variant: "white" }
            : s
        );
      }
    } catch {
      /* non-fatal */
    }
  }

  // Resolve the campaign URL for the CTA slide.
  const topCampaign = event.matchedCampaigns.find((c) =>
    isValidCampaign(c)
  ) as CampaignSlug | undefined;
  const campaignPath = topCampaign
    ? CAMPAIGN_LANDING_PATHS[topCampaign]
    : "/donate";
  const ctaUrl = `deenrelief.org${campaignPath}`;
  const campaignLabel =
    topCampaign && isValidCampaign(topCampaign) ? CAMPAIGNS[topCampaign] : null;

  // Pre-fetch logos + every slide's media in parallel — keeps the
  // route under the maxDuration budget.
  const [logoOnLight, logoOnDark, ...slideMedia] = await Promise.all([
    getLogoDataUri("logo-on-light"),
    getLogoDataUri("logo-on-dark"),
    ...enforcedSlides.map((s) => fetchImageDataUri(s.media_id ?? null)),
  ]);

  // Build the deck.
  // pptxgenjs is a CJS module; import it dynamically to avoid bloating
  // the cold-start of any route that imports this module's exports.
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "DR_SQUARE";
  pptx.defineLayout({ name: "DR_SQUARE", width: 10, height: 10 });
  pptx.title = `DR — ${packet.headline.slice(0, 60)}`;
  pptx.subject = "Deen Relief launch packet";

  for (let i = 0; i < enforcedSlides.length; i += 1) {
    const slide = enforcedSlides[i]!;
    const media = slideMedia[i] ?? null;
    buildSlide({
      pptx,
      slide,
      media,
      slideIndex: i + 1,
      slideTotal: enforcedSlides.length,
      logoOnLight: logoOnLight?.dataUri ?? null,
      logoOnDark: logoOnDark?.dataUri ?? null,
      ctaUrl,
      campaignLabel,
    });
  }

  // Final slide: caption + hashtags + CTA URL as plain editable text
  // so the SMM has everything in one file.
  buildCaptionSlide({
    pptx,
    caption: packet.social_post.caption,
    hashtags: packet.social_post.hashtags,
    ctaUrl,
  });

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = `DR-${event.id.slice(0, 8)}-packet.pptx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/* ─── Slide builders ────────────────────────────────────────────── */

type Slide = LaunchPacket["carousel_slides"][number];

function buildSlide({
  pptx,
  slide,
  media,
  slideIndex,
  slideTotal,
  logoOnLight,
  logoOnDark,
  ctaUrl,
  campaignLabel,
}: {
  pptx: PptxInstance;
  slide: Slide;
  media: string | null;
  slideIndex: number;
  slideTotal: number;
  logoOnLight: string | null;
  logoOnDark: string | null;
  ctaUrl: string;
  campaignLabel: string | null;
}) {
  const isCta = slide.layout === "cta";
  const hasPhoto = !isCta && media != null;
  const s = pptx.addSlide();

  // Background colour swaps for CTA (cream canvas with green type).
  s.background = { color: isCta ? DR.cream : DR.forest };
  const fg = isCta ? DR.forest : DR.cream;

  if (hasPhoto) {
    // Photo full-bleed top 62% of the slide. The remaining 38% is the
    // dark green text panel.
    s.addImage({
      data: media!,
      x: 0,
      y: 0,
      w: 10,
      h: 6.2,
      sizing: { type: "cover", w: 10, h: 6.2 },
    });
    // Bottom panel as a forest-green rectangle so the panel reads even
    // if the photo's bottom edge happens to be green/light.
    s.addShape("rect" as never, {
      x: 0,
      y: 6.2,
      w: 10,
      h: 3.8,
      fill: { color: DR.forest },
      line: { type: "none" },
    });
  }

  // Logo top-left. Variant follows slide.logo_variant when set.
  const logo = slide.logo_variant === "green" ? logoOnLight : logoOnDark;
  if (logo) {
    s.addImage({
      data: logo,
      x: 0.3,
      y: 0.25,
      w: 1.9,
      h: 0.6,
      sizing: { type: "contain", w: 1.9, h: 0.6 },
    });
  } else {
    // Fallback wordmark when no uploaded brand asset.
    s.addText("DEEN RELIEF", {
      x: 0.3,
      y: 0.3,
      w: 3,
      h: 0.5,
      fontSize: 22,
      bold: true,
      fontFace: "Arial Black",
      color: isCta ? DR.forest : DR.cream,
    });
  }

  // Slide pip (carousel position) top-right.
  s.addText(`${slideIndex} / ${slideTotal}`, {
    x: 8.2,
    y: 0.3,
    w: 1.5,
    h: 0.4,
    align: "right",
    fontSize: 12,
    bold: true,
    fontFace: "Arial",
    color: hasPhoto ? DR.cream : fg,
    charSpacing: 4,
  });

  // ── Body layout switches on photo presence + layout ──
  const panelY = hasPhoto ? 6.4 : 1.7;
  const panelH = hasPhoto ? 3.6 : 7.5;
  const panelPad = hasPhoto ? 0.4 : 0.6;

  if (slide.eyebrow) {
    s.addText(`${slide.eyebrow.toLowerCase()}…`, {
      x: panelPad,
      y: panelY,
      w: 10 - panelPad * 2,
      h: 0.4,
      fontSize: hasPhoto ? 16 : 22,
      italic: true,
      fontFace: "Brush Script MT",
      color: DR.amber,
      align: hasPhoto ? "left" : "center",
    });
  }

  if (slide.layout === "tiers") {
    buildTierBody({ s, slide, fg, panelPad });
  } else if (isCta) {
    buildCtaBody({ s, slide, ctaUrl, campaignLabel });
  } else {
    buildDisplayBody({ s, slide, fg, hasPhoto, panelY, panelH, panelPad });
  }

  // Footer: source attribution on left, URL/charity on right.
  if (!hasPhoto && !isCta) {
    if (slide.source_attribution) {
      s.addText(slide.source_attribution, {
        x: 0.4,
        y: 9.4,
        w: 6,
        h: 0.4,
        fontSize: 10,
        italic: true,
        fontFace: "Arial",
        color: fg,
        transparency: 40,
      });
    }
    s.addText("deenrelief.org · Charity No. 1158608", {
      x: 4,
      y: 9.4,
      w: 5.6,
      h: 0.4,
      align: "right",
      fontSize: 10,
      bold: true,
      fontFace: "Arial",
      color: fg,
      charSpacing: 2,
      transparency: 30,
    });
  }
}

function buildDisplayBody({
  s,
  slide,
  fg,
  hasPhoto,
  panelY,
  panelH,
  panelPad,
}: {
  s: SlideInstance;
  slide: Slide;
  fg: string;
  hasPhoto: boolean;
  panelY: number;
  panelH: number;
  panelPad: number;
}) {
  // Title scales by length — keep it editable, don't over-format.
  const titleSize =
    slide.title.length > 40 ? 36 : slide.title.length > 24 ? 48 : 60;
  const useUppercase = slide.layout !== "testimony" && slide.layout !== "chapter";
  const titleText = useUppercase ? slide.title.toUpperCase() : slide.title;

  s.addText(titleText, {
    x: panelPad,
    y: hasPhoto ? panelY + 0.5 : panelY + 0.6,
    w: 10 - panelPad * 2,
    h: hasPhoto ? 1.6 : 4.5,
    fontSize: hasPhoto ? Math.round(titleSize * 0.55) : titleSize,
    bold: true,
    fontFace:
      slide.layout === "testimony" || slide.layout === "chapter"
        ? "Georgia"
        : "Impact",
    italic: slide.layout === "testimony" || slide.layout === "chapter",
    color: fg,
    align: hasPhoto ? "left" : "center",
    valign: "top",
  });

  if (slide.body) {
    s.addText(slide.body, {
      x: panelPad + 0.2,
      y: hasPhoto ? panelY + 2.3 : panelY + 5.3,
      w: 10 - (panelPad + 0.2) * 2,
      h: 1.1,
      fontSize: hasPhoto ? 14 : 18,
      fontFace: "Arial",
      color: fg,
      transparency: 20,
      align: hasPhoto ? "left" : "center",
      valign: "top",
    });
  }
  // Suppress unused-param warnings — panelH reserved for future use.
  void panelH;
}

function buildTierBody({
  s,
  slide,
  fg,
  panelPad,
}: {
  s: SlideInstance;
  slide: Slide;
  fg: string;
  panelPad: number;
}) {
  s.addText((slide.title || "EVERY GIFT COUNTS").toUpperCase(), {
    x: panelPad,
    y: 2.2,
    w: 10 - panelPad * 2,
    h: 1,
    fontSize: 44,
    bold: true,
    fontFace: "Impact",
    color: fg,
    align: "center",
  });

  const tiers = slide.tier_lines ?? [];
  tiers.forEach((tier, i) => {
    const y = 3.8 + i * 1.5;
    // Amount on the left.
    s.addText(`£${tier.amount_gbp}`, {
      x: 1,
      y,
      w: 2.5,
      h: 1.1,
      fontSize: 56,
      bold: true,
      fontFace: "Impact",
      color: DR.amber,
      align: "left",
      valign: "middle",
    });
    // Description on the right.
    s.addText(tier.short_description.toUpperCase(), {
      x: 3.6,
      y,
      w: 5.6,
      h: 1.1,
      fontSize: 18,
      bold: true,
      fontFace: "Arial",
      color: fg,
      align: "left",
      valign: "middle",
      charSpacing: 2,
    });
  });
}

function buildCtaBody({
  s,
  slide,
  ctaUrl,
  campaignLabel,
}: {
  s: SlideInstance;
  slide: Slide;
  ctaUrl: string;
  campaignLabel: string | null;
}) {
  s.addText("every gift counts…", {
    x: 0.5,
    y: 2.4,
    w: 9,
    h: 0.6,
    fontSize: 26,
    italic: true,
    fontFace: "Brush Script MT",
    color: DR.amber,
    align: "center",
  });

  s.addText((slide.title || "DONATE NOW").toUpperCase(), {
    x: 0.5,
    y: 3.4,
    w: 9,
    h: 2.6,
    fontSize: 130,
    bold: true,
    fontFace: "Impact",
    color: DR.red,
    align: "center",
    valign: "top",
  });

  s.addText(ctaUrl.toUpperCase(), {
    x: 0.5,
    y: 6.6,
    w: 9,
    h: 0.7,
    fontSize: 28,
    bold: true,
    fontFace: "Impact",
    color: DR.amber,
    align: "center",
    charSpacing: 4,
  });

  if (campaignLabel) {
    s.addText(`${campaignLabel} · Charity No. 1158608 · Brighton, UK`, {
      x: 0.5,
      y: 7.5,
      w: 9,
      h: 0.4,
      fontSize: 12,
      fontFace: "Arial",
      color: DR.forest,
      align: "center",
      transparency: 40,
    });
  }
}

function buildCaptionSlide({
  pptx,
  caption,
  hashtags,
  ctaUrl,
}: {
  pptx: PptxInstance;
  caption: string;
  hashtags: string[];
  ctaUrl: string;
}) {
  const s = pptx.addSlide();
  s.background = { color: DR.cream };

  s.addText("CAPTION + HASHTAGS", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.4,
    fontSize: 11,
    bold: true,
    fontFace: "Arial",
    color: DR.forest,
    charSpacing: 4,
    transparency: 50,
  });

  s.addText("For Instagram, Facebook, X", {
    x: 0.5,
    y: 0.9,
    w: 9,
    h: 0.3,
    fontSize: 10,
    italic: true,
    fontFace: "Arial",
    color: DR.forest,
    transparency: 40,
  });

  s.addText(caption, {
    x: 0.5,
    y: 1.6,
    w: 9,
    h: 4,
    fontSize: 18,
    fontFace: "Arial",
    color: DR.forest,
    valign: "top",
  });

  s.addText(
    hashtags.map((h) => `#${h}`).join("  "),
    {
      x: 0.5,
      y: 6,
      w: 9,
      h: 1.5,
      fontSize: 14,
      bold: true,
      fontFace: "Arial",
      color: DR.amberDeep,
      valign: "top",
    }
  );

  s.addText(`Link: ${ctaUrl}`, {
    x: 0.5,
    y: 8.5,
    w: 9,
    h: 0.6,
    fontSize: 16,
    bold: true,
    fontFace: "Impact",
    color: DR.forest,
    align: "center",
  });
}
