import type { UpsellCard } from "@/lib/donation-upsell";
import { ORPHAN_UPSELL_CARDS } from "@/app/orphan-sponsorship/upsell-cards";
import { PALESTINE_UPSELL_CARDS } from "@/app/palestine/upsell-cards";
import { CANCER_CARE_UPSELL_CARDS } from "@/app/cancer-care/upsell-cards";
import { UK_HOMELESS_UPSELL_CARDS } from "@/app/uk-homeless/upsell-cards";

/**
 * Confirm-step upsell cards per campaign. The interstitial is shown only for
 * ONE-TIME gifts on campaigns listed here; everything else returns null and
 * the checkout proceeds straight to payment. (Monthly gifts use the dynamic
 * donation-panel chips instead — the two never appear together.)
 */
const CHECKOUT_UPSELL_CARDS: Record<string, UpsellCard[]> = {
  "orphan-sponsorship": ORPHAN_UPSELL_CARDS,
  palestine: PALESTINE_UPSELL_CARDS,
  "cancer-care": CANCER_CARE_UPSELL_CARDS,
  "uk-homeless": UK_HOMELESS_UPSELL_CARDS,
};

export function getCheckoutUpsellCards(campaign: string): UpsellCard[] | null {
  return CHECKOUT_UPSELL_CARDS[campaign] ?? null;
}
