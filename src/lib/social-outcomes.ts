/**
 * Outcome learning — the compounding flywheel.
 *
 * The taste profile (smm-preferences.ts) learns from the SMM's EDITS. This
 * learns from REAL OUTCOMES: actual link clicks + donations attributed to a
 * published post via the short-link spine. It reads two deterministic SQL
 * views from migration 037 — `template_performance` (per design) and
 * `topic_performance` (per news topic / campaign) — and derives a small,
 * confidence-gated `OutcomePrefs` the deck builder uses to bias its
 * DETERMINISTIC choices toward designs + topics that have actually raised
 * money. £0 / 0 tokens — no AI call anywhere in this module.
 *
 * Cold-start safety: every threshold is conservative, so a single lucky post
 * can't crown a template. Below the gates the loop stays silent and the taste
 * profile / base defaults take over. Reads degrade to empty prefs before the
 * migration is applied, so nothing breaks.
 *
 * Service-role only (called from the admin API after requireAdminSession).
 */
import { getSupabaseAdmin } from "@/lib/supabase";

// ── Confidence gates (tuned conservative; donations are sparse early) ──────
/** A template must have been TRIED on at least this many posts before any
 *  verdict — "tried enough", not "got lucky once". */
const MIN_POSTS = 3;
/** Tier 1: a donation-proven winner needs this many real donations behind it. */
const MIN_DONATIONS = 3;
/** Tier 1: the winner must beat the role's runner-up on £/post by this margin
 *  (1.2 = 20%), so near-ties don't flip-flop the default. */
const WIN_MARGIN = 1.2;
/** Tier 2 (click proxy, used only when no donation winner exists): clicks are
 *  the denser early signal but weaker, so they're gated higher on volume. */
const MIN_CLICKS = 50;
/** How many topic signals to surface to the SMM. */
const TOP_TOPICS = 5;
/** A topic needs at least this many posts before it's worth surfacing. */
const MIN_TOPIC_POSTS = 2;

export type TemplateOutcome = {
  role: string;
  templateId: string;
  posts: number;
  clicks: number;
  donations: number;
  donationTotalPence: number;
  donationRate: number;
  pencePerPost: number;
};

export type TopicSignal = {
  key: string;
  label: string;
  posts: number;
  clicks: number;
  donations: number;
  donationTotalPence: number;
  donationRate: number;
};

export type OutcomePrefs = {
  /** role → templateId proven to win (only when the gates pass). */
  winningTemplateByRole: Record<string, string>;
  /** What evidence backs each role's winner: real donations, a click proxy,
   *  or nothing yet. Surfaced so the dashboard can label confidence honestly. */
  basisByRole: Record<string, "donations" | "clicks" | null>;
  /** Ranked topic signals — which news topics/campaigns convert. */
  campaignSignal: TopicSignal[];
};

type TemplateRow = {
  role: string | null;
  template_id: string | null;
  posts_count: number | null;
  clicks: number | null;
  donations: number | null;
  donation_total_pence: number | null;
  donation_rate: number | null;
  pence_per_post: number | null;
};

type TopicRow = {
  event_type: string | null;
  country_iso: string | null;
  region: string | null;
  campaign_slug: string | null;
  posts_count: number | null;
  clicks: number | null;
  donations: number | null;
  donation_total_pence: number | null;
  donation_rate: number | null;
};

const EMPTY_PREFS: OutcomePrefs = {
  winningTemplateByRole: {},
  basisByRole: {},
  campaignSignal: [],
};

/** All per-template outcomes (used by both the derivation + the dashboard). */
export async function getTemplateOutcomes(): Promise<TemplateOutcome[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("template_performance")
    .select(
      "role, template_id, posts_count, clicks, donations, donation_total_pence, donation_rate, pence_per_post"
    )
    .returns<TemplateRow[]>();
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.role && r.template_id)
    .map((r) => ({
      role: r.role as string,
      templateId: r.template_id as string,
      posts: Number(r.posts_count ?? 0),
      clicks: Number(r.clicks ?? 0),
      donations: Number(r.donations ?? 0),
      donationTotalPence: Number(r.donation_total_pence ?? 0),
      donationRate: Number(r.donation_rate ?? 0),
      pencePerPost: Number(r.pence_per_post ?? 0),
    }));
}

