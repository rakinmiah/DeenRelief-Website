import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { getLatestBrandAssetStamp } from "@/lib/brand-assets";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { CAMPAIGN_LANDING_PATHS } from "@/lib/short-links";
import EventControls from "./EventControls";
import CopyButton from "./CopyButton";
import DebugPanel from "./DebugPanel";
import PacketAssets from "./PacketAssets";

export const metadata: Metadata = {
  title: "Emergency event | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/first-response/[id] — single emergency event detail.
 *
 * Shows everything the SMM/trustee needs to decide whether to launch an
 * appeal: source data, matched campaigns, the priority score, and (if
 * generated) the full launch packet ready to copy into Canva / Buffer /
 * email tooling. The "Draft launch packet" button kicks off the Claude
 * call (see actions.ts).
 *
 * Accessible to both 'admin' and 'social' roles.
 */
export default async function EmergencyEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;
  const [event, brandStamp] = await Promise.all([
    getEmergencyEventById(id),
    // Mix the latest brand-asset upload time into the cache-buster
    // below so uploading new logos invalidates the slide/social-image
    // PNG cache without needing a packet redraft.
    getLatestBrandAssetStamp(),
  ]);
  if (!event) notFound();

  // Defensive parse of the stored packet — in normal flow this matches the
  // schema, but a schema change between drafts would surface as null here
  // rather than crash the page.
  const parsed = event.draftPacketJson
    ? LaunchPacketSchema.safeParse(event.draftPacketJson)
    : null;
  const packet: LaunchPacket | null = parsed?.success ? parsed.data : null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social/first-response"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← First Response
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-charcoal leading-tight max-w-3xl">
              {event.title}
            </h1>
            <p className="text-charcoal/60 text-[13px] mt-1.5 flex flex-wrap items-center gap-x-2">
              <span className="uppercase font-bold tracking-[0.08em]">
                {event.source}
              </span>
              {event.eventType && (
                <>
                  <span className="text-charcoal/20">·</span>
                  <span className="capitalize">
                    {event.eventType.replace(/_/g, " ")}
                  </span>
                </>
              )}
              {event.countryIso && (
                <>
                  <span className="text-charcoal/20">·</span>
                  <span>{event.countryIso}</span>
                </>
              )}
              {event.region && (
                <>
                  <span className="text-charcoal/20">·</span>
                  <span>{event.region}</span>
                </>
              )}
              <span className="text-charcoal/20">·</span>
              <span>
                {event.detectedAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {event.drPriorityScore !== null && (
              <span
                className={`text-[12px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full ${scoreClasses(event.drPriorityScore)}`}
              >
                Score {event.drPriorityScore.toFixed(1)}
              </span>
            )}
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-charcoal/50">
              {event.status}
            </span>
          </div>
        </div>
        {event.sourceUrl && (
          <p className="mt-3 text-[13px]">
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-charcoal/70 underline underline-offset-2 hover:text-charcoal"
            >
              Source →
            </a>
          </p>
        )}
      </div>

      {/* ─── Summary ─── */}
      {event.summary && (
        <section className="mb-6 bg-cream/60 border border-charcoal/10 rounded-2xl p-5">
          <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-charcoal/50 mb-2">
            Source summary
          </h2>
          <p className="text-charcoal/80 text-sm leading-relaxed whitespace-pre-line">
            {event.summary}
          </p>
        </section>
      )}

      {/* ─── Matched campaigns ─── */}
      {event.matchedCampaigns.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-bold tracking-[0.18em] uppercase text-charcoal/50 mb-2">
            Matched campaigns (ranked by coverage weight)
          </h2>
          <div className="flex flex-wrap gap-2">
            {event.matchedCampaigns.map((slug) => (
              <span
                key={slug}
                className="inline-block text-[12px] font-semibold text-charcoal bg-cream border border-charcoal/10 px-3 py-1.5 rounded-full"
              >
                {isValidCampaign(slug)
                  ? CAMPAIGNS[slug as CampaignSlug]
                  : slug}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ─── Launched banner (if already launched) ─── */}
      {event.appealLaunchedAt && (
        <section className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 md:px-6 py-4 flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 mt-0.5 text-base">
            🚀
          </span>
          <div>
            <p className="text-red-900 font-semibold text-[14px]">
              Appeal launched —{" "}
              {event.appealLaunchedAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              by {event.appealLaunchedByEmail ?? "—"}
            </p>
            <p className="text-red-900/70 text-[13px] mt-0.5 leading-relaxed">
              /now spotlight is pointing at the matched campaign for 7
              days + admin push fired. The site banner and homepage
              featured campaign were NOT changed — flip those manually
              in Campaign Command Center if you want them updated too.
            </p>
          </div>
        </section>
      )}

      {/* ─── Controls ─── */}
      <section className="mb-8 bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6">
        <EventControls
          eventId={event.id}
          hasDraft={packet !== null}
          status={event.status}
          alreadyLaunched={event.appealLaunchedAt !== null}
        />
        {event.draftPacketGeneratedAt && (
          <p className="mt-3 pt-3 border-t border-charcoal/5 text-[12px] text-charcoal/55">
            Drafted{" "}
            {event.draftPacketGeneratedAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            by {event.draftPacketGeneratedByEmail ?? "—"} ·{" "}
            {event.draftPacketModel ?? "—"} ·{" "}
            {event.draftPacketInputTokens ?? "?"}/
            {event.draftPacketOutputTokens ?? "?"} tokens in/out
          </p>
        )}
      </section>

      {/* ─── Launch packet ─── */}
      {packet && (
        <PacketView
          packet={packet}
          eventId={event.id}
          // Strategy brief surfaces 'Claude's thinking' — useful to
          // admins for tuning prompts, but noisy for the SMM whose
          // job is to ship the packet. Hidden when role=social.
          showStrategyBrief={session.role !== "social"}
          // Combine packet draft time + latest brand-asset upload time
          // into one cache-buster value. Either changing forces fresh
          // PNG fetches in the browser, so newly uploaded logos appear
          // immediately without requiring a packet redraft.
          draftStamp={Math.max(
            event.draftPacketGeneratedAt?.getTime() ?? 0,
            brandStamp
          )}
          matchedCampaigns={event.matchedCampaigns}
        />
      )}

      {!packet && parsed && !parsed.success && (
        <div className="bg-amber-light/60 border border-amber/30 rounded-2xl p-5 text-[13px] text-charcoal/80">
          A draft is stored but it doesn&apos;t match the current schema —
          probably the schema changed since this packet was generated. Click
          &ldquo;Redraft packet&rdquo; to regenerate.
        </div>
      )}

      {/* Debug panel — collapsed by default. Shows candidate query
          inputs, candidates returned, and per-slide selection so the
          SMM can diagnose why imagery is/isn't appearing. */}
      <DebugPanel eventId={event.id} />
    </main>
  );
}

function scoreClasses(score: number): string {
  if (score >= 20) return "bg-red-100 text-red-800";
  if (score >= 10) return "bg-amber-light text-amber-dark";
  return "bg-charcoal/8 text-charcoal/70";
}

/* ─── Packet view (server component) ─── */

function PacketView({
  packet,
  eventId,
  draftStamp,
  matchedCampaigns,
  showStrategyBrief,
}: {
  packet: LaunchPacket;
  eventId: string;
  draftStamp: number;
  matchedCampaigns: string[];
  /** Admin-only by request. SMM sees the packet ready-to-ship; the
   *  brief is a tuning surface for the engineer/admin role. */
  showStrategyBrief: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Strategy brief — Claude's thinking BEFORE drafting. Admin-
          only; hidden for the SMM role per request. */}
      {showStrategyBrief && (
      <Section title="Claude's strategy brief">
        <div className="text-[13px] text-charcoal/85 leading-relaxed space-y-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-charcoal/45 mb-1">
              The human angle
            </div>
            <p>{packet.strategy_brief.angle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
            <div className="bg-cream-soft/40 border border-charcoal/10 rounded-xl p-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-charcoal/45 mb-1">
                Narrative arc
              </div>
              <p className="font-mono">{packet.strategy_brief.arc}</p>
            </div>
            <div className="bg-cream-soft/40 border border-charcoal/10 rounded-xl p-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-charcoal/45 mb-1">
                Slide count · {packet.strategy_brief.slide_count}
              </div>
              <p>{packet.strategy_brief.slide_count_rationale}</p>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-charcoal/45 mb-1.5">
              Register per surface
            </div>
            <ul className="text-[12px] space-y-1">
              <li>
                <span className="font-mono text-charcoal/55">caption →</span>{" "}
                {packet.strategy_brief.register_per_surface.caption}
              </li>
              <li>
                <span className="font-mono text-charcoal/55">slides →</span>{" "}
                {packet.strategy_brief.register_per_surface.slides}
              </li>
              <li>
                <span className="font-mono text-charcoal/55">email →</span>{" "}
                {packet.strategy_brief.register_per_surface.email}
              </li>
              <li>
                <span className="font-mono text-charcoal/55">press →</span>{" "}
                {packet.strategy_brief.register_per_surface.press}
              </li>
            </ul>
          </div>
        </div>
      </Section>
      )}

      {/* Tiers */}
      <Section title="Donation tiers">
        <ul className="divide-y divide-charcoal/5">
          {packet.donation_tiers.map((tier, i) => (
            <li
              key={i}
              className="py-2.5 flex items-start justify-between gap-3"
            >
              <span className="font-mono font-bold text-charcoal w-16 shrink-0">
                £{tier.amount_gbp.toLocaleString()}
              </span>
              <span className="text-charcoal/80 text-sm leading-relaxed flex-1">
                {tier.description}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Verified facts */}
      <Section title="Verified facts">
        <ul className="space-y-2">
          {packet.verified_facts.map((f, i) => (
            <li key={i} className="text-sm">
              <p className="text-charcoal/85">{f.fact}</p>
              <p className="text-[11px] text-charcoal/55 font-mono mt-0.5">
                {f.source}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Field operations note */}
      <Section title="Field operations">
        <p className="text-charcoal/85 text-sm leading-relaxed whitespace-pre-line">
          {packet.field_operations_note}
        </p>
      </Section>

      {/* Social post caption — same across all three platforms. */}
      <Section title="Social post caption (Instagram · Facebook · X)">
        <SocialPostBlock
          caption={packet.social_post.caption}
          hashtags={packet.social_post.hashtags}
          campaignPath={topCampaignPath(matchedCampaigns)}
        />
      </Section>

      {/* Carousel slides + single-image post — both render with the
          click-to-zoom lightbox via PacketAssets (Phase 4z). Single
          client component so the lightbox can navigate across all
          assets in the packet without state coordination. */}
      <Section title="Carousel slides (Instagram + Facebook) + X post">
        <p className="text-charcoal/65 text-[13px] mb-4 leading-relaxed">
          {packet.carousel_slides.length} carousel slides (1080×1080) —
          post these as a carousel on <strong>both Instagram and Facebook</strong>{" "}
          (Facebook supports carousels natively and they outperform single
          images for storytelling). Plus one 1200×675 single-image post
          for <strong>X (Twitter)</strong> where carousels aren&apos;t
          native. Click any thumbnail to zoom — arrow keys walk the set.
        </p>
        <PacketAssets
          eventId={eventId}
          carouselCount={packet.carousel_slides.length}
          draftStamp={draftStamp}
        />
        {/* Editable export — Canva / PowerPoint round-trip. */}
        <div className="mt-6 bg-amber-light/40 border border-amber/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-amber-dark mb-0.5">
              Need to edit a slide?
            </p>
            <p className="text-[13px] text-charcoal/85 leading-relaxed">
              Download the whole packet as an editable PowerPoint. Open it
              in Keynote / PowerPoint to tweak directly, or{" "}
              <a
                href="https://www.canva.com/help/upload-existing-presentation/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                import into Canva
              </a>{" "}
              — every text box, image and shape becomes editable.
            </p>
          </div>
          <a
            href={`/api/admin/first-response/${eventId}/pptx`}
            className="shrink-0 px-5 py-2.5 rounded-full bg-charcoal text-white text-[13px] font-semibold hover:bg-charcoal/85 transition-colors"
            download
          >
            ↓ Download .pptx (editable)
          </a>
        </div>
      </Section>

      {/* Email */}
      <Section title="Email">
        <div className="mb-3">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55 mb-2">
            Subject lines (A/B candidates)
          </p>
          <ul className="space-y-1.5">
            {packet.email.subject_lines.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 bg-cream/60 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-charcoal/90">{s}</span>
                <CopyButton text={s} />
              </li>
            ))}
          </ul>
        </div>
        <PacketField label="Body" text={packet.email.body} multiline />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6">
      <h2 className="text-charcoal font-heading font-semibold text-[16px] mb-3 pb-3 border-b border-charcoal/5">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PacketField({
  label,
  text,
  multiline,
}: {
  label?: string;
  text: string;
  multiline?: boolean;
}) {
  return (
    <div className="mb-3 last:mb-0">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55">
            {label}
          </p>
          <CopyButton text={text} />
        </div>
      )}
      <p
        className={`text-charcoal/85 text-sm leading-relaxed ${
          multiline ? "whitespace-pre-line" : ""
        }`}
      >
        {text}
      </p>
      {!label && (
        <div className="mt-2 text-right">
          <CopyButton text={text} />
        </div>
      )}
    </div>
  );
}

/**
 * Top-matched campaign path — picks the first slug in matched_campaigns
 * that is a valid known campaign and returns its landing path (e.g.
 * 'palestine' → '/palestine'). Falls back to '/donate' when no valid
 * match exists. Used for the X-friendly caption variant + the social
 * image overlay URL.
 */
function topCampaignPath(matchedCampaigns: string[]): string {
  for (const slug of matchedCampaigns) {
    if (isValidCampaign(slug)) {
      return CAMPAIGN_LANDING_PATHS[slug as CampaignSlug];
    }
  }
  return "/donate";
}

/**
 * Single unified social post — shown once, posts identically across
 * Instagram, Facebook, and the IG-style version of X. We also surface
 * an X-only caption variant where "Link in bio to donate" is swapped
 * for the campaign URL (X allows inline URLs; IG does not, FB tolerates
 * either).
 */
function SocialPostBlock({
  caption,
  hashtags,
  campaignPath,
}: {
  caption: string;
  hashtags: string[];
  campaignPath: string;
}) {
  const withHashtags = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;

  // X variant: replace any "link in bio to donate" / "link in bio"
  // phrasing with the campaign URL. Case-insensitive.
  const xUrl = `deenrelief.org${campaignPath}`;
  const xCaption = caption
    .replace(/link in bio to donate/gi, xUrl)
    .replace(/link in bio/gi, xUrl);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55">
          Caption · {caption.length} chars (≤280 fits X)
        </p>
        <div className="flex items-center gap-2">
          <CopyButton text={caption} />
          <CopyButton text={withHashtags} />
        </div>
      </div>
      <p className="text-charcoal/85 text-sm leading-relaxed whitespace-pre-line bg-cream/40 rounded-lg px-4 py-3">
        {caption}
      </p>
      <p className="mt-3 text-[12px] text-charcoal/55 font-mono leading-relaxed">
        {hashtags.map((h) => `#${h}`).join("  ")}
      </p>

      {xCaption !== caption && (
        <div className="mt-5 pt-4 border-t border-charcoal/8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              X variant · URL inlined · {xCaption.length} chars
            </p>
            <CopyButton text={xCaption} />
          </div>
          <p className="text-charcoal/85 text-sm leading-relaxed whitespace-pre-line bg-amber-light/30 rounded-lg px-4 py-3">
            {xCaption}
          </p>
          <p className="mt-2 text-[11px] text-charcoal/45 leading-relaxed">
            X allows inline URLs but Instagram suppresses them. This
            variant swaps &ldquo;Link in bio to donate&rdquo; for{" "}
            <span className="font-mono">{xUrl}</span> — use this version
            when posting to X.
          </p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-charcoal/45 leading-relaxed">
        The main caption posts identically on Instagram and Facebook
        (≤280 chars covers X&apos;s ceiling too). For X, use the
        URL-inlined variant above.
      </p>
    </div>
  );
}

