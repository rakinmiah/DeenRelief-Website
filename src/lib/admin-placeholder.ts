/**
 * Placeholder fixture data for the admin dashboard mockup.
 *
 * Real implementation: every export from this file is replaced with a
 * Supabase query. The shape of the data is the source of truth — keep it
 * stable when wiring real queries.
 *
 * Money: integer pence. Display formatting via formatPence() at the
 * boundary only. UK date format (DD/MM/YYYY) is applied at the display
 * boundary too — the timestamps here stay ISO so sorting/filtering works.
 */

export type DonationStatus = "paid" | "pending" | "failed" | "refunded";
export type DonationFrequency = "one-time" | "monthly";
export type CampaignSlug =
  | "palestine"
  | "zakat"
  | "orphan-sponsorship"
  | "qurbani"
  | "cancer-care"
  | "clean-water"
  | "build-a-school"
  | "uk-homeless"
  | "sadaqah";

export interface AdminDonation {
  id: string;
  /** Human-readable receipt number, what the donor sees in their email. */
  receiptNumber: string;
  /** ISO timestamp of when the donation was charged. */
  chargedAt: string;
  donorName: string;
  donorEmail: string;
  amountPence: number;
  /** If gift_aid_claimed = true, the additional 25% reclaimable from HMRC. */
  giftAidReclaimablePence: number;
  giftAidClaimed: boolean;
  campaignSlug: CampaignSlug;
  campaignLabel: string;
  /** Zakat-only — the chosen distribution pathway. */
  pathway?: string;
  frequency: DonationFrequency;
  status: DonationStatus;
  /** Stripe payment intent ID for cross-reference + reconciliation. */
  stripePaymentIntent: string;
  /** Stripe customer ID, useful for opening the customer in Stripe directly. */
  stripeCustomerId: string;
  /** If part of a recurring subscription, the Stripe subscription ID. */
  stripeSubscriptionId?: string;
}

export interface AdminRecurringSubscription {
  id: string;
  /** Stripe subscription ID. */
  stripeSubscriptionId: string;
  donorName: string;
  donorEmail: string;
  campaignSlug: CampaignSlug;
  campaignLabel: string;
  amountPerCyclePence: number;
  /** "monthly" only at present — left as a field for future flexibility. */
  cycle: "monthly";
  startedAt: string;
  /** null while still active. */
  cancelledAt: string | null;
  /** Number of successful charges since startedAt. */
  totalChargesCount: number;
  /** Sum of all successful charges in pence. */
  totalCollectedPence: number;
  /** ISO date of next scheduled charge while active. */
  nextChargeAt: string | null;
  /** Last 4 of the active card. */
  cardLast4: string;
  cardBrand: "visa" | "mastercard" | "amex";
  /** Active when Stripe still has it as active; cancelled = cancelled but kept for history. */
  status: "active" | "past_due" | "cancelled";
}

const PLACEHOLDER_CAMPAIGNS: Record<
  CampaignSlug,
  { label: string }
> = {
  palestine: { label: "Palestine Emergency Relief" },
  zakat: { label: "Zakat" },
  "orphan-sponsorship": { label: "Bangladesh Orphan Sponsorship" },
  qurbani: { label: "Qurbani" },
  "cancer-care": { label: "Cancer Care for Refugee Children" },
  "clean-water": { label: "Bangladesh Clean Water" },
  "build-a-school": { label: "Build a School in Bangladesh" },
  "uk-homeless": { label: "UK Homeless Outreach" },
  sadaqah: { label: "Sadaqah" },
};

export function campaignLabel(slug: CampaignSlug): string {
  return PLACEHOLDER_CAMPAIGNS[slug]?.label ?? slug;
}

/**
 * 14 placeholder donations spanning multiple campaigns, both one-time and
 * monthly, with and without Gift Aid. Mixed statuses so the admin UI can
 * be exercised end-to-end (paid / pending / failed / refunded).
 */
