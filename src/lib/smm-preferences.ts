/**
 * SMM taste profile — a zero-cost, self-learning loop.
 *
 * On a finished deck we merge plain-code signals (no AI call) into one
 * aggregated JSONB profile, then derive a small `LearnedPrefs` the deck
 * builder uses to bias its DETERMINISTIC choices (default template per role,
 * copy ranking). It drifts toward the SMM's taste with every post, for £0.
 *
 * Service-role only (called from the admin API after requireAdminSession).
 */
import { getSupabaseAdmin } from "@/lib/supabase";

/** The bucket key — one bucket per platform per slide type, so X / Facebook /
 *  Instagram each learn their own taste (their template pools + ideal headline
 *  lengths differ). Matches prefKey() in social-outcomes. */
function keyOf(platform: string, role: string): string {
  return `${platform}:${role}`;
}

/** Raw aggregated profile (stored). Keys are "platform:role"; template ids are
 *  plain strings. */
type Profile = {
  /** "platform:role" → templateId → how many times she kept it. */
  templatesByKey?: Record<string, Record<string, number>>;
  /** platform → running total + count of the headline lengths she settles on. */
  titleLenByPlatform?: Record<string, { sum: number; count: number }>;
};

/** One slide's signal, captured when a deck is finished. */
export type DeckSignal = { platform: string; role: string; templateId: string; titleLen: number };

/** The compact, derived preferences the deck builder applies. */
export type LearnedPrefs = {
  /** "platform:role" → the template she picks most often on that platform (only
   *  once it's a clear habit). */
  favTemplateByKey: Record<string, string>;
  /** platform → her typical headline length on that platform (once enough
   *  samples). X headlines run shorter than Instagram's, so this is per-platform. */
  avgTitleLenByPlatform: Record<string, number | null>;
  /** How many finished decks have fed the profile. */
  samples: number;
};

async function loadProfile(): Promise<{ profile: Profile; samples: number }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("smm_preferences")
    .select("profile, samples")
    .eq("id", "global")
    .maybeSingle();
  if (error) throw error;
  return { profile: (data?.profile as Profile) ?? {}, samples: (data?.samples as number) ?? 0 };
}

/** Derive the compact prefs the deck builder reads. Thresholds keep early,
 *  noisy data from yanking the defaults around before there's a real habit. */
function derive(profile: Profile, samples: number): LearnedPrefs {
  const favTemplateByKey: Record<string, string> = {};
  for (const [key, counts] of Object.entries(profile.templatesByKey ?? {})) {
    let best: string | null = null;
    let bestN = 0;
    for (const [tid, n] of Object.entries(counts)) {
      if (n > bestN) {
        bestN = n;
        best = tid;
      }
    }
    if (best && bestN >= 2) favTemplateByKey[key] = best; // a habit, not a one-off
  }
  const avgTitleLenByPlatform: Record<string, number | null> = {};
  for (const [plat, agg] of Object.entries(profile.titleLenByPlatform ?? {})) {
    avgTitleLenByPlatform[plat] =
      (agg.count ?? 0) >= 5 ? Math.round((agg.sum ?? 0) / (agg.count ?? 1)) : null;
  }
  return { favTemplateByKey, avgTitleLenByPlatform, samples };
}

/** The derived prefs for the deck builder (GET endpoint). */
export async function getLearnedPrefs(): Promise<LearnedPrefs> {
  const { profile, samples } = await loadProfile();
  return derive(profile, samples);
}

/** Merge a finished deck's signals into the profile (POST endpoint). */
export async function recordDeckSignals(signals: DeckSignal[]): Promise<void> {
  if (!signals.length) return;
  const supabase = getSupabaseAdmin();
  const { profile, samples } = await loadProfile();
  const tpl = { ...(profile.templatesByKey ?? {}) };
  const lens = { ...(profile.titleLenByPlatform ?? {}) };
  for (const s of signals) {
    const platform = s.platform || "instagram";
    if (s.templateId && s.role) {
      const k = keyOf(platform, s.role);
      const byKey = { ...(tpl[k] ?? {}) };
      byKey[s.templateId] = (byKey[s.templateId] ?? 0) + 1;
      tpl[k] = byKey;
    }
    if (s.titleLen > 0) {
      const cur = lens[platform] ?? { sum: 0, count: 0 };
      lens[platform] = { sum: cur.sum + s.titleLen, count: cur.count + 1 };
    }
  }
  const next: Profile = { templatesByKey: tpl, titleLenByPlatform: lens };
  const { error } = await supabase
    .from("smm_preferences")
    .update({ profile: next, samples: samples + 1, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (error) throw error;
}
