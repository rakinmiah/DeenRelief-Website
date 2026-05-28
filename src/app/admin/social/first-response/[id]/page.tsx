import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import {
  LaunchPacketSchema,
  type LaunchPacket,
} from "@/lib/first-response-packet";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import EventControls from "./EventControls";
import CopyButton from "./CopyButton";

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
  await requireAdminSession();
  const { id } = await params;
  const event = await getEmergencyEventById(id);
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
              Banner, featured campaign, /now spotlight, and admin push were
              fired. To roll back, edit Campaign Command Center directly.
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
      {packet && <PacketView packet={packet} eventId={event.id} />}

      {!packet && parsed && !parsed.success && (
        <div className="bg-amber-light/60 border border-amber/30 rounded-2xl p-5 text-[13px] text-charcoal/80">
          A draft is stored but it doesn&apos;t match the current schema —
          probably the schema changed since this packet was generated. Click
          &ldquo;Redraft packet&rdquo; to regenerate.
        </div>
      )}
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
}: {
  packet: LaunchPacket;
  eventId: string;
}) {
  return (
    <div className="space-y-6">
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

      {/* Social */}
      <Section title="Social post (Instagram · Facebook · X)">
        <SocialPostBlock
          caption={packet.social_post.caption}
          hashtags={packet.social_post.hashtags}
        />
      </Section>

      {/* Carousel slides — server-rendered PNGs ready to upload */}
      <Section title="Carousel slides">
        <p className="text-charcoal/65 text-[13px] mb-4 leading-relaxed">
          Five 1080×1080 brand-styled slides. Right-click any to copy, or
          use the download button to save individually. Upload as an
          Instagram/Facebook carousel in this order.
        </p>
        <CarouselGrid eventId={eventId} count={packet.carousel_slides.length} />
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

      {/* Press release */}
      <Section title="Press release">
        <PacketField text={packet.press_release} multiline />
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
 * Single unified social post — shown once, posts identically to IG/FB/X.
 * Two copy buttons: caption-only, and caption+hashtags appended.
 */
function SocialPostBlock({
  caption,
  hashtags,
}: {
  caption: string;
  hashtags: string[];
}) {
  const withHashtags = `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55">
          Caption · {caption.length}/270 chars
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
      <p className="mt-3 text-[11px] text-charcoal/45 leading-relaxed">
        The same caption posts identically on Instagram, Facebook, and X
        (≤270 chars covers X&apos;s ceiling). Right-hand copy button
        includes hashtags appended — paste straight into any platform.
      </p>
    </div>
  );
}

/**
 * Carousel slide previews. Each <img> hits the
 * /api/admin/first-response/{id}/slide/{index} route which server-renders
 * the PNG via next/og. Browser caches the image once loaded so the
 * download button hits the same cached PNG.
 *
 * The HTML `download` attribute on the link forces a save dialog with
 * the explicit filename, regardless of the route's inline disposition.
 */
function CarouselGrid({
  eventId,
  count,
}: {
  eventId: string;
  count: number;
}) {
  const slides = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {slides.map((i) => {
        const src = `/api/admin/first-response/${eventId}/slide/${i}`;
        return (
          <div
            key={i}
            className="flex flex-col gap-2 bg-cream/30 rounded-xl p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element --
                  using <img> rather than next/image because the source
                  is a dynamic API route returning a PNG, not a static
                  optimisable asset. next/image's loader would add
                  unhelpful overhead here. */}
            <img
              src={src}
              alt={`Carousel slide ${i + 1}`}
              width={1080}
              height={1080}
              className="w-full aspect-square rounded-lg border border-charcoal/10 bg-white"
              loading="lazy"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/55">
                Slide {i + 1}
              </span>
              <a
                href={src}
                download={`deenrelief-slide-${i + 1}.png`}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-charcoal text-white hover:bg-charcoal/85 transition-colors"
              >
                Download
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
