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

/** Raw aggregated profile (stored). Roles + template ids are plain strings. */
type Profile = {
  /** role → templateId → how many times she kept it. */
  templatesByRole?: Record<string, Record<string, number>>;
  /** Running total + count of headline lengths she settles on. */
  titleLenSum?: number;
  titleLenCount?: number;
};

/** One slide's signal, captured when a deck is finished. */
export type DeckSignal = { role: string; templateId: string; titleLen: number };

/** The compact, derived preferences the deck builder applies. */
export type LearnedPrefs = {
  /** role → the template she picks most often (only once it's a clear habit). */
  favTemplateByRole: Record<string, string>;
  /** Her typical headline length in chars (once we have enough samples). */
  avgTitleLen: number | null;
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
  const favTemplateByRole: Record<string, string> = {};
  for (const [role, counts] of Object.entries(profile.templatesByRole ?? {})) {
    let best: string | null = null;
    let bestN = 0;
    for (const [tid, n] of Object.entries(counts)) {
      if (n > bestN) {
        bestN = n;
        best = tid;
      }
    }
    if (best && bestN >= 2) favTemplateByRole[role] = best; // a habit, not a one-off
  }
  const avgTitleLen =
    (profile.titleLenCount ?? 0) >= 5
      ? Math.round((profile.titleLenSum ?? 0) / (profile.titleLenCount ?? 1))
      : null;
  return { favTemplateByRole, avgTitleLen, samples };
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
  const tpl = { ...(profile.templatesByRole ?? {}) };
  let lenSum = profile.titleLenSum ?? 0;
  let lenCount = profile.titleLenCount ?? 0;
  for (const s of signals) {
    if (s.templateId && s.role) {
      const byRole = { ...(tpl[s.role] ?? {}) };
      byRole[s.templateId] = (byRole[s.templateId] ?? 0) + 1;
      tpl[s.role] = byRole;
    }
    if (s.titleLen > 0) {
      lenSum += s.titleLen;
      lenCount += 1;
    }
  }
  const next: Profile = { templatesByRole: tpl, titleLenSum: lenSum, titleLenCount: lenCount };
  const { error } = await supabase
    .from("smm_preferences")
    .update({ profile: next, samples: samples + 1, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (error) throw error;
}
