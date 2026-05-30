import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { getEmergencyEventById } from "@/lib/first-response";
import DeckBuilderClient from "./DeckBuilderClient";

export const metadata: Metadata = {
  title: "Deck Builder | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/deck-builder/[eventId] — Phase 6e Compose page.
 *
 * The SMM-facing deck builder. Three columns:
 *   • LEFT   content cards extracted from the event (titles, body,
 *            facts, quotes, hashtags, tier rows, captions). Draggable.
 *   • MIDDLE deck timeline — vertical stack of slides composed from
 *            templates, each showing a live PNG preview.
 *   • RIGHT  image gallery — DR library + external imagery candidates.
 *            Draggable.
 *
 * The page is a thin server shell — it loads the event (so we can show
 * the title in the top bar) and hands off to the client component that
 * does all the drag-and-drop, live-preview, and auto-save work.
 *
 * Accessible to both 'admin' and 'social' roles (this is THE primary
 * SMM tool).
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

  return (
    <main className="min-h-screen bg-[#FAFAF7]">
      <DeckBuilderClient
        eventId={event.id}
        eventTitle={event.title}
        backHref={`/admin/social/first-response/legacy/${event.id}`}
      />
    </main>
  );
}
