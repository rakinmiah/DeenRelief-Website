import Link from "next/link";
import type { Metadata } from "next";
import { loadOrphanContext, loadUpdates } from "../data";
import { formatMonthYear, formatFullDate } from "../format";

export const metadata: Metadata = { title: "Updates" };
export const dynamic = "force-dynamic";

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orphan } = await loadOrphanContext(slug);
  const updates = await loadUpdates(orphan.id);
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
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {updates.length === 0 ? (
          <p className="text-grey py-6">
            No updates yet — we&apos;ll post the first one soon.
          </p>
        ) : (
          <div className="space-y-10">
            {updates.map((u) => (
              <article
                key={u.id}
                className="grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-1.5 sm:gap-6"
              >
                <div className="sm:text-right sm:pt-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                    {u.periodLabel || formatMonthYear(u.publishedAt)}
                  </span>
                  {u.publishedAt && (
                    <span className="block text-xs text-grey/55 mt-0.5">
                      {formatFullDate(u.publishedAt)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  {u.title && (
                    <h2 className="text-xl font-heading font-bold text-charcoal leading-tight mb-2.5">
                      {u.title}
                    </h2>
                  )}
                  {u.bodyHtml ? (
                    <div className="dr-prose" dangerouslySetInnerHTML={{ __html: u.bodyHtml }} />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
