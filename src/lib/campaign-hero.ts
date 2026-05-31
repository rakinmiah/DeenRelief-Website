import type { CampaignSlug } from "./campaigns";

/**
 * Per-campaign content for the homepage donation hero
 * (src/components/FeaturedCampaign.tsx).
 *
 * The SMM picks the "featured campaign" in /admin/social/featured; the
 * homepage hero then renders that campaign's content from this registry.
 * Campaigns NOT present here have no full hero yet — featuring one of
 * them falls back to the Palestine hero, and the FeaturedCampaignCallout
 * strip surfaces the choice instead (graceful degradation), so every
 * campaign stays featurable while only campaigns with real, approved
 * assets get the full hero treatment.
 *
 * Source of the copy: each campaign's landing page + its DonationForm
 * (src/app/<slug>/DonationForm.tsx) — all lifted verbatim, nothing
 * invented. Palestine is seeded from the previous hardcoded homepage
 * hero so today's homepage is byte-for-byte unchanged.
 *
 * NOTE: the per-campaign landing DonationForms still hold their own copy
 * of these donation tiers. Consolidating them to import from this
 * registry (single source of truth) is a clean follow-up — out of scope
 * here to avoid touching nine public landing pages.
 */

export type HeroFrequency = "one-time" | "monthly";

export interface CampaignHeroTier {
  value: number;
  label: string;
  outcome: string;
  /** Marks the "Popular" pre-selected tier within its frequency. */
  default?: boolean;
}

export interface CampaignHeroAmounts {
  "one-time": CampaignHeroTier[];
  monthly: CampaignHeroTier[];
}

export interface CampaignHero {
  slug: CampaignSlug;
  /** Hero headline (H2). */
  title: string;
  /** One–two sentence supporting paragraph. */
  blurb: string;
  /** Optional small badge over the image, e.g. "Urgent Appeal". */
  eyebrow?: string;
  image: { src: string; alt: string };
  /** Location (+ optional date) evidence tag on the image. */
  proofTag?: { location: string; date?: string };
  /** Frequency the panel opens on. */
  defaultFrequency: HeroFrequency;
  amounts: CampaignHeroAmounts;
}

/**
 * Only campaigns with real, approved assets appear here. Qurbani is
 * intentionally absent (the campaign is retired post-Eid and its page
 * redirects); featuring it falls back to Palestine + the callout strip.
 */
