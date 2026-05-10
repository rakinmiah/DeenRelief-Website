import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminDonationById } from "@/lib/admin-donations";
import { DonationReceiptPDF } from "@/lib/donation-receipt-pdf";

export const dynamic = "force-dynamic";

/**
 * Lazy-load the charity logo from /public/images/logo.png and cache
 * the data URL per-process. The PDF component embeds the image
 * inline (no remote fetch on render). If the file is missing or
 * can't be read, returns null and the component falls back to a text
 * wordmark — receipt still renders, just without the logo.
 */
let cachedLogoDataUrl: string | null | undefined;
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    const p = path.join(process.cwd(), "public", "images", "logo.png");
    const buf = await readFile(p);
    cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedLogoDataUrl;
  } catch (err) {
    console.warn("[receipt-pdf] Could not load logo, falling back to text wordmark:", err);
    cachedLogoDataUrl = null;
    return null;
  }
}

/**
 * GET /api/admin/donations/[id]/receipt-pdf
 *
 * Streams a PDF receipt for the given donation. Authenticated admin
 * surface only — never exposed to donors directly. Trustees use this
 * when:
 *   - A donor asks for a PDF (e.g. for personal tax records)
 *   - A donor lost the email receipt
 *   - The trustee wants to forward a hardcopy
 *
 * GET (not POST) so the trustee can click a link and the browser
 * handles the download natively. Browser sends the dr_admin_session
 * cookie automatically.
 *
 * Validation:
 *   - Donation must exist + be livemode
 *   - Status must be 'succeeded' or 'refunded' — pending/failed
 *     donations don't get receipts. Refunded receipts are watermarked
 *     so the donor doesn't think they still have an active donation.
 *
 * The PDF is rendered to a buffer in-memory (~30-50KB per page) and
 * returned as application/pdf with Content-Disposition: attachment.
 * For ~5 trustees clicking once or twice, no concurrency concerns.
 *
 * Audit logged. The audit row records who downloaded the receipt for
 * which donation.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const donation = await fetchAdminDonationById(id);
  if (!donation) {
    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (donation.status !== "succeeded" && donation.status !== "refunded") {
    return new Response(
      JSON.stringify({
        error: `Cannot generate receipt for donation with status '${donation.status}'.`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  if (!donation.chargedAt) {
    return new Response(
      JSON.stringify({
        error: "Donation has no completion date — cannot build receipt.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Render the PDF to a buffer. Logo is loaded once per process and
  // cached as a data URL — no remote fetch on render, no file I/O
  // after the first request.
  const logoDataUrl = await loadLogoDataUrl();

  const buffer = await renderToBuffer(
    DonationReceiptPDF({
      receiptNumber: donation.receiptNumber,
      firstName: donation.donorFirstName ?? "",
      lastName: donation.donorLastName ?? "",
      email: donation.donorEmail,
      addressLine1: donation.donorAddressLine1,
      addressLine2: donation.donorAddressLine2,
      city: donation.donorCity,
      postcode: donation.donorPostcode,
      amountPence: donation.amountPence,
      campaignLabel: donation.campaignLabel,
      frequency: donation.frequency,
      giftAidClaimed:
        donation.giftAidClaimed && !donation.giftAidDeclarationRevoked,
      status: donation.status === "refunded" ? "refunded" : "succeeded",
      completedAt: new Date(donation.chargedAt),
      paymentIntentId: donation.stripePaymentIntent,
      logoDataUrl,
    })
  );

  await logAdminAction({
    action: "resend_receipt",
    userEmail: auth.email,
    targetId: donation.id,
    request,
    metadata: {
      method: "pdf_download",
      receiptNumber: donation.receiptNumber,
    },
  });

  const filename = `receipt-${donation.receiptNumber}.pdf`;
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
