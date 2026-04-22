import Script from "next/script";
import { CONSENT_COOKIE, CONSENT_VERSION } from "@/lib/consent";

/**
 * Google Consent Mode v2 bootstrap + conditional GA4 loader.
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
 * Consent mode ships even without GA4. The cookie layer is the legal
 * obligation; GA4 is a separate add-on the env var controls.
 */
export default function ConsentBootstrap() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

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
              gtag('js', new Date());
              gtag('config', '${measurementId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}
    </>
  );
}
