/**
 * Loading UI for /admin/reports. Streams instantly while server
 * computes per-campaign aggregations.
 */
export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Reports
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Financial reports
        </h1>
        <div className="h-3 w-96 bg-charcoal/8 rounded mt-3" />
      </div>

      {/* Quick reports cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-charcoal/10 rounded-2xl p-5"
          >
            <div className="h-3 w-20 bg-charcoal/10 rounded mb-3" />
            <div className="h-5 w-48 bg-charcoal/15 rounded mb-2" />
            <div className="h-3 w-full bg-charcoal/6 rounded mt-3" />
            <div className="h-3 w-3/4 bg-charcoal/6 rounded mt-1.5" />
          </div>
        ))}
      </div>

      <div>
        <div className="h-5 w-44 bg-charcoal/10 rounded mb-3" />
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <div className="bg-cream border-b border-charcoal/10 h-11" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-b border-charcoal/8 px-5 py-4 flex items-center gap-6"
            >
              <div className="flex-1 h-3 w-32 bg-charcoal/12 rounded" />
              <div className="h-3 w-12 bg-charcoal/8 rounded" />
              <div className="h-3 w-16 bg-charcoal/12 rounded" />
              <div className="w-48 h-1.5 bg-charcoal/6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
