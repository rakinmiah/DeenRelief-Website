/**
 * PDF receipt for a single donation.
 *
 * Built with @react-pdf/renderer (pure JS, no headless browser).
 * Renders entirely server-side via the /api/admin/donations/[id]/receipt-pdf
 * route — never imported into client bundles.
 *
 * Why @react-pdf/renderer over Puppeteer / external service:
 *   - No headless Chrome binary on Vercel cold starts
 *   - No paid-per-PDF vendor dependency
 *   - Works in Node serverless without special config
 *   - Trade-off: re-implements the email template in PDF-specific JSX
 *     rather than reusing the HTML — reasonable cost for the deployment
 *     simplicity.
 *
 * Layout mirrors the email receipt: charity header, donation summary,
 * donor block, Gift Aid declaration (when claimed), footer with
 * charity registration. Single-page A4.
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { CHARITY_NAME, CHARITY_NUMBER } from "@/lib/gift-aid";
import { fromPence } from "@/lib/stripe";

// ─────────────────────────────────────────────────────────────────────────────
// Type contract — same shape as the email receipt input, plus the receipt
// number (which the email derives from the PI ID and the PDF derives from
// the donation row id).
// ─────────────────────────────────────────────────────────────────────────────

export interface DonationReceiptPdfInput {
  receiptNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  amountPence: number;
  campaignLabel: string;
  frequency: "one-time" | "monthly";
  giftAidClaimed: boolean;
  /** 'succeeded' | 'refunded' — refunded receipts are watermarked. */
  status: "succeeded" | "refunded";
  completedAt: Date;
  paymentIntentId: string | null;
  /**
   * Logo image as a data URL (e.g. "data:image/png;base64,..."). Set
   * server-side by reading public/images/logo.png. When null we fall
   * back to a text wordmark so the receipt still renders if the logo
   * file is missing.
   */
  logoDataUrl: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles. PDF stylesheets are a strict subset of CSS — no inheritance, no
// shorthand for some properties, hex colours only.
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  charcoal: "#1A1A2E",
  green: "#2D6A2E",
  greenDark: "#1F4A20",
  amberDark: "#A07A2C",
  cream: "#FDF8F0",
  borderLight: "#E5E5E0",
  textMuted: "#6B6B73",
  textFaint: "#9B9BA0",
};

