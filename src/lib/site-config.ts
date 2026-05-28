/**
 * Site config helpers — typed wrappers around the site_config KV table.
 *
 * Each well-known key has its own getter + setter pair. Values are
 * stored as JSON (jsonb in Postgres) so the schema doesn't have to
 * change when a new tactical-config knob is added.
 *
 * Currently supported keys:
 *   - 'banner'             → site-wide urgent banner
 *   - 'featured_campaign'  → which campaign to feature on homepage + donate
 *
 * Caller pattern:
 *   - Server pages: `const banner = await getBannerConfig();` then conditionally
 *     render <SiteBanner config={banner} />.
 *   - Admin actions: `await setBannerConfig(input, session.email);` followed by
 *     revalidatePath('/admin/social') + revalidatePath('/').
 */

import { revalidatePath } from "next/cache";
import { CAMPAIGNS, type CampaignSlug, isValidCampaign } from "./campaigns";
import { getSupabaseAdmin } from "./supabase";

// ─── Banner ─────────────────────────────────────────────────────────────

export type BannerTheme = "info" | "urgent";

export interface BannerConfig {
  /** Master on/off. False = nothing renders on the public site. */
  active: boolean;
  /** Short headline — keep under ~80 chars so it doesn't wrap awkwardly. */
  message: string;
  /** Optional CTA link displayed inline after the message. */
  link?: { href: string; label: string };
  /** Visual style. 'urgent' = red emergency; 'info' = brand-neutral. */
  theme: BannerTheme;
  /** When true, donors can dismiss the banner client-side for 24h. */
  dismissible: boolean;
}

/** Default banner that renders when nothing is configured. */
const EMPTY_BANNER: BannerConfig = {
  active: false,
  message: "",
  theme: "info",
  dismissible: true,
};

function isBannerConfig(value: unknown): value is BannerConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<BannerConfig>;
  if (typeof v.active !== "boolean") return false;
  if (typeof v.message !== "string") return false;
  if (v.theme !== "info" && v.theme !== "urgent") return false;
  if (typeof v.dismissible !== "boolean") return false;
  if (v.link !== undefined) {
    if (!v.link || typeof v.link !== "object") return false;
    if (typeof v.link.href !== "string" || typeof v.link.label !== "string") {
      return false;
    }
  }
  return true;
}

export async function getBannerConfig(): Promise<BannerConfig> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "banner")
    .maybeSingle();
  if (error) {
    console.error("[site-config] banner read failed:", error);
    return EMPTY_BANNER;
  }
  const value = data?.value;
  return isBannerConfig(value) ? value : EMPTY_BANNER;
}

export interface SetBannerInput {
  active: boolean;
  message: string;
  linkHref?: string;
  linkLabel?: string;
  theme: BannerTheme;
  dismissible: boolean;
}

export async function setBannerConfig(
  input: SetBannerInput,
  byEmail: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validation
  if (typeof input.active !== "boolean") {
    return { ok: false, error: "Invalid 'active' value." };
  }
  if (input.active && !input.message?.trim()) {
    return { ok: false, error: "Banner message is required when active." };
  }
  if (input.message && input.message.length > 200) {
    return { ok: false, error: "Banner message must be 200 characters or fewer." };
  }
  const hasLinkHref = !!input.linkHref?.trim();
  const hasLinkLabel = !!input.linkLabel?.trim();
  if (hasLinkHref !== hasLinkLabel) {
    return {
      ok: false,
      error: "Provide both a link URL and label, or leave both empty.",
    };
  }
  if (hasLinkHref) {
    const href = input.linkHref!.trim();
    if (!href.startsWith("/") && !/^https?:\/\//i.test(href)) {
      return {
        ok: false,
        error: 'Link URL must be a path like "/qurbani" or a full https:// URL.',
      };
    }
  }
  if (input.theme !== "info" && input.theme !== "urgent") {
    return { ok: false, error: "Invalid theme." };
  }

  const config: BannerConfig = {
    active: input.active,
    message: input.message.trim(),
    theme: input.theme,
    dismissible: !!input.dismissible,
    ...(hasLinkHref
      ? {
          link: {
            href: input.linkHref!.trim(),
            label: input.linkLabel!.trim(),
          },
        }
      : {}),
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("site_config")
    .upsert(
      {
        key: "banner",
        value: config,
        updated_by_email: byEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) {
    console.error("[site-config] banner write failed:", error);
    return { ok: false, error: "Could not save the banner." };
  }

  // Banner appears on every public page — revalidate the home shell
  // and a few high-traffic routes. The whole public site re-renders
  // on next request, since these are server components with the
  // banner read at request time.
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─── Featured campaign ──────────────────────────────────────────────────

export interface FeaturedCampaignConfig {
  campaignSlug: CampaignSlug;
}

export async function getFeaturedCampaign(): Promise<CampaignSlug | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "featured_campaign")
    .maybeSingle();
  if (error) {
    console.error("[site-config] featured_campaign read failed:", error);
    return null;
  }
  const value = data?.value;
  if (!value || typeof value !== "object") return null;
  const slug = (value as { campaignSlug?: unknown }).campaignSlug;
  if (typeof slug !== "string" || !isValidCampaign(slug)) return null;
  return slug;
}

export async function setFeaturedCampaign(
  campaignSlug: CampaignSlug | null,
  byEmail: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (campaignSlug !== null && !isValidCampaign(campaignSlug)) {
    return { ok: false, error: "Unknown campaign." };
  }

  const supabase = getSupabaseAdmin();

  if (campaignSlug === null) {
    // Clearing — delete the row entirely so getFeaturedCampaign cleanly
    // returns null instead of a sentinel value.
    const { error } = await supabase
      .from("site_config")
      .delete()
      .eq("key", "featured_campaign");
    if (error) {
      console.error("[site-config] featured clear failed:", error);
      return { ok: false, error: "Could not clear the featured campaign." };
    }
  } else {
    const { error } = await supabase
      .from("site_config")
      .upsert(
        {
          key: "featured_campaign",
          value: { campaignSlug },
          updated_by_email: byEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) {
      console.error("[site-config] featured write failed:", error);
      return { ok: false, error: "Could not save the featured campaign." };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Convenience: human label for a campaign slug. */
export function campaignLabel(slug: CampaignSlug): string {
  return CAMPAIGNS[slug];
}
