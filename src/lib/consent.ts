/**
 * Cookie consent + Google Consent Mode v2 state.
 *
 * We persist four toggles to the `dr_consent` cookie. Mapping to Google's
 * four consent signals:
 *
 *   ad_storage          — can we set advertising cookies? (conversion pings,
 *                         remarketing)
 *   analytics_storage   — can we set analytics cookies? (GA4 client ID)
 *   ad_user_data        — can we send user data to Google Ads? (Enhanced
 *                         Conversions, hashed email)
 *   ad_personalization  — can we use data for remarketing?
 *
 * Categories shown to the user in the settings modal (simpler than four
 * technical toggles):
 *   Essential           — always on (rate-limit, checkout, consent cookie itself)
 *   Analytics           — maps to analytics_storage
 *   Advertising         — maps to ad_storage + ad_user_data + ad_personalization
 *
 * Under UK PECR and ICO guidance, consent must be:
 *   - Opt-in (no pre-ticked boxes → defaults denied)
 *   - As easy to withdraw as to give (the "Manage cookies" footer link)
 *   - Equally prominent accept vs. reject (the banner has equal-weight buttons)
 */

export const CONSENT_COOKIE = "dr_consent";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 6 months
export const CONSENT_VERSION = 1;

/** Custom DOM event name the Footer link dispatches to open the settings modal. */
export const CONSENT_OPEN_EVENT = "dr:consent-open";

export interface ConsentState {
  /** Bumped whenever the category layout changes so we can re-ask. */
  version: number;
  /** ISO timestamp of the user's last decision. */
  timestamp: string;
  analytics_storage: boolean;
  ad_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
}

/** Rejected-everything baseline. Essential-only. */
export function rejectAll(): Omit<ConsentState, "timestamp"> {
  return {
    version: CONSENT_VERSION,
    analytics_storage: false,
    ad_storage: false,
    ad_user_data: false,
    ad_personalization: false,
  };
}

/** Granted-everything baseline. */
export function acceptAll(): Omit<ConsentState, "timestamp"> {
  return {
    version: CONSENT_VERSION,
    analytics_storage: true,
    ad_storage: true,
    ad_user_data: true,
    ad_personalization: true,
  };
}

/** Map an internal category toggle to the four gtag signals. */
export function categoriesToState(opts: {
  analytics: boolean;
  advertising: boolean;
}): Omit<ConsentState, "timestamp"> {
  return {
    version: CONSENT_VERSION,
    analytics_storage: opts.analytics,
    ad_storage: opts.advertising,
    ad_user_data: opts.advertising,
    ad_personalization: opts.advertising,
  };
}

export interface ConsentSignals {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
}

/** Shape we hand to `gtag('consent', 'update', ...)`. */
export function toGtagSignals(state: ConsentState): ConsentSignals {
  const g = (v: boolean): "granted" | "denied" => (v ? "granted" : "denied");
  return {
    analytics_storage: g(state.analytics_storage),
    ad_storage: g(state.ad_storage),
    ad_user_data: g(state.ad_user_data),
    ad_personalization: g(state.ad_personalization),
  };
}

// ─── Cookie read/write (client only) ───

export function readConsentCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(match[1])) as ConsentState;
    // Ignore cookies from a previous version — treat as "not yet decided".
    if (decoded?.version !== CONSENT_VERSION) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function writeConsentCookie(state: Omit<ConsentState, "timestamp">) {
  if (typeof document === "undefined") return;
  const full: ConsentState = { ...state, timestamp: new Date().toISOString() };
  const value = encodeURIComponent(JSON.stringify(full));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}` +
    `; Path=/` +
    `; Max-Age=${CONSENT_MAX_AGE_SECONDS}` +
    `; SameSite=Lax${secure}`;
}

/**
 * Call gtag('consent', 'update', ...) if gtag is loaded. Safe before gtag
 * exists — the bootstrap script defines gtag at the top of <body>, so by
 * the time any user interaction happens it's guaranteed to be present.
 */
export function applyConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("consent", "update", toGtagSignals(state));
  }
}
