/**
 * GET /api/admin/social-templates/list?platform=instagram
 *
 * Returns the template manifest the Plan page uses to populate its
 * gallery. Just metadata — render functions stay server-side. If
 * `platform` is omitted, returns ALL templates across platforms.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  groupByCategory,
  listTemplateMetas,
  listTemplatesForPlatform,
} from "@/lib/social-templates/registry";
import type { SocialPlatform } from "@/lib/social-templates/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "x"];

export async function GET(request: Request) {
  await requireAdminSession();

  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform");
  const platform =
    platformParam && VALID_PLATFORMS.includes(platformParam as SocialPlatform)
      ? (platformParam as SocialPlatform)
      : null;

  const metas = platform ? listTemplatesForPlatform(platform) : listTemplateMetas();
  const groups = groupByCategory(metas);

  return NextResponse.json({
    platform,
    total: metas.length,
    groups,
  });
}
