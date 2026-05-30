import Link from "next/link";
import type { Metadata } from "next";
import { loadOrphanContext, loadGallery } from "../data";
import MediaGallery from "../MediaGallery";

export const metadata: Metadata = { title: "Photos & videos" };
export const dynamic = "force-dynamic";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orphan } = await loadOrphanContext(slug);
  const gallery = await loadGallery(orphan.id);
  const base = `/sponsor/orphan/${slug}`;

  return (
    <div className="bg-white">
      <section className="bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-7">
          <Link
            href={base}
            className="inline-flex items-center gap-1 text-sm font-medium text-grey hover:text-green transition-colors"
          >
            ← {orphan.displayName}
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl font-heading font-bold text-charcoal">
            Photos &amp; videos
          </h1>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {gallery.length === 0 ? (
          <p className="text-grey py-6">
            No photos or videos yet — they&apos;ll appear here as we share them.
          </p>
        ) : (
          <MediaGallery items={gallery} />
        )}
      </div>
    </div>
  );
}
