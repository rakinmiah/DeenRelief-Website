import type { Metadata } from "next";
import Link from "next/link";
import { PLACEHOLDER_PRODUCTS } from "@/lib/bazaar-placeholder";

export const metadata: Metadata = {
  title: "Order detail | Bazaar Admin",
  robots: { index: false, follow: false },
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

function formatPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/**
 * Admin order detail. Shows everything the fulfiller needs in one
 * place — line items with maker attribution, shipping address, and
 * the action panel for status transitions.
 *
 * Production wires this to a Supabase query keyed by `id`. Mock version
 * uses the first three placeholder products to illustrate the layout.
 */
export default async function AdminBazaarOrderDetailPage({
  params,
}: RouteParams) {
  const { id } = await params;

  // Mock order — first 3 products as line items.
  const mockItems = PLACEHOLDER_PRODUCTS.slice(0, 3).map((p, i) => ({
    productId: p.id,
    productName: p.name,
    variant: p.variants[0]?.size ?? p.variants[0]?.colour ?? null,
    makerName: p.maker.name,
    makerCountry: p.maker.country,
    quantity: i === 0 ? 2 : 1,
    unitPricePence: p.pricePence,
  }));

  const subtotal = mockItems.reduce(
    (s, i) => s + i.unitPricePence * i.quantity,
    0
  );
  const shipping = subtotal >= 7500 ? 0 : 399;
  const total = subtotal + shipping;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header — admin chrome (header nav, sign-out) is provided
          by the shared AdminShell in /admin/layout.tsx. */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/bazaar/orders"
            className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
          >
            ← All orders
          </Link>
          <h1 className="text-charcoal font-heading font-semibold text-xl sm:text-2xl mt-1 font-mono">
            {id}
          </h1>
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border bg-amber-light text-amber-dark border-amber/30">
          Awaiting fulfilment
        </span>
      </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column — line items, address */}
          <div className="space-y-5">
            {/* Line items */}
            <section className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
              <h2 className="px-5 py-4 border-b border-charcoal/10 text-charcoal font-heading font-semibold">
                Items to pack
              </h2>
              <ul className="divide-y divide-charcoal/8">
                {mockItems.map((item, i) => (
                  <li key={i} className="px-5 py-4 flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cream flex-shrink-0 flex items-center justify-center text-xs font-bold text-charcoal/50">
                      {item.quantity}×
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-charcoal font-medium leading-tight">
                        {item.productName}
                      </p>
                      <p className="text-xs text-charcoal/60 mt-0.5">
                        {item.variant && `${item.variant} · `}
                        Made by {item.makerName} · {item.makerCountry}
                      </p>
                    </div>
                    <span className="text-charcoal/80 text-sm">
                      {formatPence(item.unitPricePence * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 bg-cream/50 border-t border-charcoal/10 text-xs text-charcoal/70">
                Total weight: ~1.2kg · Will fit Royal Mail medium parcel
              </div>
            </section>

            {/* Shipping address */}
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-charcoal font-heading font-semibold mb-3">
                Shipping address
              </h2>
              <address className="not-italic text-sm text-charcoal/80 leading-relaxed">
                <strong className="text-charcoal">Aisha Hussain</strong>
                <br />
                14 Foxglove Road
                <br />
                Manchester, M14 7QF
                <br />
                United Kingdom
              </address>
            </section>

            {/* Customer */}
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-charcoal font-heading font-semibold mb-3">
                Customer
              </h2>
              <p className="text-sm text-charcoal/80">
                <a
                  href="mailto:aisha.h@example.co.uk"
                  className="text-green underline"
                >
                  aisha.h@example.co.uk
                </a>
                <br />
                <span className="text-xs text-charcoal/60">
                  First-time customer · Donated £85 across 3 causes
                </span>
              </p>
            </section>
          </div>

          {/* Side panel — action area */}
          <aside className="space-y-4">
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
                Order summary
              </h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal/70">Subtotal</dt>
                  <dd className="text-charcoal">{formatPence(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-charcoal/70">Shipping</dt>
                  <dd className="text-charcoal">
                    {shipping === 0 ? "Free" : formatPence(shipping)}
                  </dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-charcoal/10 mt-2">
                  <dt className="text-charcoal font-semibold">Total paid</dt>
                  <dd className="text-charcoal font-semibold">
                    {formatPence(total)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-charcoal/50">
                Stripe payment intent: pi_3X...
              </p>
            </section>

            {/* Action panel */}
            <section className="bg-charcoal text-white rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/60 mb-3">
                Mark as shipped
              </h2>
              <label
                htmlFor="tracking"
                className="block text-xs text-white/70 mb-1.5"
              >
                Royal Mail tracking number
              </label>
              <input
                id="tracking"
                type="text"
                placeholder="LX 123 456 789 GB"
                disabled
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm mb-3 disabled:cursor-not-allowed"
              />
              <label
                htmlFor="service"
                className="block text-xs text-white/70 mb-1.5"
              >
                Service
              </label>
              <select
                id="service"
                disabled
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm mb-4 disabled:cursor-not-allowed"
              >
                <option>Royal Mail Tracked 48</option>
                <option>Royal Mail Tracked 24</option>
                <option>Royal Mail Special Delivery</option>
              </select>
              <button
                type="button"
                disabled
                className="w-full px-4 py-2.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Mark shipped &amp; notify customer
              </button>
              <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
                Disabled in pitch preview. Real version: writes
                tracking_number + status=&apos;fulfilled&apos; to Supabase,
                triggers shipping email via Resend.
              </p>
            </section>

            {/* Internal notes */}
            <section className="bg-white border border-charcoal/10 rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
                Internal notes
              </h2>
              <textarea
                rows={4}
                disabled
                placeholder="Anything the team should know about this order…"
                className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal placeholder:text-charcoal/30 disabled:cursor-not-allowed"
              />
            </section>
          </aside>
      </div>
    </main>
  );
}
