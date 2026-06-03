import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { listTemplateOverrides } from "@/lib/template-overrides";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/template-overrides
 * All saved "official template" edits as a map { templateId → EditorSlide }.
 * Loaders apply these over the code presets so the SMM's fixes show wherever
 * a template is used.
 */
export async function GET() {
  await requireAdminSession();
  try {
    const overrides = await listTemplateOverrides();
    return NextResponse.json({ overrides });
  } catch (err) {
    // Degrade silently (e.g. before migration 034 is applied): no overrides,
    // so every template falls back to its code default. 200 keeps the loaders
    // (and the browser console) clean.
    console.error("[template-overrides] list failed:", err);
    return NextResponse.json({ overrides: {} });
  }
}
