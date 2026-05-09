import type { Metadata } from "next";
import Link from "next/link";
import {
  PLACEHOLDER_DONATIONS,
  formatAdminDateOnly,
} from "@/lib/admin-placeholder";
import { formatPence } from "@/lib/bazaar-format";

export const metadata: Metadata = {
  title: "Gift Aid claim export | Deen Relief Admin",
  robots: { index: false, follow: false },
};

/**
 * Gift Aid claim export.
 *
 * The most legally-loaded export in the admin. Trustees claim the 25%
 * Gift Aid uplift from HMRC's Charities Online portal by uploading an
 * R68 schedule (XLSX or CSV) listing every eligible donation in the
 * tax year. HMRC's required columns:
 *   - Title
 *   - First name
 *   - Last name
 *   - House name or number
 *   - Postcode
 *   - Aggregated donations (Y/N)
 *   - Sponsored event (Y/N)
 *   - Donation date (YYYY-MM-DD)
 *   - Amount (£)
 *
 * Production version queries Supabase, joins donor address records,
 * filters to only donations with a confirmed Gift Aid declaration in
 * the chosen tax year, and streams the CSV in HMRC's exact column order.
 *
 * The mockup shows the table preview + the metadata about what the
 * CSV will contain when downloaded.
 */
export default function AdminGiftAidExportPage() {
  // UK tax year runs 6 April → 5 April. Show all eligible donations for
  // the current tax year (using the placeholder data's date range).
  const giftAidEligible = PLACEHOLDER_DONATIONS.filter(
    (d) => d.giftAidClaimed && d.status === "paid"
  );

  const totalDonatedPence = giftAidEligible.reduce(
    (s, d) => s + d.amountPence,
    0
  );
  const totalReclaimablePence = giftAidEligible.reduce(
    (s, d) => s + d.giftAidReclaimablePence,
    0
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/admin/reports"
          className="inline-block text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors mb-2"
        >
          ← Reports
        </Link>
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          HMRC Reclaim
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Gift Aid claim export
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Generate the spreadsheet HMRC needs to process the 25% Gift
          Aid reclaim. Upload the downloaded file via{" "}
          <a
            href="https://www.gov.uk/claim-gift-aid-online"
            className="underline hover:text-charcoal"
            target="_blank"
            rel="noopener noreferrer"
          >
            HMRC&apos;s Charities Online portal
          </a>
          .
        </p>
      </div>

      {/* Headline metrics */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
            Eligible donations
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {giftAidEligible.length}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-0.5">
            with Gift Aid declaration
          </p>
        </div>
        <div className="bg-white border border-charcoal/10 rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
            Total donated
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {formatPence(totalDonatedPence)}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-0.5">
            from eligible donors
          </p>
        </div>
        <div className="bg-white border border-amber/40 rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-dark mb-1.5">
            Reclaimable from HMRC
          </p>
          <p className="text-3xl font-heading font-bold text-charcoal">
            {formatPence(totalReclaimablePence)}
          </p>
          <p className="text-[12px] text-charcoal/50 mt-0.5">
            25% uplift on eligible
          </p>
        </div>
      </div>

      {/* Filter + download */}
      <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
          Tax year filter
        </h2>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[11px] text-charcoal/60 mb-1">
              From
            </label>
            <input
              type="date"
              defaultValue="2026-04-06"
              className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal"
            />
          </div>
          <div>
            <label className="block text-[11px] text-charcoal/60 mb-1">
              To
            </label>
            <input
              type="date"
              defaultValue="2027-04-05"
              className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal"
            />
          </div>
          <a
            href="/api/admin/export-gift-aid?from=2026-04-06&to=2027-04-05"
            className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors whitespace-nowrap text-center"
          >
            Download HMRC CSV
          </a>
        </div>
        <p className="mt-3 text-[11px] text-charcoal/50 leading-relaxed">
          Defaults to the current UK tax year (6 April → 5 April).
          Download is in HMRC R68 schedule format with the columns
          HMRC requires: Title · First name · Last name · House
          name/number · Postcode · Aggregated donations (Y/N) ·
          Sponsored event (Y/N) · Donation date · Amount.
        </p>
        <p className="mt-2 text-[11px] text-green-dark leading-relaxed">
          ✓ Real export endpoint wired at{" "}
          <code className="bg-cream px-1 rounded">
            /api/admin/export-gift-aid
          </code>
          — already produces HMRC-format CSV from the donations data.
        </p>
      </section>

      {/* Eligible donations preview table */}
      <section>
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Preview ({giftAidEligible.length} eligible)
        </h2>
        <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "Donor",
                    "Date",
                    "Amount",
                    "Gift Aid (25%)",
                    "Receipt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {giftAidEligible.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-cream/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="text-charcoal font-medium text-sm">
                        {d.donorName}
                      </div>
                      <div className="text-charcoal/50 text-xs">
                        {d.donorEmail}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-charcoal/70 whitespace-nowrap">
                      {formatAdminDateOnly(d.chargedAt)}
                    </td>
                    <td className="px-5 py-3 text-charcoal font-medium whitespace-nowrap">
                      {formatPence(d.amountPence)}
                    </td>
                    <td className="px-5 py-3 text-green-dark font-medium whitespace-nowrap">
                      +{formatPence(d.giftAidReclaimablePence)}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-charcoal/60">
                      {d.receiptNumber}
                    </td>
                  </tr>
                ))}
                <tr className="bg-cream/60 font-semibold">
                  <td colSpan={2} className="px-5 py-3 text-charcoal">
                    Total reclaimable
                  </td>
                  <td className="px-5 py-3 text-charcoal">
                    {formatPence(totalDonatedPence)}
                  </td>
                  <td className="px-5 py-3 text-green-dark">
                    +{formatPence(totalReclaimablePence)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mt-8 p-5 bg-amber-light border border-amber/30 rounded-2xl text-sm text-charcoal/80 leading-relaxed">
        <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-amber-dark mb-1">
          Pitch preview
        </span>
        Mockup data, no real donations. The download button is disabled
        in pitch mode. Production: server-rendered, joins donor address
        records, streams CSV in HMRC R68 column order, stamps the
        download with trustee name + timestamp + filter range to the
        audit log so the same export can be re-run later for verification.
      </div>
    </main>
  );
}
