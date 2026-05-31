import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  fetchGiftAidEligible,
  formatAdminDateOnly,
} from "@/lib/admin-donations";
import { formatPence } from "@/lib/bazaar-format";
import {
  Button,
  PageHeader,
  StatCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Gift Aid claim export | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type GiftAidRow = Awaited<ReturnType<typeof fetchGiftAidEligible>>[number];

/**
 * Gift Aid claim export — wired to real Supabase data.
 *
 * The download button still hits /api/admin/export-gift-aid which has
 * always queried real data. The on-page preview now uses the same
 * underlying query (fetchGiftAidEligible) so the trustee sees exactly
 * what will land in the CSV before they click Download.
 *
 * Defaults to the current UK tax year (6 April → 5 April). The two
 * date inputs let trustees override for specific quarters if they
 * want to file claims more frequently.
 */
export default async function AdminGiftAidExportPage() {
  await requireRoleAdmin();

  // Compute the current UK tax-year window for display + the export
  // URL. Server-side so the trustee sees the resolved range.
  const now = new Date();
  const taxYearStart = (() => {
    const y = now.getFullYear();
    const aprilSix = new Date(Date.UTC(y, 3, 6));
    return now < aprilSix ? new Date(Date.UTC(y - 1, 3, 6)) : aprilSix;
  })();
  const taxYearEnd = new Date(taxYearStart);
  taxYearEnd.setUTCFullYear(taxYearStart.getUTCFullYear() + 1);
  taxYearEnd.setUTCDate(taxYearStart.getUTCDate() - 1);

  const fromIso = taxYearStart.toISOString().slice(0, 10);
  const toIso = taxYearEnd.toISOString().slice(0, 10);

  const eligible = await fetchGiftAidEligible(fromIso, toIso);
  const totalDonatedPence = eligible.reduce(
    (s, d) => s + d.amountPence,
    0
  );
  const totalReclaimablePence = eligible.reduce(
    (s, d) => s + d.giftAidReclaimablePence,
    0
  );

  const previewColumns: Column<GiftAidRow>[] = [
    {
      key: "donor",
      header: "Donor",
      primary: true,
      cell: (d) => (
        <div>
          <div className="text-charcoal font-medium text-sm">{d.donorName}</div>
          <div className="text-charcoal/50 text-xs break-all">{d.donorEmail}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (d) => formatAdminDateOnly(d.chargedAt),
      cellClassName: "whitespace-nowrap text-charcoal/70",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      secondary: true,
      cell: (d) => (
        <span className="text-charcoal font-semibold whitespace-nowrap">
          {formatPence(d.amountPence)}
        </span>
      ),
    },
    {
      key: "giftaid",
      header: "Gift Aid (25%)",
      align: "right",
      cell: (d) => (
        <span className="text-green-dark font-medium whitespace-nowrap">
          +{formatPence(d.giftAidReclaimablePence)}
        </span>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      hideOnMobile: true,
      cell: (d) => (
        <span className="font-mono text-[11px] text-charcoal/60">{d.receiptNumber}</span>
      ),
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        backHref="/admin/reports"
        backLabel="Reports"
        eyebrow="HMRC Reclaim"
        title="Gift Aid claim export"
        description={
          <>
            Generate the spreadsheet HMRC needs to process the 25% Gift Aid
            reclaim. Upload the downloaded file via{" "}
            <a
              href="https://www.gov.uk/claim-gift-aid-online"
              className="underline hover:text-charcoal"
              target="_blank"
              rel="noopener noreferrer"
            >
              HMRC&apos;s Charities Online portal
            </a>
            .
          </>
        }
      />

      {/* Headline metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Eligible donations"
          value={eligible.length.toString()}
          hint="with Gift Aid declaration"
        />
        <StatCard
          label="Total donated"
          value={formatPence(totalDonatedPence)}
          hint="from eligible donors"
        />
        <StatCard
          label="Reclaimable from HMRC"
          value={formatPence(totalReclaimablePence)}
          hint="25% uplift on eligible"
        />
      </div>

      {/* Filter + download */}
      <section className="bg-white border border-charcoal/10 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-4">
          Tax year
        </h2>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[11px] text-charcoal/60 mb-1">
              From
            </label>
            <input
              type="date"
              defaultValue={fromIso}
              className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal"
              readOnly
            />
          </div>
          <div>
            <label className="block text-[11px] text-charcoal/60 mb-1">
              To
            </label>
            <input
              type="date"
              defaultValue={toIso}
              className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-sm text-charcoal"
              readOnly
            />
          </div>
          <Button
            href={`/api/admin/export-gift-aid?from=${fromIso}&to=${toIso}`}
            prefetch={false}
          >
            Download HMRC CSV
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-charcoal/50 leading-relaxed">
          Defaults to the current UK tax year (6 April → 5 April).
          Download is in HMRC R68 schedule format with these columns:
          Title · First name · Last name · House name/number · Postcode
          · Aggregated donations (Y/N) · Sponsored event (Y/N) ·
          Donation date · Amount.
        </p>
        <p className="mt-2 text-[11px] text-green-dark leading-relaxed">
          ✓ Live data — both this preview and the CSV download query
          your live donations (livemode=true, status=succeeded, with
          confirmed Gift Aid declaration).
        </p>
      </section>

      {/* Eligible donations preview table */}
      <section>
        <h2 className="text-charcoal font-heading font-semibold text-lg mb-3">
          Preview ({eligible.length} eligible)
        </h2>
        <ResponsiveTable<GiftAidRow>
          rows={eligible}
          getRowKey={(d) => d.donationId}
          columns={previewColumns}
          empty={
            <EmptyState
              title="No Gift-Aid-eligible donations in this tax year yet"
              description="Eligible donations from confirmed UK taxpayers appear here as soon as they're received."
            />
          }
        />
        <p className="mt-3 text-[12px] text-charcoal/60">
          Total reclaimable:{" "}
          <strong className="text-green-dark">
            +{formatPence(totalReclaimablePence)}
          </strong>{" "}
          on {formatPence(totalDonatedPence)} donated.
        </p>
      </section>
    </main>
  );
}