export const CAMPAIGN_HEROES: Partial<Record<CampaignSlug, CampaignHero>> = {
  // Seeded verbatim from the previous hardcoded homepage hero so the
  // default homepage is unchanged.
  palestine: {
    slug: "palestine",
    title: "Palestine Emergency Relief",
    blurb:
      "Donate to Palestine and help displaced families in Gaza who urgently need food, clean water, shelter, and medical supplies. Every donation is delivered directly through our on-the-ground teams.",
    eyebrow: "Urgent Appeal",
    image: {
      src: "/images/palestine-relief.webp",
      alt: "Deen Relief worker distributing aid to a woman in a Palestine displacement camp",
    },
    proofTag: { location: "Gaza", date: "2026" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 25, label: "£25", outcome: "Provides emergency food for a family in Gaza" },
        { value: 50, label: "£50", outcome: "Feeds a displaced family in Gaza for one week", default: true },
        { value: 100, label: "£100", outcome: "Supplies clean water for a community in Gaza" },
        { value: 250, label: "£250", outcome: "Provides shelter materials for a displaced family in Gaza" },
      ],
      monthly: [
        { value: 10, label: "£10", outcome: "Provides ongoing food support for a child in Gaza" },
        { value: 25, label: "£25", outcome: "Feeds a displaced family in Gaza every month" },
        { value: 50, label: "£50", outcome: "Sustains clean water access for a community in Gaza", default: true },
        { value: 100, label: "£100", outcome: "Covers monthly medical supplies for a family in Gaza" },
      ],
    },
  },

  "cancer-care": {
    slug: "cancer-care",
    title: "Support Cancer Care for Refugee Children",
    blurb:
      "In Adana, Turkey, we operate Gulucuk Evi — a dedicated care centre providing housing, medical support, and rehabilitation for Syrian and Gazan refugee children undergoing cancer treatment.",
    image: {
      src: "/images/gulucuk-team.webp",
      alt: "Deen Relief team with refugee children at the Gulucuk Evi cancer care centre in Adana, Turkey",
    },
    proofTag: { location: "Adana, Turkey" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 50, label: "£50", outcome: "Covers a week of nutritious meals for a child in treatment" },
        { value: 100, label: "£100", outcome: "Funds medical supplies for a child's ongoing care", default: true },
        { value: 250, label: "£250", outcome: "Provides a month of family housing near the hospital" },
        { value: 500, label: "£500", outcome: "Covers comprehensive monthly support for a child and their family" },
      ],
      monthly: [
        { value: 25, label: "£25", outcome: "Provides ongoing nutritious meals for a child in treatment" },
        { value: 50, label: "£50", outcome: "Covers monthly medical supplies and nutrition", default: true },
        { value: 100, label: "£100", outcome: "Funds ongoing family housing and medical support" },
        { value: 250, label: "£250", outcome: "Sustains comprehensive care for a child through treatment" },
      ],
    },
  },

  "orphan-sponsorship": {
    slug: "orphan-sponsorship",
    title: "Sponsor an Orphan in Bangladesh",
    blurb:
      "Your monthly sponsorship provides education, nutrition, safe shelter, and healthcare for an orphaned child in Bangladesh.",
    image: {
      src: "/images/orphan-sponsorship.webp",
      alt: "A sponsored orphaned child supported by Deen Relief in Bangladesh",
    },
    proofTag: { location: "Bangladesh" },
    defaultFrequency: "monthly",
    amounts: {
      "one-time": [
        { value: 50, label: "£50", outcome: "Provides a month of education and meals for a child" },
        { value: 100, label: "£100", outcome: "Covers three months of school fees and learning materials", default: true },
        { value: 250, label: "£250", outcome: "Provides six months of comprehensive support for a child" },
        { value: 500, label: "£500", outcome: "Funds a full year of education and nutrition for a child" },
      ],
      monthly: [
        { value: 30, label: "£30", outcome: "Sponsors one child — education, nutrition, shelter, and healthcare", default: true },
        { value: 50, label: "£50", outcome: "Sponsors one child with enhanced support and learning materials" },
        { value: 75, label: "£75", outcome: "Sponsors one child with comprehensive family support" },
        { value: 100, label: "£100", outcome: "Sponsors one child and contributes to community development" },
      ],
    },
  },

  "build-a-school": {
    slug: "build-a-school",
    title: "Build a School in Rural Bangladesh",
    blurb:
      "Fund classroom construction and teacher salaries in rural Bangladesh — a lasting Sadaqah Jariyah that gives children access to education.",
    image: {
      src: "/images/bangladesh-school-v2.webp",
      alt: "Children outside a Deen Relief-funded school in rural Bangladesh",
    },
    proofTag: { location: "Bangladesh" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 100, label: "£100", outcome: "Funds a month of teacher salary in a rural school" },
        { value: 250, label: "£250", outcome: "Provides learning materials for an entire classroom", default: true },
        { value: 500, label: "£500", outcome: "Funds construction materials for a classroom" },
        { value: 1000, label: "£1,000", outcome: "Builds a complete classroom for a rural school" },
      ],
      monthly: [
        { value: 25, label: "£25", outcome: "Contributes monthly to classroom construction" },
        { value: 50, label: "£50", outcome: "Covers ongoing teacher salary support", default: true },
        { value: 100, label: "£100", outcome: "Funds monthly learning materials and school maintenance" },
        { value: 250, label: "£250", outcome: "Sustains comprehensive school development each month" },
      ],
    },
  },

  "clean-water": {
    slug: "clean-water",
    title: "Fund Clean Water in Bangladesh",
    blurb:
      "Fund a tube well in rural Bangladesh. Provide clean drinking water for an entire community — a lasting Sadaqah Jariyah.",
    image: {
      src: "/images/bangladesh-classroom-children.webp",
      alt: "Children in rural Bangladesh near a Deen Relief clean-water project",
    },
    proofTag: { location: "Bangladesh" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 50, label: "£50", outcome: "Contributes to a community tube well in rural Bangladesh" },
        { value: 150, label: "£150", outcome: "Funds a tube well providing safe water for a rural village", default: true },
        { value: 300, label: "£300", outcome: "Funds a deep tube well with filtration system" },
        { value: 500, label: "£500", outcome: "Funds a comprehensive water point serving multiple families" },
      ],
      monthly: [
        { value: 10, label: "£10", outcome: "Supports ongoing water programme maintenance" },
        { value: 25, label: "£25", outcome: "Contributes monthly to new well construction", default: true },
        { value: 50, label: "£50", outcome: "Funds ongoing clean water access for a community each month" },
        { value: 100, label: "£100", outcome: "Sustains comprehensive water infrastructure development" },
      ],
    },
  },

  "uk-homeless": {
    slug: "uk-homeless",
    title: "Support Brighton's Homeless Community",
    blurb:
      "Hot meals, clothing, and essentials distributed on Brighton's streets every week by our volunteer teams.",
    image: {
      src: "/images/brighton-team.webp",
      alt: "Deen Relief volunteer team on a homeless outreach evening in Brighton",
    },
    proofTag: { location: "Brighton, UK" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 10, label: "£10", outcome: "Provides a hot meal and essentials pack for one person" },
        { value: 25, label: "£25", outcome: "Feeds five people on our weekly outreach", default: true },
        { value: 50, label: "£50", outcome: "Covers a full evening of hot meals and supplies" },
        { value: 100, label: "£100", outcome: "Funds a week of outreach including meals, clothing, and support packs" },
      ],
      monthly: [
        { value: 10, label: "£10", outcome: "Provides ongoing weekly meals for one person", default: true },
        { value: 25, label: "£25", outcome: "Feeds five people every week on our outreach" },
        { value: 50, label: "£50", outcome: "Covers a full weekly outreach evening each month" },
        { value: 100, label: "£100", outcome: "Sustains our entire weekly outreach programme" },
      ],
    },
  },

  zakat: {
    slug: "zakat",
    title: "Pay Your Zakat With Confidence",
    blurb:
      "100% Zakat policy. Every penny reaches eligible recipients. Trustee-verified before funds are released.",
    image: {
      src: "/images/zakat-hero.webp",
      alt: "Deen Relief field distribution funded by Zakat",
    },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 50, label: "£50", outcome: "Provides emergency food for a family for one month" },
        { value: 100, label: "£100", outcome: "Covers medical supplies for a child's treatment", default: true },
        { value: 250, label: "£250", outcome: "Funds shelter materials for a displaced family" },
        { value: 500, label: "£500", outcome: "Supports a family through three months of cancer care" },
      ],
      monthly: [
        { value: 25, label: "£25", outcome: "Provides ongoing food support for a family each month" },
        { value: 50, label: "£50", outcome: "Covers monthly medical supplies for a child in care", default: true },
        { value: 100, label: "£100", outcome: "Sustains a family through ongoing cancer treatment" },
        { value: 250, label: "£250", outcome: "Funds comprehensive monthly support for a displaced family" },
      ],
    },
  },

  sadaqah: {
    slug: "sadaqah",
    title: "Give Sadaqah and Sadaqah Jariyah",
    blurb:
      "Give Sadaqah freely, at any time, in any amount. Your voluntary charity through a trusted UK Islamic charity reaches those who need it most.",
    image: {
      src: "/images/orphan-sponsorship.webp",
      alt: "A child in Bangladesh supported by Deen Relief Sadaqah",
    },
    proofTag: { location: "Bangladesh" },
    defaultFrequency: "one-time",
    amounts: {
      "one-time": [
        { value: 10, label: "£10", outcome: "Provides a meal for a family in need" },
        { value: 25, label: "£25", outcome: "Supplies essential items for a vulnerable child", default: true },
        { value: 50, label: "£50", outcome: "Funds emergency support for a family" },
        { value: 100, label: "£100", outcome: "Provides comprehensive support where it's needed most" },
      ],
      monthly: [
        { value: 5, label: "£5", outcome: "Provides ongoing meals for someone in need each month" },
        { value: 10, label: "£10", outcome: "Supplies monthly essentials for a vulnerable child", default: true },
        { value: 25, label: "£25", outcome: "Funds ongoing family support every month" },
        { value: 50, label: "£50", outcome: "Sustains comprehensive monthly aid — a lasting Sadaqah Jariyah" },
      ],
    },
  },
};

/** The hero shown when nothing is featured, or the featured campaign has no hero. */
export const DEFAULT_HERO: CampaignHero = CAMPAIGN_HEROES.palestine!;

/** Returns the campaign's hero content, or null if it has none. */
export function getCampaignHero(slug: CampaignSlug | string | null): CampaignHero | null {
  if (!slug) return null;
  return CAMPAIGN_HEROES[slug as CampaignSlug] ?? null;
}

/** The pre-selected tier value for a hero's default frequency. */
export function defaultTierValue(hero: CampaignHero): number {
  const tiers = hero.amounts[hero.defaultFrequency];
  return (tiers.find((t) => t.default) ?? tiers[0]).value;
}
