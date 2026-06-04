import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload media | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
// Each parallel upload triggers a server-action chain (upload + Vision
// + save). The page renders fast; the actions run as separate function
// invocations so individual file calls each get their own runtime.
// Bumping maxDuration here protects the initial page load when many
// items are being added simultaneously.
export const maxDuration = 60;

/**
 * /admin/social/media-library/new — multi-file queue uploader.
 *
 * The SMM drops one photo or a hundred. Each file streams through
 * upload → AI tag → auto-save independently. The queue UI shows
 * per-item progress; up to 5 process at once. Failures on individual
 * files don't stop the batch.
 *
 * Auto-save policy: each item saves with Claude's suggested metadata
 * as-is — the SMM doesn't review at upload time. She edits any rows
 * that need correction afterwards from the library grid (much faster
 * overall, since ~80% of suggestions are usable as-is).
 */
export default async function UploadMediaPage() {
  await requireAdminSession();
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/admin/social/media-library"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Media library
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          Upload media
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Drop photos here — we&apos;ll tag each one automatically. You can
          fix any tags later in your library.
        </p>
      </div>
      <UploadForm />
    </main>
  );
}
