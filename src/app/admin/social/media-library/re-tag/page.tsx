import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { listMedia } from "@/lib/media-library";
import RetagReviewQueue from "./RetagReviewQueue";

export const metadata: Metadata = {
  title: "Auto re-tag | Media library | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
// Re-tagging is sequential per item with ~5s per Vision call; the
// SMM kicks each off individually so a single request timeout isn't
// the cap, but raise the default in case they smash 'Re-tag all'.
export const maxDuration = 180;

/**
 * /admin/social/media-library/re-tag
 *
 * Batch review tool. Lists every non-archived library item; the SMM
 * clicks 'Re-tag' per card (or 'Re-tag all' at top) and Claude Vision
 * proposes fresh metadata. The current row's values render alongside
 * the proposal as a coloured diff. The SMM applies or discards.
 *
 * Why this tool exists: bulk-import auto-tagging at upload time is
 * imprecise. Once the library has 60+ photos, miscategorisations
 * compound and downstream tools (the First Response packet generator)
 * pick the wrong photos. This page lets the SMM clean up the library
 * in one focused sitting without editing each row by hand.
 */
export default async function RetagPage() {
  await requireAdminSession();

  // Re-tagger applies to every non-archived row. Capped at 200 to
  // keep the page render fast; if the library grows past that we'll
  // paginate.
  const items = await listMedia({ limit: 200 });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <Link
          href="/admin/social/media-library"
          className="text-[12px] font-bold tracking-[0.16em] uppercase text-charcoal/55 hover:text-charcoal/80 transition-colors"
        >
          ← Media library
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-charcoal mt-3 mb-2">
          Auto re-tag
        </h1>
        <p className="text-charcoal/65 text-[14px] leading-relaxed max-w-2xl">
          Let us suggest better tags for your photos. You&apos;ll see the old
          and new side by side — keep or skip each one. {items.length}{" "}
          photos in your library.
        </p>
      </div>

      <RetagReviewQueue items={items} />
    </main>
  );
}
