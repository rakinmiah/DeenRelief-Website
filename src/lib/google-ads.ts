/**
 * Google Ads Offline Conversion Import (OCI) + Enhanced Conversions helper.
 *
 * Why this file exists: Google Ads' own npm SDK is heavy and ships with a
 * large gRPC stub. For the three REST operations we need (OAuth refresh,
 * uploadClickConversions, account-level dev-token header) plain fetch is
 * simpler, lighter, and easier to audit. If we ever need campaign
 * management or reporting APIs we can adopt the SDK later.
 *
 * Env vars consumed:
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CUSTOMER_ID          — 10-digit account ID, no dashes
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID    — MCC manager ID if you operate under one (optional)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID — numeric ID of the "Donation" conversion action
 *   GOOGLE_ADS_CLIENT_ID            — OAuth client ID
 *   GOOGLE_ADS_CLIENT_SECRET        — OAuth client secret
 *   GOOGLE_ADS_REFRESH_TOKEN        — OAuth refresh token (long-lived)
 *
 * If any required value is missing, isGoogleAdsConfigured() returns false
 * and callers should short-circuit rather than throw. The cron route does
 * exactly this — safe no-op until the user finishes vetting and sets env
 * vars in Vercel.
 *
 * Pre-launch note: Google Ads API access requires an approved developer
 * token. Application turnaround is typically 1–3 weeks. The env-var shim
 * pattern lets us ship the code today and activate it the moment the
 * token arrives.
 */

export { hashForEnhancedConversion } from "./google-ads-hash";

const API_VERSION = "v18";

export interface GoogleAdsEnv {
  developerToken: string;
  customerId: string;
  loginCustomerId: string | null;
  conversionActionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/** Read + validate env vars. Returns null if any required value is missing. */
export function getGoogleAdsEnv(): GoogleAdsEnv | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (
    !developerToken ||
    !customerId ||
    !conversionActionId ||
    !clientId ||
    !clientSecret ||
    !refreshToken
  ) {
    return null;
  }

  return {
    developerToken,
    customerId,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? null,
    conversionActionId,
    clientId,
    clientSecret,
    refreshToken,
  };
}

export function isGoogleAdsConfigured(): boolean {
  return getGoogleAdsEnv() !== null;
}

// ─── OAuth2 access token ───

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

/**
 * Exchange the refresh token for a short-lived access token. Google gives
 * them a ~1 hour TTL; we cache until 60s before expiry to avoid a clock-
 * skew-adjacent 401.
 */
export async function getAccessToken(env: GoogleAdsEnv): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

// ─── ClickConversion upload ───

export interface ClickConversionInput {
  /** Google Ads click ID from the landing URL. Required for OCI. */
  gclid: string;
  /** ISO 8601 with timezone — e.g. "2026-04-22T14:25:00+00:00". Google is strict. */
  conversionDateTime: string;
  /** GBP value of the conversion. For monthly, pass the first-month amount. */
  conversionValue: number;
  currencyCode: string;
  /** Unique per-conversion id (we use Stripe PI/SI id). De-duplicates reuploads. */
  orderId: string;
  /** Optional hashed identifiers — drives Enhanced Conversions match rate. */
  userIdentifiers?: Array<
    | { hashedEmail: string }
    | { hashedPhoneNumber: string }
    | {
        addressInfo: {
          hashedFirstName?: string;
          hashedLastName?: string;
          countryCode?: string;
          postalCode?: string;
        };
      }
  >;
}

interface UploadResult {
  uploaded: number;
  failures: Array<{ orderId: string; message: string }>;
}

/**
 * Upload a batch of click conversions. Returns per-row status so the caller
 * can mark the `donations` rows as uploaded individually (partial success
 * is normal — a bad gclid shouldn't abort the whole batch).
 *
 * Google accepts up to 2000 operations per call; we cap at 500 to leave
 * headroom for request body size.
 */
export async function uploadClickConversions(
  env: GoogleAdsEnv,
  conversions: ClickConversionInput[]
): Promise<UploadResult> {
  if (conversions.length === 0) return { uploaded: 0, failures: [] };

  const token = await getAccessToken(env);
  const conversionActionResource = `customers/${env.customerId}/conversionActions/${env.conversionActionId}`;

  const operations = conversions.map((c) => {
    const userIdentifiers = c.userIdentifiers?.map((u) => {
      if ("hashedEmail" in u) return { hashedEmail: u.hashedEmail };
      if ("hashedPhoneNumber" in u) return { hashedPhoneNumber: u.hashedPhoneNumber };
      return { addressInfo: u.addressInfo };
    });
    return {
      gclid: c.gclid,
      conversionAction: conversionActionResource,
      conversionDateTime: c.conversionDateTime,
      conversionValue: c.conversionValue,
      currencyCode: c.currencyCode,
      orderId: c.orderId,
      ...(userIdentifiers && userIdentifiers.length > 0 ? { userIdentifiers } : {}),
    };
  });

  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${env.customerId}:uploadClickConversions`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": env.developerToken,
    "Content-Type": "application/json",
  };
  if (env.loginCustomerId) headers["login-customer-id"] = env.loginCustomerId;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversions: operations,
      // partialFailure: bad rows return errors but good rows still process.
      partialFailure: true,
      validateOnly: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uploadClickConversions failed (${res.status}): ${text}`);
  }

  interface UploadResponse {
    results?: Array<{ gclid?: string; orderId?: string } | null>;
    partialFailureError?: {
      message?: string;
      details?: Array<{ errors?: Array<{ location?: { fieldPathElements?: Array<{ index?: number }> }; message?: string }> }>;
    };
  }
  const json = (await res.json()) as UploadResponse;

  // Each results[i] is null if that operation failed. Google sticks the
  // per-row errors in partialFailureError.details[].errors[].location.
  const failures: UploadResult["failures"] = [];
  const results = json.results ?? [];
  const pfDetails = json.partialFailureError?.details ?? [];
  const indexedErrors = new Map<number, string>();
  for (const d of pfDetails) {
    for (const e of d.errors ?? []) {
      const idx = e.location?.fieldPathElements?.[0]?.index;
      if (typeof idx === "number") {
        indexedErrors.set(idx, e.message ?? "unknown error");
      }
    }
  }

  let uploaded = 0;
  conversions.forEach((c, i) => {
    const result = results[i];
    if (result && (result.orderId || result.gclid)) {
      uploaded += 1;
    } else {
      failures.push({
        orderId: c.orderId,
        message: indexedErrors.get(i) ?? "no result row returned",
      });
    }
  });

  return { uploaded, failures };
}