// Note: we deliberately do NOT set a page-level `lineHeight` here.
// @react-pdf/renderer multiplies fontSize × lineHeight to compute line
// height — applying `lineHeight: 1.5` at the page level made the 32pt
// amount text use a 48pt line, overlapping the 10pt label below it.
// Each style sets its own lineHeight explicitly, tuned to its fontSize.

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 80, // room for fixed footer
    paddingHorizontal: 56,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.charcoal,
  },
  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  brandLogo: {
    width: 140,
    height: 36,
    objectFit: "contain",
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  brandTagline: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 1.4,
  },
  receiptMeta: { textAlign: "right" },
  receiptKicker: {
    fontSize: 8,
    color: COLORS.amberDark,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  receiptNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    lineHeight: 1.3,
  },
  receiptDate: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 6,
    lineHeight: 1.4,
  },
  // ─── Refund banner ──────────────────────────────────────────────────────
  refundBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 4,
    padding: 14,
    marginBottom: 24,
  },
  refundBannerText: {
    fontSize: 10,
    color: "#991B1B",
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.5,
  },
  // ─── Title ──────────────────────────────────────────────────────────────
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 8,
    lineHeight: 1.25,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 32,
    lineHeight: 1.5,
  },
  // ─── Section ────────────────────────────────────────────────────────────
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    lineHeight: 1.3,
  },
  // ─── Amount block ───────────────────────────────────────────────────────
  amountBlock: {
    backgroundColor: COLORS.cream,
    padding: 24,
    borderRadius: 6,
    marginBottom: 28,
  },
  amountValue: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 10,
    lineHeight: 1.15, // tight — the big number doesn't need much above/below
  },
  amountLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
  amountGiftAidLine: {
    fontSize: 10,
    color: COLORS.greenDark,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    lineHeight: 1.5,
  },
  // ─── KV rows ────────────────────────────────────────────────────────────
  kvRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  kvKey: { width: 110, color: COLORS.textMuted, fontSize: 10, lineHeight: 1.4 },
  kvValue: { flex: 1, color: COLORS.charcoal, fontSize: 10, lineHeight: 1.4 },
  // ─── Gift Aid block ─────────────────────────────────────────────────────
  giftAidBlock: {
    backgroundColor: COLORS.cream,
    padding: 16,
    borderRadius: 6,
    marginTop: 4,
  },
  giftAidConfirm: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.greenDark,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  giftAidDeclaration: {
    fontSize: 9,
    fontStyle: "italic",
    color: COLORS.textMuted,
    lineHeight: 1.55,
  },
  // ─── Footer ─────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 36,
    left: 56,
    right: 56,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textFaint,
    textAlign: "center",
    lineHeight: 1.6,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers (same outputs as the email receipt's helpers).
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Component.
// ─────────────────────────────────────────────────────────────────────────────

export function DonationReceiptPDF(input: DonationReceiptPdfInput) {
  const isRefunded = input.status === "refunded";
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const giftAidUplift = input.giftAidClaimed
    ? Math.round(input.amountPence * 0.25)
    : 0;
  const totalToCharity = input.amountPence + giftAidUplift;

  return (
    <Document
      title={`Donation receipt ${input.receiptNumber}`}
      author={CHARITY_NAME}
      subject={`Receipt for ${formatGbp(input.amountPence)} donation to ${input.campaignLabel}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header — logo on left (text fallback if logo file missing),
            receipt metadata on right. `fixed` so it appears at the top
            of every page if the receipt ever spans multiple pages. */}
        <View style={styles.header} fixed>
          <View>
            {input.logoDataUrl ? (
              // jsx-a11y treats this as an HTML img — it's @react-pdf's
              // Image component for PDF rendering, no alt-text concept.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={input.logoDataUrl} style={styles.brandLogo} />
            ) : (
              <>
                <Text style={styles.brand}>{CHARITY_NAME}</Text>
                <Text style={styles.brandTagline}>UK Islamic Charity</Text>
              </>
            )}
          </View>
          <View style={styles.receiptMeta}>
            <Text style={styles.receiptKicker}>Donation Receipt</Text>
            <Text style={styles.receiptNumber}>{input.receiptNumber}</Text>
            <Text style={styles.receiptDate}>
              {formatDate(input.completedAt)}
            </Text>
          </View>
        </View>

        {/* Refund watermark */}
        {isRefunded && (
          <View style={styles.refundBanner}>
            <Text style={styles.refundBannerText}>
              ⚠ This donation has been refunded. This receipt is retained
              for record-keeping but does not represent a current donation
              to the charity.
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>Thank you for your generosity</Text>
        <Text style={styles.subtitle}>
          Your {input.frequency === "monthly" ? "monthly " : ""}donation
          to {input.campaignLabel}
          {input.frequency === "monthly" ? " has been received" : " has been processed"}.
        </Text>

        {/* Amount block */}
        <View style={styles.amountBlock}>
          <Text style={styles.sectionLabel}>Amount donated</Text>
          <Text style={styles.amountValue}>
            {formatGbp(input.amountPence)}
          </Text>
          <Text style={styles.amountLabel}>
            {input.campaignLabel}
            {input.frequency === "monthly" ? " · monthly recurring" : ""}
          </Text>
          {input.giftAidClaimed && (
            <View style={styles.amountGiftAidLine}>
              <Text style={{ color: COLORS.greenDark, lineHeight: 1.5 }}>
                + {formatGbp(giftAidUplift)} reclaimable from HMRC via Gift Aid
              </Text>
              <Text
                style={{
                  color: COLORS.charcoal,
                  fontFamily: "Helvetica-Bold",
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                Total to charity: {formatGbp(totalToCharity)}
              </Text>
            </View>
          )}
        </View>

        {/* Donor */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Donor</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Name</Text>
            <Text style={styles.kvValue}>{fullName || "—"}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Email</Text>
            <Text style={styles.kvValue}>{input.email}</Text>
          </View>
          {input.addressLine1 && (
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Address</Text>
              <Text style={styles.kvValue}>
                {input.addressLine1}
                {input.addressLine2 ? `, ${input.addressLine2}` : ""}
                {input.city ? `, ${input.city}` : ""}
                {input.postcode ? `, ${input.postcode}` : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Donation details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Donation details</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Date</Text>
            <Text style={styles.kvValue}>
              {formatDate(input.completedAt)}
            </Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Campaign</Text>
            <Text style={styles.kvValue}>{input.campaignLabel}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Frequency</Text>
            <Text style={styles.kvValue}>
              {input.frequency === "monthly" ? "Monthly recurring" : "One-time"}
            </Text>
          </View>
          {input.paymentIntentId && (
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Reference</Text>
              <Text style={styles.kvValue}>{input.paymentIntentId}</Text>
            </View>
          )}
        </View>

        {/* Gift Aid block */}
        {input.giftAidClaimed && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Gift Aid declaration</Text>
            <View style={styles.giftAidBlock}>
              <Text style={styles.giftAidConfirm}>
                ✓ Donor has confirmed Gift Aid eligibility
              </Text>
              <Text style={styles.giftAidDeclaration}>
                &ldquo;I am a UK taxpayer and understand that if I pay
                less Income Tax and/or Capital Gains Tax in the current
                tax year than the amount of Gift Aid claimed on all my
                donations, it is my responsibility to pay any difference.
                I want to Gift Aid my donation and any donations I make in
                the future or have made in the past 4 years to{" "}
                {CHARITY_NAME}.&rdquo;
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {CHARITY_NAME} · Registered Charity No. {CHARITY_NUMBER} ·
            deenrelief.org
            {"\n"}
            This receipt is for your records. No further action is required.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
