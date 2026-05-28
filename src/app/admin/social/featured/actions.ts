"use server";

import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidCampaign, type CampaignSlug } from "@/lib/campaigns";
import { setFeaturedCampaign } from "@/lib/site-config";

export type FeaturedActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setFeaturedCampaignAction(
  campaignSlug: string | null
): Promise<FeaturedActionResult> {
  const session = await requireAdminSession();
  let slug: CampaignSlug | null = null;
  if (campaignSlug && campaignSlug !== "") {
    if (!isValidCampaign(campaignSlug)) {
      return { ok: false, error: "Unknown campaign." };
    }
    slug = campaignSlug;
  }
  const result = await setFeaturedCampaign(slug, session.email);
  if (!result.ok) return result;

  await logAdminAction({
    action: "featured_campaign_updated",
    userEmail: session.email,
    metadata: { campaignSlug: slug },
  });
  return { ok: true };
}
