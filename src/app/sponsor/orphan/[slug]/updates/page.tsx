import Link from "next/link";
import type { Metadata } from "next";
import { loadOrphanContext, loadUpdatesWithMedia } from "../data";
import UpdatesTimeline from "../UpdatesTimeline";

export const metadata: Metadata = { title: "Updates" };
export const dynamic = "force-dynamic";

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orphan } = await loadOrphanContext(slug);
  const updates = await loadUpdatesWithMedia(orphan.id);
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
            Updates
          </h1>
          <p className="text-grey text-sm mt-1.5">
            {orphan.displayName}&apos;s journey, month by month. Tap any update to
            read more.
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <UpdatesTimeline updates={updates} />
      </div>
    </div>
  );
}
