import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { upsertTemplateOverride, deleteTemplateOverride } from "@/lib/template-overrides";
import type { EditorSlide } from "@/lib/social-editor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/social/template-overrides/:templateId
 * Save the edited slide as the official version of this template.
 *
 * DELETE — revert this template to its code default.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await requireAdminSession();
  const { templateId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const slide = (body as { slide?: EditorSlide })?.slide;
  if (!slide || typeof slide !== "object" || !Array.isArray((slide as EditorSlide).layers)) {
    return NextResponse.json({ error: "invalid_slide" }, { status: 400 });
  }
  try {
    await upsertTemplateOverride(templateId, slide as EditorSlide, session.email ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[template-overrides] save failed:", err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  await requireAdminSession();
  const { templateId } = await params;
  try {
    await deleteTemplateOverride(templateId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[template-overrides] delete failed:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
