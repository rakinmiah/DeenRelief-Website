/**
 * Outbound email for admin-initiated bazaar order messages.
 *
 * Mirrors donation-message-email.ts — same wrapper, different
 * From-name ("Deen Relief Bazaar" vs "Deen Relief") so the
 * customer recognises the brand of the order they bought into.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { BAZAAR_FROM_EMAIL, BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

export interface SendBazaarOrderMessageInput {
  orderId: string;
  messageId: string;
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  /** Receipt number (DR-BZR-…) to reference in the body. */
  receiptNumber: string;
  adminEmail: string;
}

export interface SendBazaarOrderMessageResult {
  messageId: string | null;
  error: string | null;
}

function buildMessageId(orderId: string, messageId: string): string {
  return `<order-${orderId}-msg-${messageId}@deenrelief.org>`;
}

export async function sendBazaarOrderMessageEmail(
  input: SendBazaarOrderMessageInput
): Promise<SendBazaarOrderMessageResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { messageId: null, error: "RESEND_API_KEY not configured" };
  }
  if (!input.toEmail) {
    return { messageId: null, error: "Recipient email is empty" };
  }

  const html = renderHtml(input);
  const text = renderText(input);
  const messageIdHeader = buildMessageId(input.orderId, input.messageId);

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: `Deen Relief Bazaar <${BAZAAR_FROM_EMAIL}>`,
      to: input.toEmail,
      replyTo: BAZAAR_SUPPORT_EMAIL,
      subject: input.subject,
      html,
      text,
      headers: { "Message-ID": messageIdHeader },
    });
    if (result.error) {
      return {
        messageId: null,
        error: result.error.message ?? "Resend send error",
      };
    }
    return { messageId: result.data?.id ?? null, error: null };
  } catch (err) {
    return {
      messageId: null,
      error: err instanceof Error ? err.message : "Unknown send error",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Template renderers
// ─────────────────────────────────────────────────────────────────

function renderHtml(input: SendBazaarOrderMessageInput): string {
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
              <p style="margin:0 0 4px;font-size:13px;color:#6B7280;">Re: order <strong style="color:#1F2937;font-family:monospace;">${escapeHtml(
                input.receiptNumber
              )}</strong></p>
              <p style="margin:18px 0 18px;font-size:15px;color:#1F2937;line-height:1.6;">Hi ${escapeHtml(
                firstName
              )},</p>
              <div style="font-size:15px;color:#1F2937;line-height:1.7;">
                ${bodyHtml}
              </div>
              <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.6;">
                Thanks,<br />
                The Deen Relief Bazaar team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${escapeHtml(CHARITY_NAME)}</strong> &middot; Registered charity in England &amp; Wales, No. ${escapeHtml(
                CHARITY_NUMBER
              )}<br />
              Reply to this email and your message comes straight back to us at
              <a href="mailto:${escapeHtml(BAZAAR_SUPPORT_EMAIL)}" style="color:#1F6B3A;text-decoration:underline;">${escapeHtml(
                BAZAAR_SUPPORT_EMAIL
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

function renderText(input: SendBazaarOrderMessageInput): string {
  const firstName = input.toName.split(" ")[0] || input.toName || "there";
  return [
    `Re: order ${input.receiptNumber}`,
    ``,
    `Hi ${firstName},`,
    ``,
    input.body,
    ``,
    `Thanks,`,
    `The Deen Relief Bazaar team`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Reply to this email and your message comes straight back to us at ${BAZAAR_SUPPORT_EMAIL}.`,
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
