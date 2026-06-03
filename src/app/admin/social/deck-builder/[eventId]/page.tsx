import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS, isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { getEmergencyEventById } from "@/lib/first-response";
import { resolveBrandLogo } from "@/lib/social-editor/logo";
import DeckFlow, { type EventSummary } from "./DeckFlow";

export const metadata: Metadata = {
  title: "Deck Builder | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/deck-builder/[eventId] — guided deck flow (Phase 8).
 *
 * A thin server shell: loads the event, then hands off to the DeckFlow
 * wizard (preparing → summary → platform → slide count → build). The
 * wizard fires the real extraction + image fetches up front and leads
 * the SMM into the composer with her choices applied.
 *
 * Accessible to both 'admin' and 'social' roles (THE primary SMM tool).
 */
export default async function DeckBuilderPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAdminSession();
  const { eventId } = await params;
  const event = await getEmergencyEventById(eventId);
  if (!event) notFound();

  // Both logo variants — green (on-light) is the primary mark, white (on-dark)
  // the reversed fallback. The presets pick per slide background.
  const [{ logo }, { logo: logoLight }] = await Promise.all([
    resolveBrandLogo("logo-on-dark"),
    resolveBrandLogo("logo-on-light"),
  ]);

  const summary: EventSummary = {
    id: event.id,
    title: event.title,
    summary: event.summary,
    eventType: event.eventType,
    countryIso: event.countryIso,
    region: event.region,
    source: event.source,
    sourceUrl: event.sourceUrl,
    matchedCampaigns: event.matchedCampaigns.map((slug) =>
      isValidCampaign(slug) ? CAMPAIGNS[slug as CampaignSlug] : slug
    ),
    detectedAtLabel: event.detectedAt
      ? event.detectedAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null,
  };

  return (
    <main className="dr-soft-motion min-h-screen bg-[#FAFAF7]">
      <DeckFlow
        event={summary}
        logo={logo}
        logoLight={logoLight}
        backHref={`/admin/social/first-response/legacy/${event.id}`}
      />
    </main>
  );
}
