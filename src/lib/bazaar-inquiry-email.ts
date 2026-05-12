/**
 * Outbound reply email for the Bazaar inquiries inbox.
 *
 * When a trustee replies from /admin/bazaar/inquiries/[id], we send
 * the customer an email that looks like it came from
 * info@deenrelief.org. The trustee's plain-text reply is wrapped in
 * the brand's transactional template (matching order-confirmation
 * + shipping emails) so the customer sees a consistent voice across
 * touchpoints.
 *
 * Threading: Message-ID headers are set so a customer's email client
 * shows the reply in the same conversation as our prior emails
 * (order confirmation, shipping notification). When the customer
 * hits Reply, their reply lands in info@deenrelief.org Gmail with
 * the right In-Reply-To references, keeping the thread intact even
 * though phase-1 doesn't auto-capture inbound replies into the
 * inquiry log.
 *
 * Failure semantics: returns { messageId, error } — never throws.
 * Callers decide whether to surface failure to the admin (we do —
 * the inquiry detail page shows an error banner if the email
 * didn't actually go out).
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { BAZAAR_FROM_EMAIL, BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

export interface SendInquiryReplyInput {
  inquiryId: string;
  /** New message id we generated on insert (for thread headers). */
  messageId: string;
  /** Customer's name + email to address the reply to. */
  toName: string;
  toEmail: string;
  /** The subject from the original inquiry — we prepend "Re:". */
  inquirySubject: string;
  /** Receipt number (DR-BZR-…) if the inquiry references an order;
   *  appears in the body for the customer's reference. */
  receiptNumber?: string | null;
  /** Plain-text body the trustee typed. */
  body: string;
  /** The signed-in admin's email — appears in the Reply-To and the
   *  audit trail. Customer-facing rendering uses info@ though, so
   *  customer replies always land in the shared inbox not a single
   *  trustee's. */
  adminEmail: string;
}

export interface SendInquiryReplyResult {
  /** Resend's message id if the send succeeded. */
  messageId: string | null;
  /** Human-readable error message if the send failed. */
  error: string | null;
}

/**
 * Custom Message-ID format. Encodes our inquiry + message ids so
 * a future inbound-parsing phase can match a customer reply back
 * to the originating thread without database lookup ambiguity.
 *
 * The domain must be a domain we control (deenrelief.org) — RFC
 * 5322 only requires a globally-unique identifier; using our own
 * domain makes it visually obvious in mail logs.
 */
function buildMessageId(inquiryId: string, messageId: string): string {
  return `<inquiry-${inquiryId}-msg-${messageId}@deenrelief.org>`;
}

export async function sendInquiryReply(
  input: SendInquiryReplyInput
): Promise<SendInquiryReplyResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { messageId: null, error: "RESEND_API_KEY not configured" };
  }
  if (!input.toEmail) {
    return { messageId: null, error: "Recipient email is empty" };
  }

  const subject = input.inquirySubject.toLowerCase().startsWith("re:")
    ? input.inquirySubject
    : `Re: ${input.inquirySubject}`;

  // Generate our threading Message-ID *before* the send so we can
  // store it on the message row and reference it in future replies.
  const messageIdHeader = buildMessageId(input.inquiryId, input.messageId);

  const html = renderReplyHtml(input);
  const text = renderReplyText(input);

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      // Visually-friendly from name; the address is the shared
      // bazaar mailbox so customer replies route correctly.
      from: `Deen Relief Bazaar <${BAZAAR_FROM_EMAIL}>`,
      to: input.toEmail,
      // Customer reply-to is the shared inbox, NOT the individual
      // trustee. The audit log records who actually sent.
      replyTo: BAZAAR_SUPPORT_EMAIL,
      subject,
      html,
      text,
      headers: {
        "Message-ID": messageIdHeader,
      },
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
// Template renderers — match the look of bazaar-order-email
// ─────────────────────────────────────────────────────────────────

function renderReplyHtml(input: SendInquiryReplyInput): string {
  const firstName = input.toName.split(" ")[0] || input.toName;
  const bodyHtml = escapeHtml(input.body).replace(/\n/g, "<br />");
  const receiptLine = input.receiptNumber
    ? `<p style="margin:0 0 16px;font-size:13px;color:#6B7280;">In reference to order <strong style="color:#1F2937;font-family:monospace;">${escapeHtml(
        input.receiptNumber
      )}</strong></p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${escapeHtml(input.inquirySubject)}</title></head>
<body style="margin:0;padding:0;background-color:#F9F7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F7F1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 18px;font-size:15px;color:#1F2937;line-height:1.6;">Hi ${escapeHtml(
                firstName
              )},</p>
              ${receiptLine}
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
              <strong style="color:#1F2937;">${CHARITY_NAME}</strong> &middot; Registered charity in England &amp; Wales, No. ${CHARITY_NUMBER}<br />
              Reply to this email and your message comes straight back to us at
              <a href="mailto:${BAZAAR_SUPPORT_EMAIL}" style="color:#1F6B3A;text-decoration:underline;">${BAZAAR_SUPPORT_EMAIL}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderReplyText(input: SendInquiryReplyInput): string {
  const firstName = input.toName.split(" ")[0] || input.toName;
  const referenceLine = input.receiptNumber
    ? `Order reference: ${input.receiptNumber}\n\n`
    : "";
  return [
    `Hi ${firstName},`,
    ``,
    referenceLine.trim() || null,
    input.body,
    ``,
    `Thanks,`,
    `The Deen Relief Bazaar team`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Reply to this email and your message comes straight back to us at ${BAZAAR_SUPPORT_EMAIL}.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
