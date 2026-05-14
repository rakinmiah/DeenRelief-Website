/**
 * Outbound email for admin-initiated donor messages.
 *
 * When a trustee composes an email from /admin/donations/[id], we
 * send the donor a transactional email from info@deenrelief.org
 * with the trustee's subject + body wrapped in the standard
 * brand template (header, body, charity footer with reg number).
 *
 * Failure semantics: returns { messageId, error } — never throws.
 * Callers log the attempt regardless of outcome so trustees can
 * see what they tried to send and any error reason inline.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { notifyEmailFailure } from "@/lib/admin-notifications";

// Donations use the main charity inbox for replies (not the
// bazaar inbox). Kept inline to avoid pulling in bazaar-config
// from non-bazaar code paths.
const DONATION_FROM_EMAIL = "info@deenrelief.org";
const DONATION_SUPPORT_EMAIL = "info@deenrelief.org";

export interface SendDonationMessageInput {
  /** Donation id — used for the threading Message-ID so a future
   *  inbound-capture phase can match replies back to the row. */
  donationId: string;
  /** The row id we already created in donation_messages — also
   *  goes into the Message-ID so each individual send is uniquely
   *  identifiable in logs. */
  messageId: string;
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  /** Signed-in admin email — appears in metadata + audit trail.
   *  Customer-facing Reply-To is the shared info@ inbox, not the
   *  individual trustee, so replies always reach the team. */
  adminEmail: string;
}

export interface SendDonationMessageResult {
  messageId: string | null;
  error: string | null;
}

function buildMessageId(donationId: string, messageId: string): string {
  return `<donation-${donationId}-msg-${messageId}@deenrelief.org>`;
}

export async function sendDonationMessageEmail(
  input: SendDonationMessageInput
): Promise<SendDonationMessageResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { messageId: null, error: "RESEND_API_KEY not configured" };
  }
  if (!input.toEmail) {
    return { messageId: null, error: "Recipient email is empty" };
  }

  const html = renderHtml(input);
  const text = renderText(input);
  const messageIdHeader = buildMessageId(input.donationId, input.messageId);

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: `${CHARITY_NAME} <${DONATION_FROM_EMAIL}>`,
      to: input.toEmail,
      replyTo: DONATION_SUPPORT_EMAIL,
      subject: input.subject,
      html,
      text,
      headers: { "Message-ID": messageIdHeader },
    });
    if (result.error) {
      const errorMessage = result.error.message ?? "Resend send error";
      await notifyEmailFailure({
        kind: "Donor message",
        recipientEmail: input.toEmail,
        errorMessage,
        targetUrl: `/admin/donations/${input.donationId}`,
        targetId: input.donationId,
      });
      return { messageId: null, error: errorMessage };
    }
    return { messageId: result.data?.id ?? null, error: null };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown send error";
    await notifyEmailFailure({
      kind: "Donor message",
      recipientEmail: input.toEmail,
      errorMessage,
      targetUrl: `/admin/donations/${input.donationId}`,
      targetId: input.donationId,
    });
    return { messageId: null, error: errorMessage };
  }
}

// ─────────────────────────────────────────────────────────────────
// Template renderers
// ─────────────────────────────────────────────────────────────────

function renderHtml(input: SendDonationMessageInput): string {
  const firstName = input.toName.split(" ")[0] || input.toName || "there";
  const bodyHtml = escapeHtml(input.body).replace(/\n/g, "<br />");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#F9F7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F7F1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 18px;font-size:15px;color:#1F2937;line-height:1.6;">Dear ${escapeHtml(
                firstName
              )},</p>
              <div style="font-size:15px;color:#1F2937;line-height:1.7;">
                ${bodyHtml}
              </div>
              <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.6;">
                With thanks,<br />
                The ${escapeHtml(CHARITY_NAME)} team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${escapeHtml(CHARITY_NAME)}</strong> &middot; Registered charity in England &amp; Wales, No. ${escapeHtml(
                CHARITY_NUMBER
              )}<br />
              Reply to this email and your message comes straight back to us at
              <a href="mailto:${escapeHtml(DONATION_SUPPORT_EMAIL)}" style="color:#1F6B3A;text-decoration:underline;">${escapeHtml(
                DONATION_SUPPORT_EMAIL
              )}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(input: SendDonationMessageInput): string {
  const firstName = input.toName.split(" ")[0] || input.toName || "there";
  return [
    `Dear ${firstName},`,
    ``,
    input.body,
    ``,
    `With thanks,`,
    `The ${CHARITY_NAME} team`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Reply to this email and your message comes straight back to us at ${DONATION_SUPPORT_EMAIL}.`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
