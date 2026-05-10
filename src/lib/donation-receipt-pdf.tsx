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

const styles = StyleSheet.create({
  page: {
    padding: 48,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.charcoal,
    lineHeight: 1.5,
  },
  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  receiptMeta: { textAlign: "right" },
  receiptKicker: {
    fontSize: 8,
    color: COLORS.amberDark,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
  },
  // ─── Refund banner ──────────────────────────────────────────────────────
  refundBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  refundBannerText: {
    fontSize: 10,
    color: "#991B1B",
    fontFamily: "Helvetica-Bold",
  },
  // ─── Title ──────────────────────────────────────────────────────────────
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 28,
  },
  // ─── Section ────────────────────────────────────────────────────────────
  section: { marginBottom: 22 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  // ─── Amount block ───────────────────────────────────────────────────────
  amountBlock: {
    backgroundColor: COLORS.cream,
    padding: 20,
    borderRadius: 6,
    marginBottom: 24,
  },
  amountValue: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: COLORS.charcoal,
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  // ─── KV rows ────────────────────────────────────────────────────────────
  kvRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  kvKey: { width: 120, color: COLORS.textMuted, fontSize: 10 },
  kvValue: { flex: 1, color: COLORS.charcoal, fontSize: 10 },
  // ─── Gift Aid block ─────────────────────────────────────────────────────
  giftAidBlock: {
    backgroundColor: COLORS.cream,
    padding: 14,
    borderRadius: 6,
    marginTop: 4,
  },
  giftAidConfirm: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  giftAidDeclaration: {
    fontSize: 9,
    fontStyle: "italic",
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
  // ─── Footer ─────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textFaint,
    textAlign: "center",
    lineHeight: 1.5,
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
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>{CHARITY_NAME}</Text>
            <Text style={styles.brandTagline}>UK Islamic Charity</Text>
          </View>
          <View style={styles.receiptMeta}>
            <Text style={styles.receiptKicker}>Donation Receipt</Text>
            <Text style={styles.receiptNumber}>{input.receiptNumber}</Text>
            <Text style={[styles.brandTagline, { marginTop: 4 }]}>
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
            <Text style={[styles.amountLabel, { marginTop: 6, color: COLORS.greenDark }]}>
              + {formatGbp(giftAidUplift)} reclaimable from HMRC via Gift Aid
              {"\n"}
              Total to charity: {formatGbp(totalToCharity)}
            </Text>
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
