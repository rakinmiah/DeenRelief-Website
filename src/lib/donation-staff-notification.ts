/**
 * Staff donation notification — sent to the charity's contact inbox after
 * every successful donation (one-time + each monthly charge). Mirrors the
 * donor receipt's posture: never throws, never blocks the webhook.
 *
 * Includes everything a trustee needs to identify, acknowledge, and reconcile
 * a donation without opening Stripe Dashboard or Supabase: full donor
 * identity + contact, campaign + amount (with Gift Aid math), date/time,
 * receipt reference (matches the donor's), Stripe IDs for cross-reference,
 * marketing-consent flag, and any ad-attribution captured at landing.
 *
 * Recipient resolution: DONATIONS_NOTIFY_EMAIL → CONTACT_EMAIL → fallback.
 * The Reply-To header is the donor's email so trustees can respond directly.
 */

import { Resend } from "resend";
import { CHARITY_NAME, totalWithGiftAidGbp } from "@/lib/gift-aid";
import { fromPence } from "@/lib/stripe";

export interface StaffNotificationInput {
  // Donor
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  country: string;
  marketingConsent: boolean;

  // Donation
  amountPence: number;
  currency: string;
  campaignLabel: string;
  campaignSlug: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
  completedAt: Date;
  /** Used for the donor-facing reference number (last 8 chars). */
  paymentIntentId: string;

  // Stripe IDs (for cross-reference in Dashboard)
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string | null;

  // Attribution (all optional — present only on paid/UTM-tagged traffic)
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  landingPage: string | null;
  landingReferrer: string | null;

  /**
   * Qurbani only: names the slaughter is performed for. Empty array means
   * "performed in the billing donor's name" — staff email then shows
   * the donor's full name in the section.
   */
  qurbaniNames?: string[];
}

export async function sendDonationStaffNotification(
  input: StaffNotificationInput
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[staff-notification] RESEND_API_KEY not set — skipping.");
    return false;
  }

  const to =
    process.env.DONATIONS_NOTIFY_EMAIL ??
    process.env.CONTACT_EMAIL ??
    "info@deenrelief.org";

  try {
    const resend = new Resend(key);
    const { subject, html, text } = buildStaffEmail(input);

    const result = await resend.emails.send({
      from: `${CHARITY_NAME} Website <noreply@deenrelief.org>`,
      to,
      replyTo: input.email,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[staff-notification] Resend error:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[staff-notification] Send threw:", err);
    return false;
  }
}

function shortRef(piId: string): string {
  return piId.slice(-8).toUpperCase();
}

function formatGbp(pence: number): string {
  return `£${fromPence(pence).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatGbpAmount(gbp: number): string {
  return `£${gbp.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short",
  });
}

