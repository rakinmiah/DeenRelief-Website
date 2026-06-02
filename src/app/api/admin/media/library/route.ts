import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { listMedia } from "@/lib/media-library";
import type { ImageCandidate, ImageOrientation } from "@/lib/social-templates/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/library — the ENTIRE Deen Relief media library as
 * ImageCandidates, for the slide editor's "View entire library" view.
 *
 * The per-event picker (`/api/admin/social-content/:eventId/images`) returns
 * only the candidates ranked for that event — a geography/event-type subset.
 * This route returns the whole non-archived library so the SMM can reach any
 * DR image from inside the editor, not just the suggested ones. Optional
 * `?q=` does a caption search; `?limit=` caps the result (default 500).
 */
function classifyOrientation(
  width: number | null,
  height: number | null
): ImageOrientation {
  if (!width || !height) return "square";
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

export async function GET(request: Request) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 500;

  const items = await listMedia({ query: q, limit });

  const images: ImageCandidate[] = items.map((m) => ({
    id: `dr:${m.id}`,
    source: "dr_library",
    url: m.publicUrl,
    thumbnailUrl: null,
    width: m.width,
    height: m.height,
    orientation: classifyOrientation(m.width, m.height),
    creditText: null,
    description: m.caption ?? null,
  }));

  return NextResponse.json({ total: images.length, images });
}
