/**
 * Bazaar order confirmation email — built + sent on
 * checkout.session.completed (bazaar branch of the webhook).
 *
 * Mirrors the donation receipt pattern in src/lib/donation-receipt.ts:
 *   - inline-styled HTML, 600px max-width, no remote CSS or fonts
 *   - logo as inline `cid:logo` attachment
 *   - plain text fallback for clients that strip HTML
 *   - sent via Resend, fire-and-forget from the webhook (returns
 *     false on failure rather than throwing, so a transient email
 *     hiccup never causes Stripe to retry the event)
 *
 * What this email does that the donation receipt doesn't:
 *   - Itemised line list with maker attribution on every row (the
 *     whole product proposition is "made by a named person"; the
 *     receipt must honour that)
 *   - Shipping address echoed back (the customer can spot a typo
 *     before we ship)
 *   - Royal Mail ETA + the "tracking when shipped" promise (matches
 *     the prose on /bazaar/shipping)
 *   - Returns policy link (UK Consumer Contracts Regulations require
 *     the trader to give the customer this in durable form — the
 *     order confirmation email is the canonical durable-form copy)
 *
 * What this email DOESN'T do yet:
 *   - PDF attachment. Donations have one (HMRC + audit). Order
 *     receipts don't legally need a PDF; the email body itself is
 *     a durable record. Defer until trustees ask.
 *   - Gift Aid block. Bazaar income isn't a donation; no Gift Aid
 *     applies to trading income under Path A.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { BAZAAR_FROM_EMAIL, BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { notifyEmailFailure } from "@/lib/admin-notifications";
import { fromPence } from "@/lib/stripe";
import type {
  BazaarOrderItemRow,
  BazaarOrderRow,
} from "@/lib/bazaar-db";

/**
 * Inline logo attachment. Same convention + cache as donation
 * receipts so both email types reference `cid:logo` consistently
 * and we read the file at most once per process.
 */
const LOGO_CID = "logo";
let logoBufferCache: Buffer | null = null;
async function loadLogoBuffer(): Promise<Buffer | null> {
  if (logoBufferCache) return logoBufferCache;
  try {
    const p = path.join(process.cwd(), "public", "images", "logo.png");
    logoBufferCache = await readFile(p);
    return logoBufferCache;
  } catch (err) {
    console.warn(
      "[bazaar-order-email] Could not load logo for inline attach:",
      err
    );
    return null;
  }
}

export interface BazaarOrderEmailInput {
  order: BazaarOrderRow;
  items: BazaarOrderItemRow[];
}

/**
 * Receipt number convention: "DR-BZR-XXXXXXXX" — last 8 hex chars
 * of the order UUID, uppercased. Mirrors DR-DON-XXXXXXXX on the
 * donation side so admin / accounting can tell at a glance which
 * revenue stream a reference belongs to.
 */
export function bazaarReceiptNumber(orderId: string): string {
  const tail = orderId.replace(/-/g, "").slice(-8).toUpperCase();
  return `DR-BZR-${tail}`;
}