export function buildStaffEmail(input: StaffNotificationInput): {
  subject: string;
  html: string;
  text: string;
} {
  const ref = shortRef(input.paymentIntentId);
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const dateStr = formatDateTime(input.completedAt);
  const amountGbp = fromPence(input.amountPence);
  const giftAidGbp = input.giftAidClaimed
    ? totalWithGiftAidGbp(amountGbp) - amountGbp
    : 0;
  const totalGbp = amountGbp + giftAidGbp;
  const freqLabel = input.frequency === "monthly" ? "Monthly" : "One-time";
  const amountSuffix = input.frequency === "monthly" ? " / month" : "";

  const subject = `New ${freqLabel.toLowerCase()} donation: ${formatGbp(input.amountPence)} — ${input.campaignLabel} — ${fullName} [#${ref}]`;

  const addressLines = [
    input.addressLine1,
    input.addressLine2,
    [input.city, input.postcode].filter(Boolean).join(" "),
    input.country,
  ].filter((l): l is string => Boolean(l));

  const hasAttribution = Boolean(
    input.utmSource ||
      input.utmMedium ||
      input.utmCampaign ||
      input.utmTerm ||
      input.utmContent ||
      input.gclid ||
      input.landingPage ||
      input.landingReferrer
  );

  // Qurbani names section: shown only on Qurbani campaigns. Empty input
  // resolves to the billing donor's name so the section never appears empty.
  const qurbaniNamesResolved =
    input.campaignSlug === "qurbani"
      ? input.qurbaniNames && input.qurbaniNames.length > 0
        ? input.qurbaniNames
        : [fullName]
      : [];

  // ── Plain text — primary format for staff inbox triage and forwarding ──
  const textLines = [
    `New ${freqLabel.toLowerCase()} donation`,
    `══════════════════════════════════════════════════`,
    ``,
    `Receipt reference:  #${ref}`,
    `Date / time:        ${dateStr}`,
    ``,
    `Campaign:           ${input.campaignLabel}  (slug: ${input.campaignSlug})`,
    `Amount:             ${formatGbp(input.amountPence)}${amountSuffix}`,
    input.giftAidClaimed
      ? `Gift Aid:           Yes — +${formatGbpAmount(giftAidGbp)} reclaimed (total impact ${formatGbpAmount(totalGbp)})`
      : `Gift Aid:           No`,
    `Frequency:          ${freqLabel}`,
    ``,
    `── Donor ─────────────────────────────────────────`,
    `Name:               ${fullName}`,
    `Email:              ${input.email}`,
    `Phone:              ${input.phone ?? "(not provided)"}`,
    `Address:`,
    ...addressLines.map((l) => `  ${l}`),
    `Marketing consent:  ${input.marketingConsent ? "Yes — opted in" : "No"}`,
    ``,
    qurbaniNamesResolved.length > 0
      ? `── Performed in the name of ──────────────────────\n${qurbaniNamesResolved.map((n, i) => `${String(i + 1).padStart(2, " ")}. ${n}`).join("\n")}\n`
      : "",
    `── Stripe references ─────────────────────────────`,
    `PaymentIntent:      ${input.stripePaymentIntentId ?? "—"}`,
    `Customer:           ${input.stripeCustomerId ?? "—"}`,
    input.frequency === "monthly"
      ? `Subscription:       ${input.stripeSubscriptionId ?? "—"}`
      : "",
    input.stripeInvoiceId
      ? `Invoice:            ${input.stripeInvoiceId}`
      : "",
    ``,
    hasAttribution ? `── Attribution ───────────────────────────────────` : "",
    input.utmSource ? `Source:             ${input.utmSource}` : "",
    input.utmMedium ? `Medium:             ${input.utmMedium}` : "",
    input.utmCampaign ? `Campaign:           ${input.utmCampaign}` : "",
    input.utmTerm ? `Term:               ${input.utmTerm}` : "",
    input.utmContent ? `Content:            ${input.utmContent}` : "",
    input.gclid ? `Google click ID:    ${input.gclid}` : "",
    input.landingPage ? `Landing page:       ${input.landingPage}` : "",
    input.landingReferrer ? `Referrer:           ${input.landingReferrer}` : "",
    hasAttribution ? `` : "",
    `══════════════════════════════════════════════════`,
    `Reply to this email to respond to ${input.firstName} directly.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  // ── HTML — clean two-column data table, no images, inline styles only ──
  const row = (label: string, value: string, mono = false) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#1F2937;font-size:14px;${mono ? "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;" : ""}">${escapeHtml(value)}</td>
    </tr>`;

  const sectionHeader = (title: string) => `
    <tr>
      <td colspan="2" style="padding:20px 0 8px;border-bottom:1px solid #E5E7EB;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#1F6B3A;">${escapeHtml(title)}</div>
      </td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #E5E7EB;">
          <tr>
            <td style="padding:24px 28px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1F6B3A;margin-bottom:6px;">New ${escapeHtml(freqLabel.toLowerCase())} donation</div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#1F2937;line-height:1.3;">
                ${escapeHtml(formatGbp(input.amountPence))}${escapeHtml(amountSuffix)} — ${escapeHtml(input.campaignLabel)}
              </h1>
              <div style="margin-top:6px;font-size:14px;color:#6B7280;">
                ${escapeHtml(fullName)} · #${escapeHtml(ref)} · ${escapeHtml(dateStr)}
              </div>
              ${
                input.giftAidClaimed
                  ? `<div style="margin-top:10px;display:inline-block;padding:4px 10px;background-color:#ECFDF5;color:#065F46;font-size:12px;font-weight:600;border-radius:999px;">+ ${escapeHtml(formatGbpAmount(giftAidGbp))} Gift Aid · Total impact ${escapeHtml(formatGbpAmount(totalGbp))}</div>`
                  : ""
              }

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-collapse:collapse;">
                ${sectionHeader("Donation")}
                ${row("Reference", `#${ref}`, true)}
                ${row("Date / time", dateStr)}
                ${row("Campaign", `${input.campaignLabel}  (slug: ${input.campaignSlug})`)}
                ${row("Amount", `${formatGbp(input.amountPence)}${amountSuffix}`)}
                ${row("Frequency", freqLabel)}
                ${row("Gift Aid", input.giftAidClaimed ? `Yes — +${formatGbpAmount(giftAidGbp)} reclaimed (total ${formatGbpAmount(totalGbp)})` : "No")}

                ${sectionHeader("Donor")}
                ${row("Name", fullName)}
                ${row("Email", input.email)}
                ${row("Phone", input.phone ?? "(not provided)")}
                ${row("Address", addressLines.join("\n"))}
                ${row("Marketing consent", input.marketingConsent ? "Yes — opted in" : "No")}

                ${
                  qurbaniNamesResolved.length > 0
                    ? `${sectionHeader("Performed in the name of")}
                ${qurbaniNamesResolved
                  .map((n, i) => row(`Share ${i + 1}`, n))
                  .join("")}`
                    : ""
                }

                ${sectionHeader("Stripe references")}
                ${row("PaymentIntent", input.stripePaymentIntentId ?? "—", true)}
                ${row("Customer", input.stripeCustomerId ?? "—", true)}
                ${input.frequency === "monthly" ? row("Subscription", input.stripeSubscriptionId ?? "—", true) : ""}
                ${input.stripeInvoiceId ? row("Invoice", input.stripeInvoiceId, true) : ""}

                ${
                  hasAttribution
                    ? `${sectionHeader("Attribution")}
                ${input.utmSource ? row("Source", input.utmSource) : ""}
                ${input.utmMedium ? row("Medium", input.utmMedium) : ""}
                ${input.utmCampaign ? row("Campaign", input.utmCampaign) : ""}
                ${input.utmTerm ? row("Term", input.utmTerm) : ""}
                ${input.utmContent ? row("Content", input.utmContent) : ""}
                ${input.gclid ? row("Google click ID", input.gclid, true) : ""}
                ${input.landingPage ? row("Landing page", input.landingPage) : ""}
                ${input.landingReferrer ? row("Referrer", input.landingReferrer) : ""}`
                    : ""
                }
              </table>

              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.6;">
                Reply to this email to respond to ${escapeHtml(input.firstName)} directly.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
