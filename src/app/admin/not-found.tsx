import Link from "next/link";

/**
 * Admin-scoped 404 page.
 *
 * Without this file, calls to `notFound()` from any admin server
 * component (e.g. /admin/social/first-response/[id] when the event id
 * doesn't resolve) cascade up to the root /not-found.tsx, which is
 * styled for the public donor site — donor Header, donor Footer, 404
 * landing copy. That's jarring: a trustee clicking a stale link gets
 * dumped out of the admin app into the donor app.
 *
 * The admin layout wraps this in AdminShell automatically, so we only
 * need to render the inner content. Kept intentionally minimal — the
 * admin sidebar still shows, the trustee never leaves the admin
 * context, and there's a clear next action.
 */
export default function AdminNotFound() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center">
        <p className="text-[6rem] sm:text-[8rem] font-heading font-bold leading-none text-charcoal/10 select-none">
          404
        </p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-charcoal -mt-3 mb-3">
          Not found in admin
        </h1>
        <p className="text-charcoal/70 text-[15px] sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          That resource doesn&apos;t exist or has been removed. If you got
          here from a link inside the admin, the underlying row may have
          been deleted or a database migration may be missing.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/admin/social"
            className="inline-flex items-center justify-center rounded-full bg-charcoal text-white px-5 py-2.5 text-sm font-semibold hover:bg-charcoal/85 transition-colors"
          >
            Back to social tools
          </Link>
          <Link
            href="/admin/donations"
            className="inline-flex items-center justify-center rounded-full bg-white border border-charcoal/15 text-charcoal px-5 py-2.5 text-sm font-semibold hover:bg-cream transition-colors"
          >
            Donations
          </Link>
        </div>
      </div>
    </main>
  );
}
