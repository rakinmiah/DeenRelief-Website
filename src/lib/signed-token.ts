/**
 * HMAC-signed tokens for password-less "magic link" flows.
 *
 * Used by the monthly-donation manage link — donors click a link in their
 * receipt email and land on /manage, which verifies the signature and
 * opens a Stripe Billing Portal session without requiring them to log in.
 *
 * Security model:
 *   - Payload is HMAC-SHA256 signed with APP_SECRET (server only)
 *   - Tokens include an `exp` timestamp and are rejected after it
 *   - Tampering with any payload field invalidates the signature
 *   - Leaked token only grants access to ONE customer's Stripe portal —
 *     no bulk data access, no donor PII beyond what Stripe exposes
 *
 * Token format:
 *   base64url(JSON(payload)) + "." + base64url(HMAC-SHA256(payloadB64))
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface ManageTokenPayload {
  /** Stripe customer ID the token is bound to (cus_...) */
  cus: string;
  /** Unix seconds at which the token expires */
  exp: number;
  /** Issued-at, Unix seconds — diagnostic only */
  iat: number;
}

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

function getSecret(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error(
      "APP_SECRET is not set — cannot sign or verify tokens."
    );
  }
  return Buffer.from(secret, "utf8");
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function b64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

/** Sign a manage-subscription token for the given Stripe customer. */
export function signManageToken(
  customerId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: ManageTokenPayload = {
    cus: customerId,
    exp: now + ttlSeconds,
    iat: now,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${b64urlEncode(signature)}`;
}

/**
 * Verify + decode a manage token. Returns the payload if valid, null on
 * any failure (bad signature, expired, malformed, missing env var).
 */
export function verifyManageToken(token: string): ManageTokenPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  let expected: Buffer;
  try {
    expected = createHmac("sha256", getSecret()).update(payloadB64).digest();
  } catch {
    return null;
  }

  const received = b64urlDecode(sigB64);
  if (received.length !== expected.length) return null;
  if (!timingSafeEqual(received, expected)) return null;

  let payload: ManageTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof payload.cus !== "string" ||
    !payload.cus.startsWith("cus_") ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return payload;
}
