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
  /**
   * 308 permanent redirects from the old WordPress URL structure to the
   * new Next.js routes. Sourced from the live Yoast sitemap on 2026-05-06
   * (page-sitemap.xml + post-sitemap.xml + give_forms-sitemap.xml).
   *
   * Why permanent: true → Next.js emits 308 (preserves request method).
   * Google treats 308 equivalently to 301 for SEO ranking transfer.
   *
   * Order matters — specific patterns first, catch-all wildcards last.
   *
   * Trailing slashes: with no `trailingSlash` config, Next.js auto-
   * canonicalises `/foo/` to `/foo` before matching, so unsuffixed
   * sources cover both shapes.
   */
  async redirects() {
    return [
      // ─── Marketing pages (Yoast page-sitemap.xml) ──────────────────────
      { source: "/hero-slab-test", destination: "/", permanent: true },
      { source: "/palestine-emergency-relief-campaign", destination: "/palestine", permanent: true },
      { source: "/fulfill-your-duty-contribute-zakat-today", destination: "/zakat", permanent: true },
      { source: "/cancer-care-centres", destination: "/cancer-care", permanent: true },
      { source: "/save-refugee-children-with-cancer", destination: "/cancer-care", permanent: true },
      { source: "/bangladesh-orphan-sponsorship", destination: "/orphan-sponsorship", permanent: true },
      { source: "/aid-for-homeless-community-uk", destination: "/uk-homeless", permanent: true },
      { source: "/udhiyyah-2025-qurbani", destination: "/qurbani", permanent: true },
      { source: "/bangladesh-clean-water-aid-project", destination: "/clean-water", permanent: true },
      { source: "/help-us-to-build-a-school-in-rural-bangladesh", destination: "/build-a-school", permanent: true },
      { source: "/current-campaigns", destination: "/our-work", permanent: true },
      { source: "/past-campaigns", destination: "/our-work", permanent: true },
      { source: "/compaigns", destination: "/our-work", permanent: true }, // typo in WP
      { source: "/stories", destination: "/blog", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },

      // ─── WooCommerce / GiveWP donor area (no equivalent — back to home) ─
      { source: "/my-account", destination: "/", permanent: true },
      { source: "/donor-dashboard", destination: "/", permanent: true },
      { source: "/checkout", destination: "/donate", permanent: true },
      { source: "/basket", destination: "/donate", permanent: true },
      { source: "/shop", destination: "/", permanent: true },
      { source: "/donation-confirmation", destination: "/donate", permanent: true },
      { source: "/donation-failed", destination: "/donate", permanent: true },

      // ─── Old standalone city page (pre-prayer-times-uk taxonomy) ───────
      { source: "/southampton", destination: "/prayer-times/southampton", permanent: true },

      // ─── Prayer times — city pages (suffix pattern) ────────────────────
      { source: "/prayer-times-uk/cardiff-prayer-times", destination: "/prayer-times/cardiff", permanent: true },
      { source: "/prayer-times-uk/blackburn-prayer-times", destination: "/prayer-times/blackburn", permanent: true },
      { source: "/prayer-times-uk/birmingham-prayer-times", destination: "/prayer-times/birmingham", permanent: true },
      { source: "/prayer-times-uk/brighton-prayer-times", destination: "/prayer-times/brighton", permanent: true },
      { source: "/prayer-times-uk/bradford-prayer-times", destination: "/prayer-times/bradford", permanent: true },

      // ─── Prayer times — city pages (prefix pattern) ────────────────────
      { source: "/prayer-times-uk/prayer-times-aylesbury", destination: "/prayer-times/aylesbury", permanent: true },

      // ─── Prayer times — city pages (bare slug pattern) ─────────────────
      { source: "/prayer-times-uk/cambridge", destination: "/prayer-times/cambridge", permanent: true },
      { source: "/prayer-times-uk/slough", destination: "/prayer-times/slough", permanent: true },
      { source: "/prayer-times-uk/newcastle-upon-tyne", destination: "/prayer-times/newcastle-upon-tyne", permanent: true },
      { source: "/prayer-times-uk/manchester", destination: "/prayer-times/manchester", permanent: true },
      { source: "/prayer-times-uk/liverpool", destination: "/prayer-times/liverpool", permanent: true },
      { source: "/prayer-times-uk/leicester", destination: "/prayer-times/leicester", permanent: true },
      { source: "/prayer-times-uk/london", destination: "/prayer-times/london", permanent: true },
      { source: "/prayer-times-uk/luton", destination: "/prayer-times/luton", permanent: true },
      { source: "/prayer-times-uk/high-wycombe", destination: "/prayer-times/high-wycombe", permanent: true },
      { source: "/prayer-times-uk/glasgow", destination: "/prayer-times/glasgow", permanent: true },
      { source: "/prayer-times-uk/dublin", destination: "/prayer-times/dublin", permanent: true },
      { source: "/prayer-times-uk/dewsbury", destination: "/prayer-times/dewsbury", permanent: true },

      // ─── Prayer times — taxonomy index + catch-all ─────────────────────
      { source: "/prayer-times-uk", destination: "/prayer-times", permanent: true },
      { source: "/prayer-times-uk/:slug*", destination: "/prayer-times", permanent: true },

      // ─── Blog posts (Yoast post-sitemap.xml) — all consolidated to
      //     campaign pages since the WP "posts" were really campaign
      //     landing pages, not editorial content. ───────────────────────
      { source: "/donate-to-gaza", destination: "/palestine", permanent: true },
      { source: "/muslim-charities", destination: "/about", permanent: true },
      { source: "/islamic-charity", destination: "/about", permanent: true },
      { source: "/eid-zakat", destination: "/zakat", permanent: true },
      { source: "/zakaat", destination: "/zakat", permanent: true }, // misspelling
      { source: "/save-syrian-children-with-cancer", destination: "/cancer-care", permanent: true },
      { source: "/aid-for-pakistan", destination: "/our-work", permanent: true },
      { source: "/eid-al-adha-2018-2020-qurbani", destination: "/qurbani", permanent: true },
      { source: "/aid-for-africa", destination: "/our-work", permanent: true },
      { source: "/aid-for-yemen", destination: "/our-work", permanent: true },
      { source: "/emergency-aid-for-turkish-earthquake-victims", destination: "/our-work", permanent: true },
      { source: "/aid-for-indonesian-earthquake-victims", destination: "/our-work", permanent: true },
      { source: "/bangladeshi-children-fund", destination: "/orphan-sponsorship", permanent: true },
      { source: "/bangladesh-housing-aid", destination: "/our-work", permanent: true },
      { source: "/emergency-appeal-for-pakistan-flood-victims", destination: "/our-work", permanent: true },
      { source: "/emergency-appeal-for-bangladesh-flood-victiims", destination: "/our-work", permanent: true }, // typo in WP
      { source: "/charity-dinner-in-aid-of-syrian-children-with-cancer", destination: "/cancer-care", permanent: true },

      // ─── GiveWP donation forms (give_forms-sitemap.xml) ────────────────
      // Specific form URLs first so they win over the catch-all below.
      { source: "/donations/aid-for-children-in-gaza", destination: "/palestine", permanent: true },
      { source: "/donations/bangladesh-clean-water-aid-project-3", destination: "/clean-water", permanent: true },
      { source: "/donations/help-us-to-build-a-school-in-rural-bangladesh", destination: "/build-a-school", permanent: true },
      { source: "/donations/help-us-to-build-a-school-in-rural-bangladesh-2", destination: "/build-a-school", permanent: true },
      { source: "/donations/aid-for-homeless-community-uk-2", destination: "/uk-homeless", permanent: true },
      { source: "/donations/bangladesh-orphan-sponsorship", destination: "/orphan-sponsorship", permanent: true },
      { source: "/donations/save-refugee-children-with-cancer", destination: "/cancer-care", permanent: true },
      { source: "/donations/zakaat-2", destination: "/zakat", permanent: true },
      { source: "/donations/emergency-appeal-for-bangladesh-flood-victims-act-now-to-save-lives", destination: "/our-work", permanent: true },
      { source: "/donations/bangladesh-housing-aid-project", destination: "/our-work", permanent: true },
      { source: "/donations/bangladesh-housing-aid-project-2", destination: "/our-work", permanent: true },

      // ─── /donations/* catch-all — anything else (incl. /donate, /8-revision-v1)
      //     lands on the new donation page. MUST be last in the /donations
      //     group so specific rules above win first.
      { source: "/donations", destination: "/donate", permanent: true },
      { source: "/donations/:slug*", destination: "/donate", permanent: true },
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
