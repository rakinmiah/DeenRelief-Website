"use server";

/**
 * Server actions for the /now spotlight controls.
 *
 *   - createSpotlightAction → pick a campaign + duration, supersedes any
 *                             existing active spotlight.
 *   - extendSpotlightAction → roll the active spotlight forward by N days.
 *   - clearSpotlightAction  → soft-reset to homepage.
 *
 * Every action calls requireAdminSession + writes an audit row.
 *
 * Revalidation: /now reads server-side per request via the redirect
 * handler we'll wire next (Task #5). For now there's no public-page
 * cache to bust — only the admin pages need a refresh.
 */

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidCampaign } from "@/lib/campaigns";
import {
  SPOTLIGHT_MAX_DAYS,
  SPOTLIGHT_MIN_DAYS,
  clearActiveSpotlight,
  createSpotlight,
  extendActiveSpotlight,
} from "@/lib/now-spotlight";

export type SpotlightActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createSpotlightAction(input: {
  campaignSlug: string;
  durationDays?: number;
}): Promise<SpotlightActionResult> {
  const session = await requireAdminSession();
  if (!isValidCampaign(input.campaignSlug)) {
    return { ok: false, error: "Unknown campaign." };
  }
  const result = await createSpotlight({
    campaignSlug: input.campaignSlug,
    durationDays: input.durationDays,
    byEmail: session.email,
  });
  if (!result.ok) return result;

  await logAdminAction({
    action: "spotlight_created",
    userEmail: session.email,
    metadata: {
      campaignSlug: input.campaignSlug,
      durationDays: input.durationDays ?? 3,
      expiresAt: result.expiresAt.toISOString(),
    },
  });
  revalidatePath("/admin/social/spotlight");
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function extendSpotlightAction(
  durationDays: number
): Promise<SpotlightActionResult> {
  const session = await requireAdminSession();
  if (
    typeof durationDays !== "number" ||
    durationDays < SPOTLIGHT_MIN_DAYS ||
    durationDays > SPOTLIGHT_MAX_DAYS
  ) {
    return {
      ok: false,
      error: `Duration must be between ${SPOTLIGHT_MIN_DAYS} and ${SPOTLIGHT_MAX_DAYS} days.`,
    };
  }
  const result = await extendActiveSpotlight(durationDays, session.email);
  if (!result.ok) return result;

  await logAdminAction({
    action: "spotlight_extended",
    userEmail: session.email,
    metadata: { durationDays, expiresAt: result.expiresAt.toISOString() },
  });
  revalidatePath("/admin/social/spotlight");
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function clearSpotlightAction(): Promise<SpotlightActionResult> {
  const session = await requireAdminSession();
  const result = await clearActiveSpotlight();
  if (!result.ok) return result;

  await logAdminAction({
    action: "spotlight_cleared",
    userEmail: session.email,
  });
  revalidatePath("/admin/social/spotlight");
  revalidatePath("/admin/social");
  return { ok: true };
}
