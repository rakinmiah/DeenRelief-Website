/**
 * Bazaar shipping notification email — sent when an admin clicks
 * "Mark shipped & notify" on /admin/bazaar/orders/[id].
 *
 * The complement to the order confirmation email. Same visual
 * pattern, different intent:
 *   - Order confirmation: "We got your order, we'll ship in 2 days"
 *   - Shipping notification: "It's on its way, here's the tracking"
 *
 * What this email DOES:
 *   - Echoes the order ref + recipient name so the customer can
 *     match it to the order they remember
 *   - Surfaces the tracking number prominently — the whole point of
 *     this email is "click to see where your parcel is"
 *   - Links to the Royal Mail tracking page with the tracking
 *     number prefilled (https://www.royalmail.com/track-your-item)
 *   - Names the service tier (Tracked 48 / 24 / Special) so the
 *     customer knows what ETA to expect
 *
 * Doesn't include the full itemised line list (it's already in the
 * order confirmation email) — keeps this email scannable on a phone
 * notification.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { BAZAAR_FROM_EMAIL, BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import type { BazaarOrderRow } from "@/lib/bazaar-db";

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
      "[bazaar-shipping-email] Could not load logo for inline attach:",
      err
    );
    return null;
  }
}

const SERVICE_LABEL: Record<
  NonNullable<BazaarOrderRow["royalMailService"]>,
  string
> = {
  "tracked-48": "Royal Mail Tracked 48",
  "tracked-24": "Royal Mail Tracked 24",
  "special-delivery": "Royal Mail Special Delivery",
};

const SERVICE_ETA: Record<
  NonNullable<BazaarOrderRow["royalMailService"]>,
  string
> = {
  "tracked-48": "2–4 working days",
  "tracked-24": "1–2 working days",
  "special-delivery": "next working day, before 1 pm",
};

export interface BazaarShippingEmailInput {
  order: BazaarOrderRow;
}

export async function sendBazaarShippingNotification(
  input: BazaarShippingEmailInput
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[bazaar-shipping-email] RESEND_API_KEY not set — skipping email."
    );
    return false;
  }

  if (!input.order.contactEmail) {
    console.warn(
      `[bazaar-shipping-email] order ${input.order.id} has no contact_email — skipping.`
    );
    return false;
  }
  if (!input.order.trackingNumber || !input.order.royalMailService) {
    console.warn(
      `[bazaar-shipping-email] order ${input.order.id} missing tracking_number / royal_mail_service — skipping.`
    );
    return false;
  }

  try {
    const resend = new Resend(key);
    const { subject, html, text } = buildShippingEmail(input);
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
      "[bazaar-shipping-email] Sending to",
      input.order.contactEmail,
      "for order",
      bazaarReceiptNumber(input.order.id)
    );

    const result = await resend.emails.send({
      from: `Deen Relief Bazaar <${BAZAAR_FROM_EMAIL}>`,
      to: input.order.contactEmail,
      subject,
      html,
      text,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (result.error) {
      console.error(
        "[bazaar-shipping-email] Resend returned error:",
        result.error
      );
      return false;
    }

    console.log("[bazaar-shipping-email] Sent OK, id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[bazaar-shipping-email] Send threw:", err);
    return false;
  }
}

function firstNameFrom(fullName: string | undefined | null): string {
  if (!fullName) return "there";
  return fullName.trim().split(/\s+/)[0] || "there";
}

export function buildShippingEmail(input: BazaarShippingEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { order } = input;
  const receiptNum = bazaarReceiptNumber(order.id);
  const firstName = firstNameFrom(order.shippingAddress?.name);
  const trackingNumber = order.trackingNumber ?? "";
  const service = order.royalMailService!;
  const serviceLabel = SERVICE_LABEL[service];
  const serviceEta = SERVICE_ETA[service];

  // Royal Mail's track-your-item URL. The query param name has been
  // stable for years — if RM ever changes it, the customer can still
  // copy-paste the tracking number from the email body into the form.
  const trackUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`;

  const subject = `Your order is on its way — ${receiptNum}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://deenrelief.org";

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
              <img src="cid:${LOGO_CID}" alt="${CHARITY_NAME}" width="180" style="display:block;margin:0 auto;width:180px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;" />
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;margin-top:16px;">On its way</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1F2937;line-height:1.25;">
                ${escapeHtml(firstName)}, your parcel is on the way.
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#4B5563;">
                Your order has just been handed to Royal Mail. Expected delivery: <strong style="color:#1F2937;">${serviceEta}</strong>.
              </p>

              <!-- Tracking card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F1E8;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
                <tr>
                  <td style="padding:0;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;opacity:0.9;margin-bottom:10px;">Tracking number</div>
                    <div style="font-family:monospace;font-size:22px;font-weight:700;color:#1F2937;letter-spacing:0.04em;margin-bottom:6px;word-break:break-all;">
                      ${escapeHtml(trackingNumber)}
                    </div>
                    <div style="font-size:13px;color:#6B7280;margin-bottom:18px;">${escapeHtml(serviceLabel)}</div>
                    <a href="${trackUrl}" style="display:inline-block;padding:12px 24px;background-color:#1F6B3A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">
                      Track your parcel
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Order ref -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4B5563;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">Order reference</td>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;color:#1F2937;font-weight:500;font-family:monospace;">${escapeHtml(receiptNum)}</td>
                </tr>
                ${
                  order.shippingAddress
                    ? `<tr>
                  <td style="padding:8px 0;vertical-align:top;">Shipping to</td>
                  <td style="padding:8px 0;text-align:right;color:#1F2937;font-weight:500;line-height:1.5;">
                    ${escapeHtml(order.shippingAddress.name)}<br/>
                    ${escapeHtml(order.shippingAddress.line1)}<br/>
                    ${order.shippingAddress.line2 ? `${escapeHtml(order.shippingAddress.line2)}<br/>` : ""}
                    ${escapeHtml(order.shippingAddress.city)} ${escapeHtml(order.shippingAddress.postcode)}
                  </td>
                </tr>`
                    : ""
                }
              </table>

              <!-- Returns notice -->
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

  const textLines = [
    `${firstName}, your parcel is on the way.`,
    ``,
    `Your order has just been handed to Royal Mail.`,
    `Expected delivery: ${serviceEta}.`,
    ``,
    `──────────────────────────────`,
    `Tracking number:  ${trackingNumber}`,
    `Service:          ${serviceLabel}`,
    `Track:            ${trackUrl}`,
    `──────────────────────────────`,
    ``,
    `Order reference: ${receiptNum}`,
    ``,
    order.shippingAddress
      ? [
          `Shipping to:`,
          `  ${order.shippingAddress.name}`,
          `  ${order.shippingAddress.line1}`,
          order.shippingAddress.line2 ? `  ${order.shippingAddress.line2}` : "",
          `  ${order.shippingAddress.city} ${order.shippingAddress.postcode}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    ``,
    `Not what you hoped for? You have 14 days from delivery to return`,
    `for a full refund. Policy: ${siteUrl}/bazaar/returns`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    ``,
    `Questions? Reply to this email, use our form (${siteUrl}/bazaar/contact?order=${encodeURIComponent(receiptNum)}),`,
    `or write to ${BAZAAR_SUPPORT_EMAIL}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text: textLines };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
