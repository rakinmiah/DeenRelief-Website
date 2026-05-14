/**
 * Cart abandonment recovery email.
 *
 * Fired from the Stripe `checkout.session.expired` webhook for
 * bazaar sessions that captured the customer's email but didn't
 * complete payment within Stripe's 24-hour session window.
 *
 * Brand voice: soft, considered, editorial — matches the rest of
 * the bazaar's tone. NOT urgent fast-fashion language. The frame
 * is "you were looking at the [Sylhet Abaya], it's still here,
 * Khadija still makes them" — recognition of the considered-purchase
 * mindset that drives this brand vs. impulse-buy stores.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { BAZAAR_FROM_EMAIL, BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import type { BazaarOrderItemRow } from "@/lib/bazaar-db";

export interface SendCartAbandonmentInput {
  /** The expired order's id — used in the Message-ID header. */
  orderId: string;
  toEmail: string;
  /** Customer's name from Stripe's billing details, if captured.
   *  Falls back to "there" if missing. */
  toName: string | null;
  /** Snapshot of the items the customer had in their cart. */
  items: BazaarOrderItemRow[];
}

export interface SendCartAbandonmentResult {
  messageId: string | null;
  error: string | null;
}

function buildMessageId(orderId: string): string {
  return `<cart-abandonment-${orderId}@deenrelief.org>`;
}

export async function sendCartAbandonmentEmail(
  input: SendCartAbandonmentInput
): Promise<SendCartAbandonmentResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { messageId: null, error: "RESEND_API_KEY not configured" };
  }
  if (!input.toEmail) {
    return { messageId: null, error: "Recipient email is empty" };
  }

  const subject = buildSubject(input.items);
  const html = renderHtml(input);
  const text = renderText(input);

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: `Deen Relief Bazaar <${BAZAAR_FROM_EMAIL}>`,
      to: input.toEmail,
      replyTo: BAZAAR_SUPPORT_EMAIL,
      // BCC trustees so the recovery email is visible in Gmail —
      // a trustee can reach out personally if it's a big-ticket
      // cart or repeat customer.
      bcc: BAZAAR_SUPPORT_EMAIL,
      subject,
      html,
      text,
      headers: { "Message-ID": buildMessageId(input.orderId) },
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
// Subject + body
// ─────────────────────────────────────────────────────────────────

function buildSubject(items: BazaarOrderItemRow[]): string {
  // Single-item cart → name the item by maker. Multi-item → a
  // softer collective phrasing.
  if (items.length === 1) {
    const item = items[0];
    return `${item.productNameSnapshot} is still here`;
  }
  return `Still thinking about it?`;
}

function renderHtml(input: SendCartAbandonmentInput): string {
  const firstName =
    (input.toName && input.toName.split(" ")[0]) || "there";
  const itemRows = input.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E5E7EB;">
          <div style="font-weight:600;color:#1F2937;font-size:14px;">${escapeHtml(
            item.productNameSnapshot
          )}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:4px;">
            ${
              item.variantSnapshot
                ? `${escapeHtml(item.variantSnapshot)} · `
                : ""
            }Made by ${escapeHtml(item.makerNameSnapshot)}${
              item.quantity > 1 ? ` · qty ${item.quantity}` : ""
            }
          </div>
        </td>
      </tr>`
    )
    .join("");

  const recoveryUrl = buildRecoveryUrl();

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${escapeHtml(
    buildSubject(input.items)
  )}</title></head>
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
              <p style="margin:0 0 18px;font-size:15px;color:#1F2937;line-height:1.7;">
                You started a checkout at the Deen Relief Bazaar
                earlier and didn&rsquo;t finish &mdash; everything
                you were looking at is still here.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#1F2937;line-height:1.7;">
                We make these pieces slowly, by hand, in small
                batches. If you&rsquo;d still like one this round,
                here&rsquo;s where you left off:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E7EB;">
                ${itemRows}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td>
                    <a href="${recoveryUrl}" style="display:inline-block;padding:14px 28px;background-color:#1F2937;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">
                      Pick up where I left off
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
                No pressure &mdash; if it&rsquo;s not the right
                time, the pieces will still be here when you come
                back. Every order pays the maker fairly and surplus
                funds our charity programmes.
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

function renderText(input: SendCartAbandonmentInput): string {
  const firstName =
    (input.toName && input.toName.split(" ")[0]) || "there";
  const itemLines = input.items
    .map((item) => {
      const variant = item.variantSnapshot ? `${item.variantSnapshot} · ` : "";
      const qty = item.quantity > 1 ? ` · qty ${item.quantity}` : "";
      return `  ${item.productNameSnapshot}\n    ${variant}Made by ${item.makerNameSnapshot}${qty}`;
    })
    .join("\n");

  return [
    `Hi ${firstName},`,
    ``,
    `You started a checkout at the Deen Relief Bazaar earlier and`,
    `didn't finish — everything you were looking at is still here.`,
    ``,
    `We make these pieces slowly, by hand, in small batches. If`,
    `you'd still like one this round, here's where you left off:`,
    ``,
    itemLines,
    ``,
    `Pick up where you left off:`,
    `${buildRecoveryUrl()}`,
    ``,
    `No pressure — if it's not the right time, the pieces will`,
    `still be here when you come back. Every order pays the maker`,
    `fairly and surplus funds our charity programmes.`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Reply to this email and your message comes straight back to us at ${BAZAAR_SUPPORT_EMAIL}.`,
  ].join("\n");
}

function buildRecoveryUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://deenrelief.org";
  // Send recovery clicks to the catalog grid — the customer's
  // localStorage cart may still be on their device, in which case
  // the cart button in the header reflects their session-aged
  // selection. If they're on a different device, they re-add. We
  // append a small UTM so analytics can attribute conversions back
  // to the abandonment email.
  return `${baseUrl}/bazaar#catalog?utm_source=email&utm_medium=cart-abandonment&utm_campaign=recovery`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
