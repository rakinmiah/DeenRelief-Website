import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getLearnedPrefs, recordDeckSignals, type DeckSignal } from "@/lib/smm-preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/learning — the SMM's derived taste profile, applied by
 * the deck builder to bias its default template + copy ranking.
 *
 * POST — merge a finished deck's signals (plain code, no AI call) into the
 * profile so future drafts drift toward her taste. £0 / 0 tokens.
 */
export async function GET() {
  await requireAdminSession();
  try {
    const prefs = await getLearnedPrefs();
    return NextResponse.json({ prefs });
  } catch (err) {
    // Degrade to "no learned prefs" (e.g. before migration 035) — the deck
    // builder just uses its base defaults.
    console.error("[learning] load failed:", err);
    return NextResponse.json({ prefs: { favTemplateByRole: {}, avgTitleLen: null, samples: 0 } });
  }
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
  // Sanitise — only the three fields, bounded.
  const clean: DeckSignal[] = signals
    .filter((s) => s && typeof s.role === "string" && typeof s.templateId === "string")
    .slice(0, 30)
    .map((s) => ({
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
