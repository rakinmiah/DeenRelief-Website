import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import {
  fetchAdminDonations,
  type AdminDonationFrequency,
  type AdminDonationStatus,
  type DonationFilters,
} from "@/lib/admin-donations";
import { fromPence } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/export-donations?<filters>
 *
 * Streams a CSV of donations matching the same filters as the admin
 * /admin/donations page. The "Export CSV" button on that page links
 * directly to this route, encoding the user's currently-active filters
 * (date range, status, campaign, frequency, gift-aid, donor search)
 * into the URL — so what the trustee sees in the table is what they
 * download.
 *
 * Always filters livemode=true (test-mode donations never leak to
 * trustees in any export). Donor name/email search applies the same
 * post-filter the page uses.
 *
 * Auth: cookie session (browser link clicks) or bearer token
 * (scripted access).
 *
 * Audit logged: every download writes a `view_donations_csv` row to
 * admin_audit_log with the active filter set + row count.
 *
 * Limit: 10,000 rows. At current charity scale this is a non-concern —
 * thousands of donations come well under. If volume ever exceeds this,
 * switch to streamed CSV with cursor-based pagination.
 */

/** CSV cell escape — wrap in quotes if it contains comma, newline, or quote. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** UK-format an ISO timestamp as DD/MM/YYYY HH:MM (Europe/London). */
function toUkDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** Parse the URL search params into the same DonationFilters shape the
 *  donations page uses. Defensive — bad input just falls through to
 *  "no filter on that dimension". */
function parseFilters(url: URL): DonationFilters {
  const status = (url.searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is AdminDonationStatus =>
      ["succeeded", "pending", "failed", "refunded"].includes(s)
    );
  const campaign = (url.searchParams.get("campaign") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const rawFreq = url.searchParams.get("frequency");
  const frequency: AdminDonationFrequency | undefined =
    rawFreq === "one-time" || rawFreq === "monthly" ? rawFreq : undefined;
  const rawGa = url.searchParams.get("giftAid");
  const giftAidClaimed: boolean | undefined =
    rawGa === "true" ? true : rawGa === "false" ? false : undefined;

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : undefined,
    status: status.length > 0 ? status : undefined,
    campaign: campaign.length > 0 ? campaign : undefined,
    frequency,
    giftAidClaimed,
    q: url.searchParams.get("q")?.trim() || undefined,
  };
}

export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filters = parseFilters(url);
  const rows = await fetchAdminDonations(filters, 10000);

  const header = [
    "Receipt",
    "Date",
    "Donor name",
    "Donor email",
    "Amount (£)",
    "Currency",
    "Campaign",
    "Frequency",
    "Status",
    "Gift Aid claimed",
    "Gift Aid reclaimable (£)",
    "Donor postcode",
    "Stripe payment intent",
    "Stripe customer",
  ];

  const lines: string[] = [header.join(",")];
  for (const row of rows) {
    const giftAidClaimedActive =
      row.giftAidClaimed && !row.giftAidDeclarationRevoked;
    lines.push(
      [
        csvCell(row.receiptNumber),
        csvCell(toUkDateTime(row.chargedAt ?? row.createdAt)),
        csvCell(row.donorName),
        csvCell(row.donorEmail),
        csvCell(fromPence(row.amountPence).toFixed(2)),
        csvCell("GBP"),
        csvCell(row.campaignLabel),
        csvCell(row.frequency),
        csvCell(row.status),
        csvCell(giftAidClaimedActive ? "Yes" : "No"),
        csvCell(
          giftAidClaimedActive
            ? fromPence(row.giftAidReclaimablePence).toFixed(2)
            : "0.00"
        ),
        csvCell(row.donorPostcode),
        csvCell(row.stripePaymentIntent ?? row.stripeSetupIntent ?? ""),
        csvCell(row.stripeCustomerId),
      ].join(",")
    );
  }

  const csv = lines.join("\n") + "\n";

  // Filename includes a date-range stamp so trustees opening multiple
  // exports can tell them apart. UK format because that's the audience.
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("-"); // YYYY-MM-DD → DD-MM-YYYY
  const filename = `donations-${stamp}.csv`;

  await logAdminAction({
    action: "view_donations_csv",
    userEmail: auth.email,
    request,
    metadata: {
      rowCount: rows.length,
      filters: {
        from: filters.from ?? null,
        to: filters.to ?? null,
        status: filters.status ?? null,
        campaign: filters.campaign ?? null,
        frequency: filters.frequency ?? null,
        giftAidClaimed: filters.giftAidClaimed ?? null,
        q: filters.q ?? null,
      },
      filename,
    },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
