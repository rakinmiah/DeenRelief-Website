/**
 * POST /api/admin/image-search/track   body: { downloadLocation: string }
 *
 * Unsplash API ToS compliance: when one of their images is actually USED, the
 * app must ping the photo's `download_location`. The editor fires this on
 * pick. No-op for any non-Unsplash location.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { trackUnsplashDownload } from "@/lib/image-search/unsplash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdminSession();
  let body: { downloadLocation?: string };
  try {
    body = (await request.json()) as { downloadLocation?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const loc = (body.downloadLocation ?? "").trim();
  if (loc) await trackUnsplashDownload(loc);
  return NextResponse.json({ ok: true });
}