export const PLACEHOLDER_DONATIONS: AdminDonation[] = [
  {
    id: "don_001",
    receiptNumber: "DR-DON-2026-0142",
    chargedAt: "2026-05-09T14:23:00Z",
    donorName: "Aisha Hussain",
    donorEmail: "aisha.h@example.co.uk",
    amountPence: 5000,
    giftAidReclaimablePence: 1250,
    giftAidClaimed: true,
    campaignSlug: "palestine",
    campaignLabel: "Palestine Emergency Relief",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3TV7QA2ERP9URgtR1tMtfdVD",
    stripeCustomerId: "cus_QA2ERP9URgtR1t",
  },
  {
    id: "don_002",
    receiptNumber: "DR-DON-2026-0141",
    chargedAt: "2026-05-09T11:45:00Z",
    donorName: "Yusuf Rahman",
    donorEmail: "yusuf.rahman@example.com",
    amountPence: 30000,
    giftAidReclaimablePence: 7500,
    giftAidClaimed: true,
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    frequency: "monthly",
    status: "paid",
    stripePaymentIntent: "pi_3T8R2X9ERP1AbCdE2gHiJkLm",
    stripeCustomerId: "cus_QA9ERP1AbCdE2g",
    stripeSubscriptionId: "sub_1RP1AbCdE2gHiJkLm",
  },
  {
    id: "don_003",
    receiptNumber: "DR-DON-2026-0140",
    chargedAt: "2026-05-08T22:11:00Z",
    donorName: "Khadija Ali",
    donorEmail: "k.ali@example.co.uk",
    amountPence: 10000,
    giftAidReclaimablePence: 2500,
    giftAidClaimed: true,
    campaignSlug: "zakat",
    campaignLabel: "Zakat",
    pathway: "emergency-relief",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3R8X2A1BCdEfGhIjKlMnOpQr",
    stripeCustomerId: "cus_QB8X2A1BCdEfGh",
  },
  {
    id: "don_004",
    receiptNumber: "DR-DON-2026-0139",
    chargedAt: "2026-05-08T18:32:00Z",
    donorName: "Mehmet Kaya",
    donorEmail: "mkaya@example.com",
    amountPence: 7500,
    giftAidReclaimablePence: 0,
    giftAidClaimed: false,
    campaignSlug: "cancer-care",
    campaignLabel: "Cancer Care for Refugee Children",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3M2P9Q4R7StUvWxYzAbCdEfG",
    stripeCustomerId: "cus_QM2P9Q4R7StUvW",
  },
  {
    id: "don_005",
    receiptNumber: "DR-DON-2026-0138",
    chargedAt: "2026-05-08T14:18:00Z",
    donorName: "Sumaiya Begum",
    donorEmail: "s.begum@example.co.uk",
    amountPence: 2500,
    giftAidReclaimablePence: 625,
    giftAidClaimed: true,
    campaignSlug: "sadaqah",
    campaignLabel: "Sadaqah",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3S2B9G4H7IjKlMnOpQrStUvW",
    stripeCustomerId: "cus_QS2B9G4H7IjKlMn",
  },
  {
    id: "don_006",
    receiptNumber: "DR-DON-2026-0137",
    chargedAt: "2026-05-08T09:42:00Z",
    donorName: "Anonymous",
    donorEmail: "anon-donor-fff812@dr-anon.org",
    amountPence: 50000,
    giftAidReclaimablePence: 0,
    giftAidClaimed: false,
    campaignSlug: "palestine",
    campaignLabel: "Palestine Emergency Relief",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3A1NoN9D8oR1234567890aBcD",
    stripeCustomerId: "cus_QA1NoN9D8oR1234",
  },
  {
    id: "don_007",
    receiptNumber: "DR-DON-2026-0136",
    chargedAt: "2026-05-07T20:15:00Z",
    donorName: "Bilal Khan",
    donorEmail: "bilal.k@example.com",
    amountPence: 15000,
    giftAidReclaimablePence: 3750,
    giftAidClaimed: true,
    campaignSlug: "qurbani",
    campaignLabel: "Qurbani",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3B1L4L7K9HnOpQrStUvWxYzAb",
    stripeCustomerId: "cus_QB1L4L7K9HnOpQr",
  },
  {
    id: "don_008",
    receiptNumber: "DR-DON-2026-0135",
    chargedAt: "2026-05-07T16:08:00Z",
    donorName: "Fatima Siddique",
    donorEmail: "fatima.s@example.co.uk",
    amountPence: 30000,
    giftAidReclaimablePence: 7500,
    giftAidClaimed: true,
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    frequency: "monthly",
    status: "paid",
    stripePaymentIntent: "pi_3F2T1M5S9DqRsTuVwXyZaBcDe",
    stripeCustomerId: "cus_QF2T1M5S9DqRsTu",
    stripeSubscriptionId: "sub_2RM5S9DqRsTuVwXy",
  },
  {
    id: "don_009",
    receiptNumber: "DR-DON-2026-0134",
    chargedAt: "2026-05-07T11:30:00Z",
    donorName: "Ibrahim Choudhury",
    donorEmail: "i.choudhury@example.com",
    amountPence: 5000,
    giftAidReclaimablePence: 1250,
    giftAidClaimed: true,
    campaignSlug: "clean-water",
    campaignLabel: "Bangladesh Clean Water",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3I1B5C7H1OuPqRsTuVwXyZaBc",
    stripeCustomerId: "cus_QI1B5C7H1OuPqRs",
  },
  {
    id: "don_010",
    receiptNumber: "DR-DON-2026-0133",
    chargedAt: "2026-05-07T09:55:00Z",
    donorName: "Mariam Patel",
    donorEmail: "mpatel@example.co.uk",
    amountPence: 20000,
    giftAidReclaimablePence: 5000,
    giftAidClaimed: true,
    campaignSlug: "build-a-school",
    campaignLabel: "Build a School in Bangladesh",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3M1A6P5T1HxIjKlMnOpQrStUv",
    stripeCustomerId: "cus_QM1A6P5T1HxIjKlMn",
  },
  {
    id: "don_011",
    receiptNumber: "DR-DON-2026-0132",
    chargedAt: "2026-05-06T22:45:00Z",
    donorName: "Hassan Mohammed",
    donorEmail: "h.mohammed@example.com",
    amountPence: 10000,
    giftAidReclaimablePence: 0,
    giftAidClaimed: false,
    campaignSlug: "zakat",
    campaignLabel: "Zakat",
    pathway: "medical-support",
    frequency: "one-time",
    status: "refunded",
    stripePaymentIntent: "pi_3H1A5M7M0OpQrStUvWxYzAbCd",
    stripeCustomerId: "cus_QH1A5M7M0OpQrSt",
  },
  {
    id: "don_012",
    receiptNumber: "DR-DON-2026-0131",
    chargedAt: "2026-05-06T19:21:00Z",
    donorName: "Zainab Hussain",
    donorEmail: "zainab.h@example.co.uk",
    amountPence: 5000,
    giftAidReclaimablePence: 1250,
    giftAidClaimed: true,
    campaignSlug: "uk-homeless",
    campaignLabel: "UK Homeless Outreach",
    frequency: "one-time",
    status: "paid",
    stripePaymentIntent: "pi_3Z1A1H7M9CdEfGhIjKlMnOpQr",
    stripeCustomerId: "cus_QZ1A1H7M9CdEfGh",
  },
  {
    id: "don_013",
    receiptNumber: "DR-DON-2026-0130",
    chargedAt: "2026-05-06T15:10:00Z",
    donorName: "Omar Sheikh",
    donorEmail: "omar.s@example.com",
    amountPence: 10000,
    giftAidReclaimablePence: 2500,
    giftAidClaimed: true,
    campaignSlug: "palestine",
    campaignLabel: "Palestine Emergency Relief",
    frequency: "one-time",
    status: "failed",
    stripePaymentIntent: "pi_3O1S6S0F1RsTuVwXyZaBcDeFg",
    stripeCustomerId: "cus_QO1S6S0F1RsTuVw",
  },
  {
    id: "don_014",
    receiptNumber: "DR-DON-2026-0129",
    chargedAt: "2026-05-06T11:32:00Z",
    donorName: "Layla Ahmad",
    donorEmail: "l.ahmad@example.co.uk",
    amountPence: 30000,
    giftAidReclaimablePence: 7500,
    giftAidClaimed: true,
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    frequency: "monthly",
    status: "paid",
    stripePaymentIntent: "pi_3L1A0A6Z6IjKlMnOpQrStUvWx",
    stripeCustomerId: "cus_QL1A0A6Z6IjKlMnOp",
    stripeSubscriptionId: "sub_3RA6Z6IjKlMnOpQrSt",
  },
];

