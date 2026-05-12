import Script from "next/script";
import { CONSENT_COOKIE, CONSENT_VERSION } from "@/lib/consent";

/**
 * Google Consent Mode v2 bootstrap + conditional GA4 / Google
 * Ads loader.
 *
 * Runs as early as possible in the document (beforeInteractive). The order
 * matters:
 *
 *   1. Set default consent state to denied for all four signals. This is
 *      the Consent Mode v2 requirement — Google throttles EEA/UK
 *      conversions and disables remarketing when defaults aren't sent.
 *
 *   2. If a prior consent decision is in the dr_consent cookie, apply it
 *      via `gtag('consent', 'update', ...)`. This gives returning users
 *      the correct signals before any tag fires, avoiding a brief
 *      denied→granted flicker that would under-count their events.
 *
 *   3. If NEXT_PUBLIC_GA4_MEASUREMENT_ID is set, load GA4 (afterInteractive
 *      is fine — gtag is already defined from the beforeInteractive stub).
 *      Without the env var, this component is a pure consent-mode shim with
 *      no analytics wire at all — safe to ship before GA4 cutover.
 *
 *   4. If NEXT_PUBLIC_GOOGLE_ADS_ID is set, also configure the Google Ads
 *      remarketing tag on the same gtag.js instance. Conversions still flow
 *      through the GA4 → Ads link (GA4's purchase event marked as a Key
 *      event in GA4 admin, imported as a conversion in Ads); the AW config
 *      call here is what satisfies Ads's "tag detected" diagnostic and
 *      enables remarketing audiences. No conversion events fire from this
 *      bootstrap — the GA4 import path is the single source of truth for
 *      conversion attribution, no double-counting.
 *
 * Consent mode ships even without GA4 / Ads. The cookie layer is the legal
 * obligation; both ad tags are separate add-ons controlled by their env vars.
 */
export default function ConsentBootstrap() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  // We inline the cookie name + version constants as literals so the
  // bootstrap script doesn't need to import anything at runtime. If these
  // ever change in consent.ts we update them here too.
  const defaultScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });
    try {
      var m = document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
      if (m) {
        var c = JSON.parse(decodeURIComponent(m[1]));
        if (c && c.version === ${CONSENT_VERSION}) {
          gtag('consent', 'update', {
            ad_storage: c.ad_storage ? 'granted' : 'denied',
            analytics_storage: c.analytics_storage ? 'granted' : 'denied',
            ad_user_data: c.ad_user_data ? 'granted' : 'denied',
            ad_personalization: c.ad_personalization ? 'granted' : 'denied'
          });
        }
      }
    } catch (e) {}
  `;

  return (
    <>
      <Script id="gtag-consent-default" strategy="beforeInteractive">
        {defaultScript}
      </Script>

      {measurementId && (
        <>
          <Script
            id="gtag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              // Trustees signing into /admin/* should NEVER pollute the
              // donor analytics dataset. We set Google's official opt-out
              // flag (ga-disable-<ID>) BEFORE config() fires, so the
              // automatic page_view is suppressed on admin pages even on
              // first load. The companion AdminAnalyticsExclusion client
              // component handles client-side Link navigations between
              // public and admin (the disable flag stays accurate).
              //
              // Both the GA4 and Google Ads IDs get the disable flag —
              // gtag.js respects ga-disable-<ID> for every config'd tag,
              // GA4 or Ads alike.
              if (typeof location !== 'undefined' &&
                  location.pathname.indexOf('/admin') === 0) {
                window['ga-disable-${measurementId}'] = true;
                ${
                  googleAdsId
                    ? `window['ga-disable-${googleAdsId}'] = true;`
                    : ""
                }
              }
              gtag('js', new Date());
              gtag('config', '${measurementId}', { anonymize_ip: true });
              ${
                googleAdsId
                  ? `// Google Ads remarketing tag. Conversions are
              // imported from GA4 via the GA4 → Ads link (see
              // Google Ads admin → Tools → Conversions → "Deen
              // Relief (web) purchase" — source GA4). This
              // config call exists so:
              //   - Ads's "tag detected" diagnostic stops
              //     complaining
              //   - Remarketing audiences can be built from
              //     site traffic
              //   - Direct conversion tracking is wired and
              //     ready if we later add gtag('event',
              //     'conversion', { send_to: 'AW-.../label' })
              //     for a specific Ads-sourced conversion action
              gtag('config', '${googleAdsId}');`
                  : ""
              }
            `}
          </Script>
        </>
      )}
    </>
  );
}
