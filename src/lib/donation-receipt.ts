/**
 * Donation receipt email — built + sent on payment_intent.succeeded.
 *
 * Call from the webhook handler. Fails gracefully if Resend isn't configured
 * or the send errors out — we never want email trouble to block the webhook
 * (Stripe would retry and double-process otherwise).
 *
 * The email is self-contained HTML with inline styles. No external CSS, no
 * web fonts — many email clients strip <style> blocks and block remote
 * resources by default.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER, totalWithGiftAidGbp } from "@/lib/gift-aid";
import { fromPence } from "@/lib/stripe";

export interface DonationReceiptInput {
  toEmail: string;
  firstName: string;
  lastName: string;
  amountPence: number;
  campaignLabel: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
  paymentIntentId: string;
  completedAt: Date;
}

/** Send the receipt. Returns true on success, false on any error. */
export async function sendDonationReceipt(
  input: DonationReceiptInput
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[donation-receipt] RESEND_API_KEY not set — skipping email.");
    return false;
  }

  try {
    const resend = new Resend(key);
    const { subject, html, text } = buildReceiptEmail(input);

    console.log("[donation-receipt] Sending to", input.toEmail);
    const result = await resend.emails.send({
      from: `${CHARITY_NAME} <noreply@deenrelief.org>`,
      to: input.toEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[donation-receipt] Resend returned error:", result.error);
      return false;
    }

    console.log("[donation-receipt] Sent OK, id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[donation-receipt] Send threw:", err);
    return false;
  }
}

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

/** Short reference from PI ID — donor-friendly, appears on bank statements. */
function shortRef(piId: string): string {
  return piId.slice(-8).toUpperCase();
}

/** Build subject, HTML, and text bodies from the donation. */
export function buildReceiptEmail(input: DonationReceiptInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    firstName,
    amountPence,
    campaignLabel,
    frequency,
    giftAidClaimed,
    paymentIntentId,
    completedAt,
  } = input;

  const amountGbp = fromPence(amountPence);
  const giftAidGbp = giftAidClaimed
    ? totalWithGiftAidGbp(amountGbp) - amountGbp
    : 0;
  const totalGbp = amountGbp + giftAidGbp;
  const ref = shortRef(paymentIntentId);
  const dateStr = formatDate(completedAt);
  const subject = `Thank you for your donation to ${CHARITY_NAME} — receipt #${ref}`;

  // ── HTML email ──
  // Single-column 600px max-width, inline styles only, brand palette
  // (#1F6B3A green-dark, #F5F1E8 cream, #1F2937 charcoal).
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
                src="https://deenrelief.org/images/logo.png"
                alt="${CHARITY_NAME}"
                width="180"
                style="display:block;margin:0 auto;width:180px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;"
              />
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;margin-top:16px;">Donation Receipt</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1F2937;line-height:1.25;">
                Thank you, ${escapeHtml(firstName)}.
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#4B5563;">
                Your donation has been received. 100% will go directly to the people who need it most, in shā’ Allāh.
              </p>

              <!-- Receipt card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F1E8;border-radius:12px;padding:24px;margin-bottom:24px;">
                <tr>
                  <td style="padding:0;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;opacity:0.8;margin-bottom:6px;">${escapeHtml(campaignLabel)}</div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1F2937;line-height:1;">
                      ${formatGbp(amountPence)}${frequency === "monthly" ? '<span style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:500;color:#6B7280;"> / month</span>' : ""}
                    </div>
                    ${
                      giftAidClaimed
                        ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(31,107,58,0.15);">
                            <div style="font-size:13px;color:#1F6B3A;font-weight:600;">
                              + £${giftAidGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Gift Aid reclaimed from HMRC
                            </div>
                            <div style="font-size:15px;color:#1F2937;font-weight:700;margin-top:4px;">
                              Total impact: £${totalGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4B5563;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">Date</td>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;color:#1F2937;font-weight:500;">${dateStr}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">Reference</td>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;color:#1F2937;font-weight:500;font-family:monospace;">#${ref}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">Frequency</td>
                  <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;color:#1F2937;font-weight:500;">${frequency === "monthly" ? "Monthly" : "One-time"}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">Gift Aid</td>
                  <td style="padding:8px 0;text-align:right;color:#1F2937;font-weight:500;">${giftAidClaimed ? "Yes — 25% added at no cost to you" : "Not claimed"}</td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <a href="https://deenrelief.org/our-work" style="display:inline-block;padding:14px 28px;background-color:#1F6B3A;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">
                      See the impact
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${CHARITY_NAME}</strong> &middot; Registered charity in England &amp; Wales, No. ${CHARITY_NUMBER}<br />
              Please keep this email for your records. If you have any questions about your donation, reply to this email or write to
              <a href="mailto:info@deenrelief.org" style="color:#1F6B3A;text-decoration:underline;">info@deenrelief.org</a>.
              ${
                giftAidClaimed
                  ? `<br /><br /><span style="font-size:11px;color:#9CA3AF;">You agreed to Gift Aid this donation. If you no longer pay enough Income or Capital Gains Tax to cover the Gift Aid claimed, please let us know so we can cancel the declaration.</span>`
                  : ""
              }
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
    `Your donation has been received. 100% will go directly to the people who need it most, in shā’ Allāh.`,
    ``,
    `──────────────────────────────`,
    `${campaignLabel}`,
    `${formatGbp(amountPence)}${frequency === "monthly" ? " / month" : ""}`,
    giftAidClaimed
      ? `+ £${giftAidGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Gift Aid reclaimed\nTotal impact: £${totalGbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "",
    `──────────────────────────────`,
    ``,
    `Date:       ${dateStr}`,
    `Reference:  #${ref}`,
    `Frequency:  ${frequency === "monthly" ? "Monthly" : "One-time"}`,
    `Gift Aid:   ${giftAidClaimed ? "Yes — 25% added at no cost to you" : "Not claimed"}`,
    ``,
    `See the impact: https://deenrelief.org/our-work`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Reply to this email or write to info@deenrelief.org`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text: textLines };
}

/** Minimal HTML-escape for interpolated values (names, campaign labels). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
