import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminBazaarOrdersForClickAndDrop } from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import {
  BAZAAR_SERVICE_FULL_LABEL,
  deriveServiceFromShippingPence,
} from "@/lib/bazaar-format";
import { fromPence } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bazaar/export-click-and-drop
 *
 * Royal Mail Click & Drop CSV for bulk label printing.
 *
 * What this exports: every order currently in status='paid' (the
 * work queue). The packer downloads this, imports it to Royal Mail
 * Click & Drop, prints labels in one batch, then uses the order
 * detail page in our admin to enter each tracking number after
 * dispatch.
 *
 * CSV shape: one ROW PER ITEM, with the order reference repeated
 * across each item's rows. Royal Mail's import accepts both row-
 * per-order and row-per-item modes; row-per-item makes it possible
 * to split an order across multiple parcels later without
 * regenerating the CSV.
 *
 * Columns chosen to align with Royal Mail's "Standard" import
 * template — the column NAMES match what Click & Drop expects so
 * the import maps automatically. Where we don't have data
 * (Weight, Phone), we emit empty cells; the packer fills these in
 * at Click & Drop or via account defaults.
 *
 * NOTE: we do NOT auto-populate "Postage Service" with a service
 * code. Royal Mail service codes depend on the business account's
 * contract and would couple us to a specific account setup. The
 * "Customer chose" column at the right edge surfaces the
 * customer's selected tier as plain English so the packer picks
 * the matching service in Click & Drop.
 *
 * Always filters status='paid' regardless of UI filter state —
 * "what needs shipping right now" is the canonical query for this
 * export.
 */

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const orders = await fetchAdminBazaarOrdersForClickAndDrop();

  // Royal Mail Click & Drop "Standard" column names. The order of
  // columns matters for some Click & Drop import profiles; if the
  // packer's account expects a different order, they can re-map at
  // import time.
  const header = [
    "Order reference",
    "Recipient",
    "Email",
    "Phone",
    "Address line 1",
    "Address line 2",
    "City",
    "Postcode",
    "Country",
    "Item description",
    "Item SKU",
    "Quantity",
    "Item value",
    "Weight (g)",
    "Customer chose",
    "Internal notes",
  ];

  const lines: string[] = [header.join(",")];
  let totalRows = 0;

  for (const { order, items } of orders) {
    const ref = bazaarReceiptNumber(order.id);
    const recipient = order.shippingAddress?.name ?? "";
    const line1 = order.shippingAddress?.line1 ?? "";
    const line2 = order.shippingAddress?.line2 ?? "";
    const city = order.shippingAddress?.city ?? "";
    const postcode = order.shippingAddress?.postcode ?? "";
    // Stripe Checkout collected GB only — country is constrained.
    const country = "GB";
    const chosenService = deriveServiceFromShippingPence(order.shippingPence);
    const chosenServiceLabel = chosenService
      ? BAZAAR_SERVICE_FULL_LABEL[chosenService]
      : "";

    for (const item of items) {
      const description = item.variantSnapshot
        ? `${item.productNameSnapshot} (${item.variantSnapshot})`
        : item.productNameSnapshot;
      lines.push(
        [
          csvCell(ref),
          csvCell(recipient),
          csvCell(order.contactEmail),
          // Phone: not collected at checkout in Phase 2 — leave empty.
          csvCell(""),
          csvCell(line1),
          csvCell(line2),
          csvCell(city),
          csvCell(postcode),
          csvCell(country),
          csvCell(description),
          csvCell(""), // SKU snapshot not stored; blank for now.
          csvCell(item.quantity),
          csvCell(fromPence(item.unitPricePenceSnapshot).toFixed(2)),
          // Weight: per-item weight not stored on the snapshot.
          // The packer fills this in based on the product, or sets
          // a default weight per SKU in Click & Drop.
          csvCell(""),
          csvCell(chosenServiceLabel),
          csvCell(order.internalNotes ?? ""),
        ].join(",")
      );
      totalRows++;
    }
  }

  const csv = lines.join("\n") + "\n";

  // Filename includes a date stamp so multiple exports in a day
  // don't overwrite each other.
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("-"); // YYYY-MM-DD → DD-MM-YYYY
  const filename = `click-and-drop-${stamp}.csv`;

  await logAdminAction({
    action: "view_click_and_drop_csv",
    userEmail: auth.email,
    request,
    metadata: {
      orderCount: orders.length,
      itemRowCount: totalRows,
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
