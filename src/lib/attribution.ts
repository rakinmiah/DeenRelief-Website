/**
 * Ad-attribution capture: first-party cookie that remembers which click
 * brought the visitor to the site (Google gclid / gbraid / wbraid, Meta
 * fbclid, UTM params, landing page + referrer + timestamp).
 *
 * The cookie is set client-side by <AttributionCapture /> on first paint,
 * read server-side in /api/donations/create-intent (→ Stripe metadata for
 * audit) and /api/donations/confirm (→ donations row for ROAS reporting
 * and Google Ads offline conversion import).
 *
 * Attribution model: **last-click wins**. If a new visit arrives with any
 * click/UTM params, they replace the cookie. Organic returns (no params)
 * leave an existing cookie untouched. This matches Google Ads' default
 * attribution for offline imports and is simplest to reason about.
 *
 * Cookie name:   dr_attribution
 * Format:        URL-encoded JSON
 * Max-Age:       90 days (matches Google's gclid cookie window)
 * SameSite:      Lax  (so cross-site referrals from Google still attach
 *                      on GET, but we still block CSRF on state-changing
 *                      requests — we don't authenticate anything off
 *                      this cookie anyway.)
 */

export const ATTRIBUTION_COOKIE = "dr_attribution";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

/** URL params we care about. Add new ones here and they flow through. */
export const ATTRIBUTION_PARAM_KEYS = [
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type AttributionParamKey = (typeof ATTRIBUTION_PARAM_KEYS)[number];

export interface AttributionData {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  /** First URL on the site where these params were captured. */
  landing_page?: string;
  /** document.referrer at capture time (may be empty for direct/typed). */
  landing_referrer?: string;
  /** ISO timestamp when this attribution was stamped. */
  landing_at?: string;
}

/** Stripe metadata has a 500-char-per-value cap; trim to be safe. */
const MAX_VALUE_LEN = 500;

function truncate(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  return v.length > MAX_VALUE_LEN ? v.slice(0, MAX_VALUE_LEN) : v;
}

/** Pull attribution keys out of a URLSearchParams. Empty object if none. */
export function attributionFromSearchParams(
  sp: URLSearchParams
): Partial<AttributionData> {
  const out: Partial<AttributionData> = {};
  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const v = sp.get(key);
    if (v) out[key] = truncate(v);
  }
  return out;
}

/** True if at least one tracked click/UTM key is set. */
export function hasAnyClickOrUtm(a: Partial<AttributionData>): boolean {
  return ATTRIBUTION_PARAM_KEYS.some((k) => !!a[k]);
}

/** Serialize for cookie storage. URL-encode so semicolons/commas are safe. */
export function serializeAttribution(a: AttributionData): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Parse a cookie value. Returns null on any decode error. */
export function parseAttribution(raw: string | undefined | null): AttributionData | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AttributionData;
  } catch {
    return null;
  }
}

/**
 * Flatten attribution to Stripe metadata. Keys are prefixed `attr_` so they
 * don't collide with the existing `campaign`, `frequency`, etc. metadata.
 * Undefined/empty values are dropped — Stripe rejects null values.
 */
export function attributionToStripeMetadata(
  a: AttributionData | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!a) return out;
  const fields: Array<keyof AttributionData> = [
    ...ATTRIBUTION_PARAM_KEYS,
    "landing_page",
    "landing_referrer",
    "landing_at",
  ];
  for (const k of fields) {
    const v = a[k];
    if (v) {
      const t = truncate(v);
      if (t) out[`attr_${k}`] = t;
    }
  }
  return out;
}
