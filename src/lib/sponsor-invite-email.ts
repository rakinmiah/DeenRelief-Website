import "server-only";

/**
 * Outbound invite email for the orphan sponsorship portal.
 *
 * Onboarding is INVITE-ONLY: an admin links a sponsor to a child after a
 * recurring donation is confirmed, then sends this email. It carries the
 * Supabase Auth action link (generated server-side via
 * auth.admin.generateLink) that lets the sponsor set their password and
 * activate the account at /sponsor/set-password.
 *
 * We send through Resend (not Supabase's default SMTP) so the email matches
 * the rest of the charity's branding. Same failure posture as the other
 * email modules: returns { messageId, error }, never throws, notifies on
 * failure.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { notifyEmailFailure } from "@/lib/admin-notifications";

const FROM_EMAIL = process.env.SPONSOR_INVITE_FROM_EMAIL || "info@deenrelief.org";
const SUPPORT_EMAIL = "info@deenrelief.org";

export interface SendSponsorInviteInput {
  toEmail: string;
  toName: string;
  /** Supabase Auth action link → /sponsor/set-password. */
  actionLink: string;
  /**
   * 'welcome' = automatic email after a donor starts a monthly sponsorship.
   * 'invite'  = admin manually invited them. Only changes the copy.
   */
  variant?: "invite" | "welcome";
}

export interface SendSponsorInviteResult {
  messageId: string | null;
  error: string | null;
}

export async function sendSponsorInviteEmail(
  input: SendSponsorInviteInput
): Promise<SendSponsorInviteResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { messageId: null, error: "RESEND_API_KEY not configured" };
  if (!input.toEmail) return { messageId: null, error: "Recipient email is empty" };

  const subject =
    input.variant === "welcome"
      ? `Welcome to ${CHARITY_NAME} — activate your sponsor account`
      : `Activate your ${CHARITY_NAME} sponsorship account`;
  const html = renderHtml(input);
  const text = renderText(input);

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: `${CHARITY_NAME} <${FROM_EMAIL}>`,
      to: input.toEmail,
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
    });
    if (result.error) {
      const errorMessage = result.error.message ?? "Resend send error";
      await notifyEmailFailure({
        kind: "Sponsor invite",
        recipientEmail: input.toEmail,
        errorMessage,
        targetUrl: "/admin/sponsorship/sponsors",
      });
      return { messageId: null, error: errorMessage };
    }
    return { messageId: result.data?.id ?? null, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown send error";
    await notifyEmailFailure({
      kind: "Sponsor invite",
      recipientEmail: input.toEmail,
      errorMessage,
      targetUrl: "/admin/sponsorship/sponsors",
    });
    return { messageId: null, error: errorMessage };
  }
}

// ─────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────

function introLine(variant: SendSponsorInviteInput["variant"]): string {
  return variant === "welcome"
    ? `Thank you for sponsoring a child through ${CHARITY_NAME} — and welcome. Your monthly sponsorship is now set up. We've created a private account where you can follow their progress — written updates, photos, and videos we'll share with you over time.`
    : `Thank you for sponsoring a child through ${CHARITY_NAME}. We've created a private account where you can follow their progress — monthly written updates, photos, and videos we'll share with you over time.`;
}

function renderHtml(input: SendSponsorInviteInput): string {
  const firstName = input.toName.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Activate your sponsorship account</title></head>
<body style="margin:0;padding:0;background-color:#F9F7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F7F1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Dear ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
                ${escapeHtml(introLine(input.variant))}
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">
                To activate your account, set your password using the secure link below.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="${escapeAttr(input.actionLink)}"
                   style="display:inline-block;background-color:#1F6B3A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:9999px;">
                  Activate my account
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#6B7280;line-height:1.6;">
                This link is single-use and expires for your security. If it has expired, reply to this
                email and we'll send a fresh one.
              </p>
              <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
                Please keep the updates and media in your account confidential — they involve a child in
                our care, and we share them with you in trust.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${escapeHtml(CHARITY_NAME)}</strong> &middot; Registered charity in England &amp; Wales, No. ${escapeHtml(CHARITY_NUMBER)}<br />
              Questions? Reply to this email and it reaches us at
              <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#1F6B3A;text-decoration:underline;">${escapeHtml(SUPPORT_EMAIL)}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(input: SendSponsorInviteInput): string {
  const firstName = input.toName.split(" ")[0] || "there";
  return [
    `Dear ${firstName},`,
    ``,
    introLine(input.variant),
    ``,
    `Activate your account and set your password here:`,
    input.actionLink,
    ``,
    `This link is single-use and expires for your security. If it has expired, reply to this email and we'll send a fresh one.`,
    ``,
    `Please keep the updates and media in your account confidential — they involve a child in our care.`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `Questions? Reply to this email and it reaches us at ${SUPPORT_EMAIL}.`,
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

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
