import Link from "next/link";
import type { Metadata } from "next";
import { createSignedOrphanMediaUrl } from "@/lib/orphan-media";
import { loadOrphanContext, loadUpdates, loadGallery, snippet } from "./data";
import { formatMonthYear, durationBare } from "./format";
import CardPhotoPreview from "./CardPhotoPreview";

export const metadata: Metadata = { title: "Your sponsored child" };
export const dynamic = "force-dynamic";

function Chevron() {
  return (
    <svg
      className="w-5 h-5 text-charcoal/30 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

const cardCls =
  "block rounded-2xl border border-charcoal/8 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5";

export default async function OrphanHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { orphan, startedOn } = await loadOrphanContext(slug);
  const base = `/sponsor/orphan/${slug}`;

  const [heroUrl, updates, gallery] = await Promise.all([
    orphan.profilePhotoPath
      ? createSignedOrphanMediaUrl(orphan.profilePhotoPath)
      : Promise.resolve(null),
    loadUpdates(orphan.id),
    loadGallery(orphan.id),
  ]);

  const name = orphan.displayName;
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "•";
  const place = [orphan.country, orphan.region].filter(Boolean).join(" · ");
  const latest = updates[0];
  const previewIds = gallery.filter((g) => g.kind === "photo").slice(0, 3).map((g) => g.id);

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-7 pb-9 md:pt-10 md:pb-12">
          <Link
            href="/sponsor/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-grey hover:text-green transition-colors"
          >
            ← Your sponsorships
          </Link>

          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover shadow-md ring-1 ring-charcoal/5 shrink-0"
              />
            ) : (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-green/10 ring-1 ring-charcoal/5 shadow-sm flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-4xl text-green/70">{initial}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-1.5">
                The child you sponsor
              </span>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-charcoal leading-[1.03]">
                {name}
              </h1>
              {(place || orphan.ageBand) && (
                <p className="text-grey text-base mt-2">
                  {place}
                  {place && orphan.ageBand ? " · " : ""}
                  {orphan.ageBand ? `age ${orphan.ageBand}` : ""}
                </p>
              )}
            </div>
          </div>

          {startedOn && (
            <div className="mt-6 flex items-center gap-2.5 text-sm text-charcoal/80">
              <span className="w-2 h-2 rounded-full bg-amber shrink-0" aria-hidden />
              <span>
                Together since{" "}
                <strong className="text-charcoal">{formatMonthYear(startedOn)}</strong> ·{" "}
                {durationBare(startedOn)}
              </span>
            </div>
          )}

          {orphan.bio ? (
            <div
              className="dr-prose mt-5 max-w-2xl"
              dangerouslySetInnerHTML={{ __html: orphan.bio }}
            />
          ) : null}
        </div>
      </section>

      {/* ── Section cards ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-4">
        {/* Updates */}
        <Link href={`${base}/updates`} className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                Updates
              </span>
              {latest ? (
                <>
                  <h3 className="text-lg font-heading font-bold text-charcoal leading-snug mt-1">
                    {latest.title || "Latest update"}
                  </h3>
                  <p className="text-sm text-grey/90 mt-1 line-clamp-2">
                    {snippet(latest.bodyHtml)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-grey mt-1">
                  No updates yet — we&apos;ll post the first one soon.
                </p>
              )}
            </div>
            <Chevron />
          </div>
        </Link>

        {/* Photos & videos */}
        <Link href={`${base}/photos`} className={`${cardCls} overflow-hidden`}>
          {previewIds.length > 0 && <CardPhotoPreview ids={previewIds} />}
          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                Photos &amp; videos
              </span>
              <p className="text-sm text-grey/90 mt-0.5">
                {gallery.length > 0
                  ? `${gallery.length} ${gallery.length === 1 ? "item" : "items"}`
                  : "No photos or videos yet"}
              </p>
            </div>
            <Chevron />
          </div>
        </Link>

        {/* Your support */}
        <Link href="/sponsor/account" className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-green">
                Your support
              </span>
              <p className="text-sm text-grey/90 mt-1">
                {startedOn
                  ? `Supporting ${name} since ${formatMonthYear(startedOn)}. Manage your sponsorship.`
                  : `Manage your monthly sponsorship of ${name}.`}
              </p>
            </div>
            <Chevron />
          </div>
        </Link>

        {/* Confidentiality */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-grey/60 pt-4">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Shared with you in confidence — please keep these private.
        </p>
      </div>
    </div>
  );
}