/** All topic outcomes, ranked by £ raised (used by the derivation + dashboard). */
export async function getTopicOutcomes(): Promise<TopicSignal[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("topic_performance")
    .select(
      "event_type, country_iso, region, campaign_slug, posts_count, clicks, donations, donation_total_pence, donation_rate"
    )
    .returns<TopicRow[]>();
  if (error) throw error;
  return (data ?? [])
    .map((r) => {
      const parts = [r.event_type, r.region, r.campaign_slug].filter(
        (p): p is string => !!p
      );
      const label = parts.length
        ? parts.join(" · ")
        : r.country_iso || "Unattributed";
      const key =
        [r.event_type, r.country_iso, r.campaign_slug]
          .map((p) => p ?? "")
          .join("|") || "unattributed";
      return {
        key,
        label,
        posts: Number(r.posts_count ?? 0),
        clicks: Number(r.clicks ?? 0),
        donations: Number(r.donations ?? 0),
        donationTotalPence: Number(r.donation_total_pence ?? 0),
        donationRate: Number(r.donation_rate ?? 0),
      };
    })
    .sort((a, b) => b.donationTotalPence - a.donationTotalPence || b.donations - a.donations);
}

/** Derive the gated prefs the deck builder + scorer apply. Pure function so
 *  it's trivially testable and reused by the scoring nudge (Phase E). */
export function deriveOutcomePrefs(
  templates: TemplateOutcome[],
  topics: TopicSignal[]
): OutcomePrefs {
  const winningTemplateByRole: Record<string, string> = {};
  const basisByRole: Record<string, "donations" | "clicks" | null> = {};

  // Group templates by role.
  const byRole = new Map<string, TemplateOutcome[]>();
  for (const t of templates) {
    const list = byRole.get(t.role);
    if (list) list.push(t);
    else byRole.set(t.role, [t]);
  }

  for (const [role, list] of byRole) {
    const tried = list.filter((t) => t.posts >= MIN_POSTS);
    if (tried.length === 0) {
      basisByRole[role] = null;
      continue;
    }

    // Tier 1 — donation-proven. Rank by £/post; winner must clear the donation
    // floor AND beat the runner-up by the margin.
    const donationRanked = [...tried]
      .filter((t) => t.donations >= MIN_DONATIONS)
      .sort((a, b) => b.pencePerPost - a.pencePerPost);
    if (donationRanked.length) {
      const top = donationRanked[0]!;
      const second = donationRanked[1];
      const clears =
        !second ||
        second.pencePerPost <= 0 ||
        top.pencePerPost >= second.pencePerPost * WIN_MARGIN;
      if (clears && top.pencePerPost > 0) {
        winningTemplateByRole[role] = top.templateId;
        basisByRole[role] = "donations";
        continue;
      }
    }

    // Tier 2 — click proxy. Only when no donation winner; gated higher on
    // volume. Rank by conversion rate then raw clicks.
    const clickRanked = [...tried]
      .filter((t) => t.clicks >= MIN_CLICKS)
      .sort((a, b) => b.donationRate - a.donationRate || b.clicks - a.clicks);
    if (clickRanked.length && clickRanked[0]!.clicks > 0) {
      winningTemplateByRole[role] = clickRanked[0]!.templateId;
      basisByRole[role] = "clicks";
      continue;
    }

    basisByRole[role] = null;
  }

  const campaignSignal = topics
    .filter((t) => t.posts >= MIN_TOPIC_POSTS)
    .slice(0, TOP_TOPICS);

  return { winningTemplateByRole, basisByRole, campaignSignal };
}

/** The derived outcome prefs for the deck builder (GET endpoint). Degrades to
 *  empty prefs before migration 037 / on any read error. */
export async function getOutcomePrefs(): Promise<OutcomePrefs> {
  try {
    const [templates, topics] = await Promise.all([
      getTemplateOutcomes(),
      getTopicOutcomes(),
    ]);
    return deriveOutcomePrefs(templates, topics);
  } catch (err) {
    console.error("[social-outcomes] prefs read failed:", err);
    return EMPTY_PREFS;
  }
}

// ── Historical-conversion nudge for First Response scoring (Phase 3f) ──────
// A gated, capped multiplier that gently boosts events whose topic (event
// type / country / matched campaign) has historically converted ABOVE the
// baseline donation rate — and gently fades ones that converted below it.
// Ethics: this only AUGMENTS revenue-likelihood (already an explicit factor of
// dr_priority_score via the diaspora/Muslim multipliers); it never overrides
// humanitarian severity, and the clamp keeps it a nudge.
const CONV_MIN_POSTS = 3; // topic must have been posted about enough
const CONV_MIN_DONATIONS = 3; // …and actually converted
const CONV_MIN_CLICKS = 20; // …with enough clicks for a stable rate
const CONV_MAX = 1.4;
const CONV_MIN = 0.85;
const CONV_DAMP = 0.5; // half-weight the deviation from baseline

