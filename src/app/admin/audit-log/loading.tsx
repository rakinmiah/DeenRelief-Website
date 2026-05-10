/**
 * Loading UI for /admin/audit-log. Audit log is read-heavy (200 rows
 * per page load), so the skeleton shows enough rows to fill the
 * viewport so the layout doesn't shift when content lands.
 */
export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Compliance
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Audit log
        </h1>
        <div className="h-3 w-96 bg-charcoal/8 rounded mt-3" />
      </div>

      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        <div className="bg-cream border-b border-charcoal/10 h-11" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-charcoal/8 px-5 py-4 flex items-center gap-6"
          >
            <div className="h-3 w-32 bg-charcoal/8 rounded" />
            <div className="h-3 w-40 bg-charcoal/6 rounded" />
            <div className="h-5 w-24 bg-charcoal/8 rounded-full" />
            <div className="h-3 w-20 bg-charcoal/6 rounded" />
            <div className="h-3 w-24 bg-charcoal/6 rounded" />
            <div className="ml-auto h-3 w-12 bg-charcoal/8 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
