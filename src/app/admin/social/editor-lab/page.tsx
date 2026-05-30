import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import { DEMO_SLIDE } from "./demo";
import SlideEditor from "./SlideEditor";

export const metadata: Metadata = {
  title: "Editor Lab | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/editor-lab — a standalone harness for the Canva-style
 * slide editor (Phase 10a/10b). Seeded with a demo hero slide so the
 * canvas + transform mechanics can be exercised in isolation before
 * they're wired into the real deck-builder flow.
 */
export default async function EditorLabPage() {
  await requireAdminSession();
  return (
    <main className="h-screen w-screen overflow-hidden">
      <SlideEditor slide={DEMO_SLIDE} />
    </main>
  );
}
