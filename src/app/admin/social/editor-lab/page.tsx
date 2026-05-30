import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import CanvasDeckEditor from "../deck-builder/[eventId]/editor/CanvasDeckEditor";
import { DEMO_SLIDE } from "./demo";

export const metadata: Metadata = {
  title: "Editor Lab | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/editor-lab — standalone harness for the Canva-style
 * canvas editor (no event, no persistence). Seeded with a demo hero
 * slide so the canvas mechanics can be exercised in isolation.
 */
export default async function EditorLabPage() {
  await requireAdminSession();
  return (
    <main className="h-screen w-screen overflow-hidden">
      <CanvasDeckEditor initialDeck={[DEMO_SLIDE]} title="Editor lab" />
    </main>
  );
}