/** Send the order confirmation. Returns true on success, false on any error. */
export async function sendBazaarOrderConfirmation(
  input: BazaarOrderEmailInput
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[bazaar-order-email] RESEND_API_KEY not set — skipping email."
    );
    return false;
  }
  if (!input.order.contactEmail) {
    console.warn(
      `[bazaar-order-email] order ${input.order.id} has no contact_email — skipping.`
    );
    return false;
  }

  try {
    const resend = new Resend(key);
    const { subject, html, text } = buildBazaarOrderEmail(input);
    const logoBuffer = await loadLogoBuffer();

    const attachments: {
      filename: string;
      content: Buffer;
      contentType: string;
      contentId?: string;
    }[] = [];
    if (logoBuffer) {
      attachments.push({
        filename: "logo.png",
        content: logoBuffer,
        contentType: "image/png",
        contentId: LOGO_CID,
      });
    }

    console.log(
      "[bazaar-order-email] Sending to",
      input.order.contactEmail,
      "for order",
      bazaarReceiptNumber(input.order.id)
    );

    const result = await resend.emails.send({
      from: `Deen Relief Bazaar <${BAZAAR_FROM_EMAIL}>`,
      to: input.order.contactEmail,
      // BCC the shared inbox so trustees get a real-time
      // Gmail-side audit trail of every order — they can glance
      // at info@'s inbox to see the day's queue without opening
      // the admin. The bell + DR Admin order list remain the
      // primary surface; Gmail BCC is the backup.
      bcc: BAZAAR_SUPPORT_EMAIL,
      subject,
      html,
      text,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (result.error) {
      console.error(
        "[bazaar-order-email] Resend returned error:",
        result.error
      );
      // Order confirmation failure is genuinely urgent — customer
      // paid and didn't get a receipt. Notification lets a trustee
      // resend manually from the order detail page.
      await notifyEmailFailure({
        kind: `Order confirmation (${bazaarReceiptNumber(input.order.id)})`,
        recipientEmail: input.order.contactEmail ?? "(no email on file)",
        errorMessage:
          result.error.message ?? "Resend returned an error response",
        targetUrl: `/admin/bazaar/orders/${input.order.id}`,
        targetId: input.order.id,
      });
      return false;
    }

    console.log("[bazaar-order-email] Sent OK, id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[bazaar-order-email] Send threw:", err);
    await notifyEmailFailure({
      kind: `Order confirmation (${bazaarReceiptNumber(input.order.id)})`,
      recipientEmail: input.order.contactEmail ?? "(no email on file)",
      errorMessage: err instanceof Error ? err.message : "Unknown send error",
      targetUrl: `/admin/bazaar/orders/${input.order.id}`,
      targetId: input.order.id,
    });
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// Email body construction
// ─────────────────────────────────────────────────────────────────

function formatGbp(pence: number): string {
  return `£${fromPence(pence).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Extract a first-name from the shipping address name. Stripe
 * Checkout collects "Full Name" as a single field; we take the
 * first whitespace-separated token. Falls back to the whole string
 * if there are no spaces, and to "there" as the final fallback so
 * the email never reads "Thank you, ." in odd inputs.
 */
function firstNameFrom(fullName: string | undefined | null): string {
  if (!fullName) return "there";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
}

export function buildBazaarOrderEmail(input: BazaarOrderEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { order, items } = input;

  const receiptNum = bazaarReceiptNumber(order.id);
  const subject = `Your order from Deen Relief Bazaar — ${receiptNum}`;
  const firstName = firstNameFrom(order.shippingAddress?.name);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const orderDate = formatDate(new Date(order.createdAt));

  const siteUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://deenrelief.org";

  // ── HTML body ──
  // Brand palette: #1F6B3A green-dark, #F5F1E8 cream, #1F2937 charcoal,
  // #B8924A amber-dark. Same as the donation receipt so customers who
  // donate AND buy get a coherent visual identity from us.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F1E8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 20px;background-color:#ffffff;text-align:center;border-bottom:1px solid #E5E7EB;">
              <img
                src="cid:${LOGO_CID}"
                alt="${CHARITY_NAME}"
                width="180"
                style="display:block;margin:0 auto;width:180px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;"
              />
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#B8924A;margin-top:16px;">Order Received</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1F2937;line-height:1.25;">
                Thank you, ${escapeHtml(firstName)}.
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#4B5563;">
                Your order is in and your makers have been paid for
                their work. We&rsquo;ll pack and ship within two
                working days. You&rsquo;ll get a tracking number by
                email the moment your parcel leaves us.
              </p>

              <!-- Order summary card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F1E8;border-radius:12px;padding:24px;margin-bottom:24px;">
                <tr>
                  <td style="padding:0;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#B8924A;opacity:0.9;margin-bottom:12px;">Order ${escapeHtml(receiptNum)}</div>

                    <!-- Itemised lines -->
                    ${items
                      .map(
                        (item) => `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid rgba(31,107,58,0.12);">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#1F2937;">
                          <div style="font-weight:600;line-height:1.4;">
                            ${escapeHtml(item.productNameSnapshot)}${item.quantity > 1 ? ` &times; ${item.quantity}` : ""}
                          </div>
                          <div style="font-size:12px;color:#6B7280;margin-top:2px;">
                            ${item.variantSnapshot ? `${escapeHtml(item.variantSnapshot)} &middot; ` : ""}Made by ${escapeHtml(item.makerNameSnapshot)}
                          </div>
                        </td>
                        <td style="padding:10px 0;font-size:14px;color:#1F2937;font-weight:600;text-align:right;white-space:nowrap;vertical-align:top;">
                          ${formatGbp(item.unitPricePenceSnapshot * item.quantity)}
                        </td>
                      </tr>
                    </table>`
                      )
                      .join("")}

                    <!-- Totals -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:14px;color:#4B5563;">
                      <tr>
                        <td style="padding:4px 0;">${itemCount} item${itemCount === 1 ? "" : "s"}</td>
                        <td style="padding:4px 0;text-align:right;color:#1F2937;">${formatGbp(order.subtotalPence)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">Shipping</td>
                        <td style="padding:4px 0;text-align:right;color:#1F2937;">${order.shippingPence === 0 ? "Free" : formatGbp(order.shippingPence)}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 0;border-top:1px solid rgba(31,107,58,0.15);font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1F2937;">Total paid</td>
                        <td style="padding:10px 0 0;border-top:1px solid rgba(31,107,58,0.15);font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1F2937;text-align:right;">${formatGbp(order.totalPence)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Shipping details -->
              ${
                order.shippingAddress
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:0;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;margin-bottom:10px;">Shipping to</div>
                    <div style="font-size:14px;color:#1F2937;line-height:1.6;">
                      ${escapeHtml(order.shippingAddress.name)}<br />
                      ${escapeHtml(order.shippingAddress.line1)}<br />
                      ${order.shippingAddress.line2 ? `${escapeHtml(order.shippingAddress.line2)}<br />` : ""}
                      ${escapeHtml(order.shippingAddress.city)}<br />
                      ${escapeHtml(order.shippingAddress.postcode)}<br />
                      United Kingdom
                    </div>
                    <div style="margin-top:14px;padding-top:14px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280;line-height:1.6;">
                      Royal Mail Tracked &middot; arrives in 2&ndash;4 working days once shipped. Spot an error in this address? Reply to this email within the next few hours and we&rsquo;ll update it before dispatch.
                    </div>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <!-- Details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4B5563;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">Date</td>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;color:#1F2937;font-weight:500;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">Order reference</td>
                  <td style="padding:8px 0;text-align:right;color:#1F2937;font-weight:500;font-family:monospace;">${escapeHtml(receiptNum)}</td>
                </tr>
              </table>

              <!-- CTAs -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/bazaar" style="display:inline-block;padding:14px 28px;background-color:#1F2937;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">
                      Continue shopping
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Returns notice — durable-form copy per UK Consumer Contracts Regs -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;">
                <tr>
                  <td style="font-size:13px;color:#6B7280;line-height:1.6;text-align:center;">
                    Not what you hoped for? You have 14 days from delivery to return any item for a full refund.<br />
                    <a href="${siteUrl}/bazaar/returns" style="color:#1F6B3A;text-decoration:underline;font-weight:600;">Read the returns policy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${CHARITY_NAME}</strong> &middot; Registered charity in England &amp; Wales, No. ${CHARITY_NUMBER}<br />
              The Bazaar trades directly through ${CHARITY_NAME} under HMRC&rsquo;s small-trading exemption. Surplus from your order funds our charity programmes.<br /><br />
              Questions about your order? Reply to this email,
              <a href="${siteUrl}/bazaar/contact?order=${encodeURIComponent(receiptNum)}" style="color:#1F6B3A;text-decoration:underline;">use our contact form</a>, or write to
              <a href="mailto:${BAZAAR_SUPPORT_EMAIL}" style="color:#1F6B3A;text-decoration:underline;">${BAZAAR_SUPPORT_EMAIL}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // ── Plain text fallback ──
  const textLines = [
    `Thank you, ${firstName}.`,
    ``,
    `Your order is in and your makers have been paid for their work.`,
    `We'll pack and ship within two working days. You'll get a tracking`,
    `number by email the moment your parcel leaves us.`,
    ``,
    `──────────────────────────────`,
    `Order ${receiptNum}`,
    `──────────────────────────────`,
    ...items.map(
      (item) =>
        `  ${item.productNameSnapshot}${item.quantity > 1 ? ` × ${item.quantity}` : ""}\n    ${item.variantSnapshot ? `${item.variantSnapshot} · ` : ""}Made by ${item.makerNameSnapshot}\n    ${formatGbp(item.unitPricePenceSnapshot * item.quantity)}`
    ),
    ``,
    `  ${itemCount} item${itemCount === 1 ? "" : "s"}    ${formatGbp(order.subtotalPence)}`,
    `  Shipping     ${order.shippingPence === 0 ? "Free" : formatGbp(order.shippingPence)}`,
    `  ───────────`,
    `  Total paid   ${formatGbp(order.totalPence)}`,
    ``,
    order.shippingAddress
      ? [
          `Shipping to:`,
          `  ${order.shippingAddress.name}`,
          `  ${order.shippingAddress.line1}`,
          order.shippingAddress.line2 ? `  ${order.shippingAddress.line2}` : "",
          `  ${order.shippingAddress.city}`,
          `  ${order.shippingAddress.postcode}`,
          `  United Kingdom`,
          ``,
          `Royal Mail Tracked · 2-4 working days once shipped.`,
          `Spot a typo? Reply within the next few hours and we'll fix it.`,
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    ``,
    `Date:      ${orderDate}`,
    `Reference: ${receiptNum}`,
    ``,
    `Continue shopping: ${siteUrl}/bazaar`,
    ``,
    `Not what you hoped for? You have 14 days from delivery to return`,
    `for a full refund. Policy: ${siteUrl}/bazaar/returns`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `The Bazaar trades directly through ${CHARITY_NAME} under HMRC's`,
    `small-trading exemption. Surplus from your order funds our charity`,
    `programmes.`,
    ``,
    `Questions? Reply to this email, use our form (${siteUrl}/bazaar/contact?order=${encodeURIComponent(receiptNum)}),`,
    `or write to ${BAZAAR_SUPPORT_EMAIL}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text: textLines };
}

/** Minimal HTML-escape for interpolated values. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