export const PLACEHOLDER_RECURRING: AdminRecurringSubscription[] = [
  {
    id: "rec_001",
    stripeSubscriptionId: "sub_1RP1AbCdE2gHiJkLm",
    donorName: "Yusuf Rahman",
    donorEmail: "yusuf.rahman@example.com",
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    amountPerCyclePence: 30000,
    cycle: "monthly",
    startedAt: "2025-08-09T11:45:00Z",
    cancelledAt: null,
    totalChargesCount: 10,
    totalCollectedPence: 300000,
    nextChargeAt: "2026-06-09T11:45:00Z",
    cardLast4: "4242",
    cardBrand: "visa",
    status: "active",
  },
  {
    id: "rec_002",
    stripeSubscriptionId: "sub_2RM5S9DqRsTuVwXy",
    donorName: "Fatima Siddique",
    donorEmail: "fatima.s@example.co.uk",
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    amountPerCyclePence: 30000,
    cycle: "monthly",
    startedAt: "2024-11-07T16:08:00Z",
    cancelledAt: null,
    totalChargesCount: 19,
    totalCollectedPence: 570000,
    nextChargeAt: "2026-06-07T16:08:00Z",
    cardLast4: "1881",
    cardBrand: "mastercard",
    status: "active",
  },
  {
    id: "rec_003",
    stripeSubscriptionId: "sub_3RA6Z6IjKlMnOpQrSt",
    donorName: "Layla Ahmad",
    donorEmail: "l.ahmad@example.co.uk",
    campaignSlug: "orphan-sponsorship",
    campaignLabel: "Bangladesh Orphan Sponsorship",
    amountPerCyclePence: 30000,
    cycle: "monthly",
    startedAt: "2024-04-06T11:32:00Z",
    cancelledAt: null,
    totalChargesCount: 26,
    totalCollectedPence: 780000,
    nextChargeAt: "2026-06-06T11:32:00Z",
    cardLast4: "5454",
    cardBrand: "mastercard",
    status: "active",
  },
  {
    id: "rec_004",
    stripeSubscriptionId: "sub_4PA9B2CdEfGhIjKlMn",
    donorName: "Hamza Iqbal",
    donorEmail: "h.iqbal@example.com",
    campaignSlug: "zakat",
    campaignLabel: "Zakat",
    amountPerCyclePence: 5000,
    cycle: "monthly",
    startedAt: "2025-12-15T08:30:00Z",
    cancelledAt: "2026-04-22T14:11:00Z",
    totalChargesCount: 5,
    totalCollectedPence: 25000,
    nextChargeAt: null,
    cardLast4: "0006",
    cardBrand: "amex",
    status: "cancelled",
  },
  {
    id: "rec_005",
    stripeSubscriptionId: "sub_5RB3D9EfGhIjKlMnOpQr",
    donorName: "Maryam Hashmi",
    donorEmail: "m.hashmi@example.co.uk",
    campaignSlug: "sadaqah",
    campaignLabel: "Sadaqah",
    amountPerCyclePence: 10000,
    cycle: "monthly",
    startedAt: "2025-02-20T19:42:00Z",
    cancelledAt: null,
    totalChargesCount: 16,
    totalCollectedPence: 160000,
    nextChargeAt: "2026-06-20T19:42:00Z",
    cardLast4: "0341",
    cardBrand: "visa",
    status: "active",
  },
];

