/**
 * Shared SHA-256 hashing for Google Ads user identifiers.
 *
 * Used by both:
 *   - /api/cron/google-ads-oci (API path — Enhanced Conversions identifiers)
 *   - /api/google-ads-csv-export (CSV path — Email column)
 *
 * Hash format per Google's spec: lowercase + trim + SHA-256, hex-encoded.
 * Empty / null input returns null so we don't upload an empty-string hash.
 */

import { createHash } from "node:crypto";

export function hashForEnhancedConversion(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}
