/**
 * Loading UI for /admin/recurring. Streams instantly while the server
 * fetches Supabase aggregations + Stripe subscription state in parallel.
 */
export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
            Recurring income
          </span>
          <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
            Recurring donations
          </h1>
        </div>
        <div className="h-9 w-28 bg-charcoal/8 rounded-full" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-charcoal/10 rounded-2xl p-5"
          >
            <div className="h-3 w-32 bg-charcoal/10 rounded mb-3" />
            <div className="h-8 w-16 bg-charcoal/15 rounded mb-2" />
            <div className="h-3 w-24 bg-charcoal/8 rounded" />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="h-5 w-32 bg-charcoal/10 rounded mb-3" />
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <div className="bg-cream border-b border-charcoal/10 h-11" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-b border-charcoal/8 px-5 py-4 flex items-center gap-5"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-charcoal/12 rounded" />
                <div className="h-2.5 w-40 bg-charcoal/6 rounded" />
              </div>
              <div className="h-3 w-32 bg-charcoal/8 rounded" />
              <div className="h-3 w-16 bg-charcoal/12 rounded" />
              <div className="h-3 w-24 bg-charcoal/8 rounded" />
              <div className="h-5 w-16 bg-charcoal/8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
