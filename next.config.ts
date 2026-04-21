import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Prevent clickjacking — only allow framing from same origin
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop browsers from MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS (1 year, include subdomains)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Restrict permissions for browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  // XSS protection fallback for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withMDX = createMDX({});

/**
 * Sentry wrapper — only augments the build when SENTRY_AUTH_TOKEN is set
 * (which enables source map uploading). Without it, runtime error capture
 * still works via the sentry.*.config.ts files; you just get minified
 * stack traces in Sentry until you add the token.
 */
const sentryOptions = {
  silent: true,
  disableLogger: true,
  // Auto-detects SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN from env.
  // Leave unset locally to skip source map upload.
};

export default withSentryConfig(withMDX(nextConfig), sentryOptions);
