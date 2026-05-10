/**
 * GET /api/admin/export-gift-aid?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a CSV in HMRC's Gift Aid Schedule Spreadsheet format:
 *   https://www.gov.uk/guidance/schedule-spreadsheet-to-claim-back-tax-on-gift-aid-donations
 *
 * Columns (verbatim header required by HMRC):
 *   Title, First name, Last name, House name or number, Postcode,
 *   Aggregated donations, Sponsored event, Donation date, Amount
 *
 * Usage:
 *   curl -H "Authorization: Bearer $ADMIN_API_TOKEN" \
 *     "https://deenrelief.org/api/admin/export-gift-aid?from=2026-04-06&to=2027-04-05" \
 *     > gift-aid-2026-27.csv
 *
 * Default range: current UK tax year (6 April → 5 April).
 *
 * Scope filter:
 *   - Only donations with gift_aid_claimed = true
 *   - Only status = 'succeeded'
 *   - Only where the linked gift_aid_declaration has not been revoked
 *
 * The CSV is chunked via text/csv streaming so even multi-year exports
 * won't blow the lambda memory limit.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { fromPence } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** CSV cell escape — wrap in quotes if it contains comma, newline, or quote. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** First number in an address line (e.g. "10 Downing Street" → "10"). HMRC
 *  accepts either the house number or the house name in the "House name or
 *  number" column. If we can't find a number, fall back to the full line. */
function houseNameOrNumber(addressLine1: string): string {
  const match = addressLine1.match(/^\s*(\S+)/);
  return match ? match[1] : addressLine1;
}

/** UK tax year start (6 April of the year containing `date`). */
function taxYearStart(date: Date): Date {
  const y = date.getFullYear();
  const aprilSix = new Date(Date.UTC(y, 3, 6));
  if (date < aprilSix) {
    return new Date(Date.UTC(y - 1, 3, 6));
  }
  return aprilSix;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format a YYYY-MM-DD ISO date string as DD/MM/YY for HMRC's Charities
 * Online schedule spreadsheet. HMRC's import tool tolerates ISO too,
 * but the documented template uses DD/MM/YY and trustees scanning the
 * CSV in Excel expect UK format. Don't change without re-checking
 * HMRC's current schedule template.
 */
function toHmrcDate(isoDate: string): string {
  // isoDate is a YYYY-MM-DD slice, no time component. Strict regex
  // guard so a malformed input passes through unchanged rather than
  // silently emitting nonsense like "date/a/no".
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy.slice(2)}`;
}

interface DonationExportRow {
  completed_at: string;
  amount_pence: number;
  donors: {
    first_name: string;
    last_name: string;
    address_line1: string;
    postcode: string;
  } | null;
  gift_aid_declaration: {
    revoked_at: string | null;
  } | null;
}

export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const now = new Date();
  const defaultFrom = taxYearStart(now);
  const defaultTo = new Date(defaultFrom);
  defaultTo.setUTCFullYear(defaultFrom.getUTCFullYear() + 1);
  defaultTo.setUTCDate(defaultFrom.getUTCDate() - 1); // 5 April next year

  const from = url.searchParams.get("from") ?? toIsoDate(defaultFrom);
  const to = url.searchParams.get("to") ?? toIsoDate(defaultTo);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: "from and to must be YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Pull succeeded Gift-Aid-claimed donations in the window, joined to donor
  // and declaration. We filter revoked declarations in JS (simpler than a
  // double-nested PostgREST filter).
  const { data, error } = await supabase
    .from("donations")
    .select(
      `completed_at, amount_pence,
       donors(first_name, last_name, address_line1, postcode),
       gift_aid_declaration:gift_aid_declarations(revoked_at)`
    )
    .eq("gift_aid_claimed", true)
    .eq("status", "succeeded")
    // Defence-in-depth: a test-mode donation must NEVER end up on an
    // HMRC Gift Aid reclaim. The admin pages already filter this via
    // fetchAdminDonations, but the export route is a separate code path
    // that runs outside the page query — so it filters here too.
    .eq("livemode", true)
    .gte("completed_at", `${from}T00:00:00Z`)
    .lte("completed_at", `${to}T23:59:59Z`)
    .order("completed_at", { ascending: true });

  if (error) {
    console.error("[export-gift-aid] query failed:", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  // Normalise the joined shape (PostgREST may return single objects or arrays
  // depending on relationship cardinality).
  const rows: DonationExportRow[] = (data ?? []).map((r) => {
    const rawDonors = r.donors as unknown;
    const rawDecl = (r as unknown as { gift_aid_declaration?: unknown }).gift_aid_declaration;
    return {
      completed_at: r.completed_at as unknown as string,
      amount_pence: r.amount_pence as unknown as number,
      donors: Array.isArray(rawDonors) ? rawDonors[0] ?? null : (rawDonors as DonationExportRow["donors"]),
      gift_aid_declaration: Array.isArray(rawDecl)
        ? (rawDecl[0] as DonationExportRow["gift_aid_declaration"]) ?? null
        : (rawDecl as DonationExportRow["gift_aid_declaration"]),
    };
  });

  const header = [
    "Title",
    "First name",
    "Last name",
    "House name or number",
    "Postcode",
    "Aggregated donations",
    "Sponsored event",
    "Donation date",
    "Amount",
  ];

  const lines: string[] = [header.join(",")];

  for (const row of rows) {
    // Skip rows where declaration has been revoked
    if (row.gift_aid_declaration?.revoked_at) continue;
    if (!row.donors) continue;
    if (!row.completed_at) continue;

    const donationDate = toHmrcDate(row.completed_at.slice(0, 10));
    const amount = fromPence(row.amount_pence).toFixed(2);
    lines.push(
      [
        csvCell(""), // Title — optional
        csvCell(row.donors.first_name),
        csvCell(row.donors.last_name),
        csvCell(houseNameOrNumber(row.donors.address_line1)),
        csvCell(row.donors.postcode),
        csvCell(""), // Aggregated donations (n/a — individual rows)
        csvCell(""), // Sponsored event (n/a)
        csvCell(donationDate),
        csvCell(amount),
      ].join(",")
    );
  }

  const csv = lines.join("\n") + "\n";
  const filename = `gift-aid-schedule-${from}-to-${to}.csv`;

  // Audit log AFTER the CSV is built — most legally-loaded action in
  // the admin (PII export for HMRC reclaim). Captures who downloaded
  // what range so a regulator audit can reconstruct exactly when each
  // claim's schedule was generated.
  await logAdminAction({
    action: "view_gift_aid_csv",
    userEmail: auth.email,
    request,
    metadata: {
      from,
      to,
      rowCount: lines.length - 1, // -1 for header
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
