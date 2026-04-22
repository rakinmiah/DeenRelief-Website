/**
 * Rate limiter for API routes — backed by Upstash Redis.
 *
 * Usage:
 *   const result = await checkRateLimit(request, "create-intent");
 *   if (!result.success) return rateLimitResponse(result);
 *
 * Configuration:
 *   - Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in env.
 *   - Without those set, checkRateLimit() returns success: true (no limiting).
 *     Safe no-op for local dev and for pre-vendor deployments.
 *
 * Each named bucket (e.g. "create-intent") has its own sliding-window
 * counter keyed by client IP. Tune limits in the `limiters` map below.
 *
 * Why Upstash: serverless-native Redis (no connection pooling), free tier
 * allows 10k requests/day. A determined attacker can still spam from many
 * IPs — this is a speed bump, not a defence. For true abuse protection
 * pair with Cloudflare Turnstile / reCAPTCHA on the donate page.
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (url && token) {
  redis = new Redis({ url, token });
}

/**
 * Named limit buckets. Add new endpoints here rather than inline in routes.
 *   - sliding window: "X requests per Y seconds", counted over a rolling
 *     window. Fairer than fixed-window at bucket boundaries.
 */
const limiters = {
  /**
   * Donation intent creation: generous enough for a human retrying a
   * failed payment a few times, tight enough to stop naive scripted spam.
   */
  "create-intent": redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        analytics: true,
        prefix: "rl:create-intent",
      })
    : null,
} as const;

type LimiterName = keyof typeof limiters;

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;   // unix ms when the limit resets
}

/** Extract best-effort client IP from request headers. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Check a request against a named limit bucket. If Upstash isn't configured
 * this always returns success — the route runs as if no limiter existed.
 */
export async function checkRateLimit(
  request: Request,
  bucket: LimiterName
): Promise<RateLimitResult> {
  const limiter = limiters[bucket];
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const ip = getClientIp(request);
  const result = await limiter.limit(ip);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/** Build a 429 response from a failed rate-limit check. */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  return NextResponse.json(
    {
      error:
        "Too many requests. Please wait a moment and try again — if this is a mistake, contact us at info@deenrelief.org.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
