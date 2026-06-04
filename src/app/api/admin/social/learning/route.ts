import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getLearnedPrefs, recordDeckSignals, type DeckSignal } from "@/lib/smm-preferences";
import { getOutcomePrefs } from "@/lib/social-outcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/learning — the deck builder's two learned signals:
 *   - `prefs`   — the SMM's taste profile (templates she keeps, copy length)
 *   - `outcome` — what real clicks + donations prove converts (templates +
 *                 topics), gated by confidence
 * Both bias the auto-draft's DETERMINISTIC choices. Each degrades independently
 * to empty (e.g. before migration 035 / 037) so one missing piece never breaks
 * the other or the builder.
 *
 * POST — merge a finished deck's taste signals (plain code, no AI call) into
 * the profile so future drafts drift toward her taste. £0 / 0 tokens. (Outcome
 * signals need no POST — they derive from donations/clicks already in the DB.)
 */
export async function GET() {
  await requireAdminSession();

  let prefs: Awaited<ReturnType<typeof getLearnedPrefs>> = {
    favTemplateByKey: {},
    avgTitleLenByPlatform: {},
    samples: 0,
  };
  try {
    prefs = await getLearnedPrefs();
  } catch (err) {
    console.error("[learning] taste prefs load failed:", err);
  }

  let outcome: Awaited<ReturnType<typeof getOutcomePrefs>> = {
    winningTemplateByKey: {},
    basisByKey: {},
    campaignSignal: [],
  };
  try {
    outcome = await getOutcomePrefs();
  } catch (err) {
    console.error("[learning] outcome prefs load failed:", err);
  }

  return NextResponse.json({ prefs, outcome });
}

export async function POST(request: Request) {
  await requireAdminSession();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const signals = (body as { signals?: DeckSignal[] })?.signals;
  if (!Array.isArray(signals)) {
    return NextResponse.json({ error: "no_signals" }, { status: 400 });
  }
  // Sanitise — only the known fields, bounded.
  const clean: DeckSignal[] = signals
    .filter((s) => s && typeof s.role === "string" && typeof s.templateId === "string")
    .slice(0, 30)
    .map((s) => ({
      platform: String(s.platform || "instagram").slice(0, 20),
      role: String(s.role).slice(0, 40),
      templateId: String(s.templateId).slice(0, 60),
      titleLen: Math.max(0, Math.min(400, Number(s.titleLen) || 0)),
    }));
  try {
    await recordDeckSignals(clean);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[learning] record failed:", err);
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }
}