export type ConversionLookup = {
  byEventType: Record<string, number>;
  byCountry: Record<string, number>;
  byCampaign: Record<string, number>;
  baselineRate: number;
};

const IDENTITY_LOOKUP: ConversionLookup = {
  byEventType: {},
  byCountry: {},
  byCampaign: {},
  baselineRate: 0,
};

function normCountry(iso: string | null | undefined): string {
  return (iso ?? "").split("-")[0]!.toUpperCase();
}

/**
 * Build the conversion lookup from topic_performance. Fetched ONCE per ingest
 * batch (cron run) and passed to scoring — never per event. Degrades to the
 * identity lookup (all multipliers = 1.0) before migration 037 / on error.
 */
export async function getConversionLookup(): Promise<ConversionLookup> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("topic_performance")
      .select(
        "event_type, country_iso, campaign_slug, posts_count, clicks, donations"
      )
      .returns<
        Pick<
          TopicRow,
          "event_type" | "country_iso" | "campaign_slug" | "posts_count" | "clicks" | "donations"
        >[]
      >();
    if (error) throw error;

    type Acc = { clicks: number; donations: number; posts: number };
    const et = new Map<string, Acc>();
    const co = new Map<string, Acc>();
    const ca = new Map<string, Acc>();
    let totClicks = 0;
    let totDonations = 0;

    const bump = (m: Map<string, Acc>, key: string, row: { clicks: number; donations: number; posts: number }) => {
      if (!key) return;
      const a = m.get(key) ?? { clicks: 0, donations: 0, posts: 0 };
      a.clicks += row.clicks;
      a.donations += row.donations;
      a.posts += row.posts;
      m.set(key, a);
    };

    for (const r of data ?? []) {
      const row = {
        clicks: Number(r.clicks ?? 0),
        donations: Number(r.donations ?? 0),
        posts: Number(r.posts_count ?? 0),
      };
      bump(et, (r.event_type ?? "").toLowerCase(), row);
      bump(co, normCountry(r.country_iso), row);
      bump(ca, (r.campaign_slug ?? "").toLowerCase(), row);
      totClicks += row.clicks;
      totDonations += row.donations;
    }

    const gatedRates = (m: Map<string, Acc>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const [k, a] of m) {
        if (
          a.posts >= CONV_MIN_POSTS &&
          a.donations >= CONV_MIN_DONATIONS &&
          a.clicks >= CONV_MIN_CLICKS
        ) {
          out[k] = a.donations / a.clicks;
        }
      }
      return out;
    };

    return {
      byEventType: gatedRates(et),
      byCountry: gatedRates(co),
      byCampaign: gatedRates(ca),
      baselineRate: totClicks > 0 ? totDonations / totClicks : 0,
    };
  } catch (err) {
    console.error("[social-outcomes] conversion lookup failed:", err);
    return IDENTITY_LOOKUP;
  }
}

/**
 * The capped, gated conversion multiplier for an event. Takes the most
 * optimistic gated signal across its event type / country / matched campaigns,
 * compares it to the baseline donation rate, half-weights the deviation, and
 * clamps to [0.85, 1.4]. Returns 1.0 when there's no qualifying history — so
 * scores are identical to today until a topic has earned a verdict.
 */
export function conversionMultiplierFor(
  lookup: ConversionLookup,
  event: {
    eventType: string | null;
    countryIso: string | null;
    matchedCampaigns: string[];
  }
): number {
  if (lookup.baselineRate <= 0) return 1.0;
  const rates: number[] = [];
  const et = (event.eventType ?? "").toLowerCase();
  if (et && lookup.byEventType[et] != null) rates.push(lookup.byEventType[et]!);
  const co = normCountry(event.countryIso);
  if (co && lookup.byCountry[co] != null) rates.push(lookup.byCountry[co]!);
  for (const c of event.matchedCampaigns) {
    const key = c.toLowerCase();
    if (lookup.byCampaign[key] != null) rates.push(lookup.byCampaign[key]!);
  }
  if (rates.length === 0) return 1.0;
  const ratio = Math.max(...rates) / lookup.baselineRate;
  const m = 1 + (ratio - 1) * CONV_DAMP;
  return Math.min(CONV_MAX, Math.max(CONV_MIN, m));
}
