import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import {
  applySubsetFilter,
  fetchReconciliationRows,
  defaultReconciliationDateRange,
  type ReconciliationFilters,
} from "@/lib/admin-reconciliation";
import { fromPence } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/export-reconciliation?from=YYYY-MM-DD&to=YYYY-MM-DD&type=donation|bazaar
 *
 * Streams a CSV that matches the on-screen reconciliation table.
 * The trustee clicks "Export CSV" with the current filters baked
 * into the URL — what they see is what they download.
 *
 * Filename: reconciliation-{from}-to-{to}.csv. Dates in ISO so
 * sorting is correct when the accountant has multiple months
 * archived.
 *
 * Audit logged: every download writes a `view_reconciliation_csv`
 * row to admin_audit_log with the active filter set + row count.
 * Mirrors the donations CSV pattern.
 *
 * Auth: cookie session (browser link clicks) or bearer token
 * (scripted access).
 */

/** CSV cell escape — wrap in quotes if it contains comma, newline, or quote. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** UK-format an ISO timestamp as DD/MM/YYYY HH:MM (Europe/London). */
function toUkDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function parseFilters(url: URL): ReconciliationFilters {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const type = url.searchParams.get("type");
  const subset = url.searchParams.get("subset");
  const defaults = defaultReconciliationDateRange();
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaults.from,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defaults.to,
    type: type === "donation" || type === "bazaar" ? type : undefined,
    subset:
      subset === "income" || subset === "refunds" ? subset : undefined,
  };
}

export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filters = parseFilters(url);
  // Same pattern as the page: fetch the full date+type set, then
  // narrow by subset so the CSV mirrors exactly what the table
  // shows when the trustee clicks Export.
  const allRows = await fetchReconciliationRows(filters);
  const rows = applySubsetFilter(allRows, filters.subset);

  const header = [
    "Date",
    "Type",
    "Reference",
    "Customer name",
    "Customer email",
    "Amount (£)",
    "Sign",
    "Currency",
    "Campaign",
    "Status",
    "Stripe payment intent",
  ];

  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(toUkDateTime(r.date)),
        csvCell(r.type === "donation" ? "Donation" : "Bazaar"),
        csvCell(r.receiptNumber),
        csvCell(r.customerName),
        csvCell(r.customerEmail),
        csvCell(fromPence(r.amountPence).toFixed(2)),
        // Sign column: explicit + or - so the accountant can SUMIF
        // on it. Avoids ambiguity over "is this £10 a refund of £10
        // or income of £10".
        csvCell(r.isIncome ? "+" : "-"),
        csvCell("GBP"),
        csvCell(r.campaign ?? ""),
        csvCell(r.status),
        csvCell(r.stripePaymentIntent ?? ""),
      ].join(",")
    );
  }

  const csv = lines.join("\n") + "\n";

  // Filename includes the date range so the accountant can keep
  // multiple monthly exports in one folder without overwriting.
  const filename = `reconciliation-${filters.from ?? "all"}-to-${filters.to ?? "all"}${
    filters.type ? `-${filters.type}-only` : ""
  }${filters.subset ? `-${filters.subset}` : ""}.csv`;

  await logAdminAction({
    action: "view_reconciliation_csv",
    userEmail: auth.email,
    request,
    metadata: {
      rowCount: rows.length,
      filters: {
        from: filters.from ?? null,
        to: filters.to ?? null,
        type: filters.type ?? null,
        subset: filters.subset ?? null,
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
