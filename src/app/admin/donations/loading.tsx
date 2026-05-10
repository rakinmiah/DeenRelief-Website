/**
 * Loading UI for /admin/donations.
 *
 * Next.js streams this server-rendered skeleton instantly while the
 * page's async server component fetches data. The user sees the page
 * chrome + ghost stats + ghost table within ~50ms of the request,
 * even on a cold-start function.
 *
 * Layout mirrors the real page so there's no jarring re-flow when the
 * data lands. Subtle pulse animation signals "still loading" without
 * being distracting.
 */
export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Income
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Donations
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-28 bg-charcoal/8 rounded-full" />
          <div className="h-9 w-40 bg-charcoal/15 rounded-full" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-charcoal/10 rounded-2xl p-5"
          >
            <div className="h-3 w-32 bg-charcoal/10 rounded mb-3" />
            <div className="h-8 w-20 bg-charcoal/15 rounded mb-2" />
            <div className="h-3 w-24 bg-charcoal/8 rounded" />
          </div>
        ))}
      </div>

      {/* Filter bar placeholder */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="h-3 w-10 bg-charcoal/10 rounded mr-1" />
          <div className="h-7 w-20 bg-charcoal/8 rounded-full" />
          <div className="h-7 w-16 bg-charcoal/8 rounded-full" />
          <div className="h-7 w-24 bg-charcoal/8 rounded-full" />
          <div className="h-7 w-28 bg-charcoal/8 rounded-full" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <div className="bg-cream border-b border-charcoal/10 h-11" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border-b border-charcoal/8 px-5 py-4 flex items-center gap-6"
          >
            <div className="h-3 w-28 bg-charcoal/8 rounded" />
            <div className="h-3 w-24 bg-charcoal/8 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-charcoal/12 rounded" />
              <div className="h-2.5 w-40 bg-charcoal/6 rounded" />
            </div>
            <div className="h-3 w-32 bg-charcoal/8 rounded" />
            <div className="h-3 w-14 bg-charcoal/12 rounded" />
            <div className="h-5 w-16 bg-charcoal/8 rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
