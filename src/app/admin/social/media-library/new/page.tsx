import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload media | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/media-library/new — upload one or more images, get
 * Claude Vision tag suggestions, edit, save.
 *
 * The page itself is mostly the form; all interactivity happens in
 * UploadForm (client component) — file pick, base64 encode, dispatch
 * upload action, render suggestions, dispatch save action.
 */
export default async function UploadMediaPage() {
  await requireAdminSession();
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
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
          Drop a photo and Claude will analyse it to suggest a caption,
          tags, campaign matches, tone, and safeguarding flags. Review,
          edit anything that&apos;s off, then save. The library serves
          imagery to launch-packet carousel slides — better tagging now
          means better slide selection later.
        </p>
      </div>
      <UploadForm />
    </main>
  );
}
