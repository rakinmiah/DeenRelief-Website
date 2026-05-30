import "server-only";

/**
 * Notifies a sponsor that a new update about the child they sponsor has been
 * published. Deliberately minimal for safeguarding: it carries only the
 * child's display name (first name / pseudonym — what the sponsor already
 * sees in-portal) and a link to sign in. NO photos, videos, or details travel
 * in the email — those stay behind the authenticated, signed-URL portal.
 *
 * Same posture as the other email modules: returns { messageId, error },
 * never throws, notifies admins on failure.
 */

import { Resend } from "resend";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { notifyEmailFailure } from "@/lib/admin-notifications";

const FROM_EMAIL = process.env.SPONSOR_INVITE_FROM_EMAIL || "info@deenrelief.org";
const SUPPORT_EMAIL = "info@deenrelief.org";

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://deenrelief.org"
  );
}

export interface SendSponsorUpdateInput {
  toEmail: string;
  toName: string;
  childName: string;
  orphanSlug: string;
  periodLabel?: string | null;
}

export async function sendSponsorUpdateEmail(
  input: SendSponsorUpdateInput
): Promise<{ messageId: string | null; error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { messageId: null, error: "RESEND_API_KEY not configured" };
  if (!input.toEmail) return { messageId: null, error: "Recipient email is empty" };

  const link = `${siteOrigin()}/sponsor/orphan/${input.orphanSlug}`;
  const subject = `A new update about ${input.childName}`;
  const html = renderHtml({ ...input, link });
  const text = renderText({ ...input, link });

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
        kind: "Sponsor update notification",
        recipientEmail: input.toEmail,
        errorMessage,
      });
      return { messageId: null, error: errorMessage };
    }
    return { messageId: result.data?.id ?? null, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown send error";
    await notifyEmailFailure({
      kind: "Sponsor update notification",
      recipientEmail: input.toEmail,
      errorMessage,
    });
    return { messageId: null, error: errorMessage };
  }
}

function renderHtml(input: SendSponsorUpdateInput & { link: string }): string {
  const firstName = input.toName.split(" ")[0] || "there";
  const period = input.periodLabel ? ` (${escapeHtml(input.periodLabel)})` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>A new update</title></head>
<body style="margin:0;padding:0;background-color:#F9F7F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F7F1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Dear ${escapeHtml(firstName)},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">
                There's a new update about <strong>${escapeHtml(input.childName)}</strong>${period}, the child you
                sponsor. Sign in to your private sponsor account to read it and see the latest photos and video.
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="${escapeAttr(input.link)}"
                   style="display:inline-block;background-color:#2D6A2E;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:9999px;">
                  View the update
                </a>
              </p>
              <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
                For the child's protection, updates and media live only inside your secure account — never in email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
              <strong style="color:#1F2937;">${escapeHtml(CHARITY_NAME)}</strong> &middot; Registered charity in England &amp; Wales, No. ${escapeHtml(CHARITY_NUMBER)}<br />
              You're receiving this because you sponsor a child with us. You can turn these emails off in your
              account preferences.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(input: SendSponsorUpdateInput & { link: string }): string {
  const firstName = input.toName.split(" ")[0] || "there";
  const period = input.periodLabel ? ` (${input.periodLabel})` : "";
  return [
    `Dear ${firstName},`,
    ``,
    `There's a new update about ${input.childName}${period}, the child you sponsor. Sign in to your private sponsor account to read it and see the latest photos and video:`,
    input.link,
    ``,
    `For the child's protection, updates and media live only inside your secure account — never in email.`,
    ``,
    `──────────────────────────────`,
    `${CHARITY_NAME}`,
    `Registered charity in England & Wales, No. ${CHARITY_NUMBER}`,
    `You can turn these emails off in your account preferences.`,
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
