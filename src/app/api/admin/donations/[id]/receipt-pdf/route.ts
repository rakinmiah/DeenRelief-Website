import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdminAuth } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { fetchAdminDonationById } from "@/lib/admin-donations";
import { DonationReceiptPDF } from "@/lib/donation-receipt-pdf";

export const dynamic = "force-dynamic";

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

  // Render the PDF to a buffer. The component needs to be invoked as
  // an element (createElement), not as JSX in a non-tsx file — but
  // since we're in .ts here, we use the tsx wrapper that exports the
  // component and renderToBuffer accepts the React element.
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