export function findDonationById(id: string): AdminDonation | undefined {
  return PLACEHOLDER_DONATIONS.find((d) => d.id === id);
}

export function findRecurringById(
  id: string
): AdminRecurringSubscription | undefined {
  return PLACEHOLDER_RECURRING.find((r) => r.id === id);
}

/** Aggregate stats used on the admin dashboard home + donations list. */
export function donationStats() {
  const last30dCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = PLACEHOLDER_DONATIONS.filter(
    (d) => new Date(d.chargedAt).getTime() >= last30dCutoff && d.status === "paid"
  );
  const totalPence = recent.reduce((s, d) => s + d.amountPence, 0);
  const giftAidEligiblePence = recent
    .filter((d) => d.giftAidClaimed)
    .reduce((s, d) => s + d.amountPence, 0);
  const giftAidReclaimablePence = recent.reduce(
    (s, d) => s + d.giftAidReclaimablePence,
    0
  );
  return {
    last30dCount: recent.length,
    last30dTotalPence: totalPence,
    last30dGiftAidEligiblePence: giftAidEligiblePence,
    last30dGiftAidReclaimablePence: giftAidReclaimablePence,
    activeRecurringCount: PLACEHOLDER_RECURRING.filter(
      (r) => r.status === "active"
    ).length,
    activeRecurringMonthlyPence: PLACEHOLDER_RECURRING.filter(
      (r) => r.status === "active"
    ).reduce((s, r) => s + r.amountPerCyclePence, 0),
  };
}

/** UK-format the date for display (DD/MM/YYYY HH:MM). */
export function formatAdminDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function formatAdminDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
