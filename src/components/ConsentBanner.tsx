"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CONSENT_OPEN_EVENT,
  acceptAll,
  applyConsent,
  categoriesToState,
  readConsentCookie,
  rejectAll,
  writeConsentCookie,
  type ConsentState,
} from "@/lib/consent";

type View = "hidden" | "banner" | "settings";

/**
 * Bottom-bar consent notice + granular settings modal.
 *
 * UX contract:
 *   - On first visit, the bottom bar is shown. Accept / Reject / Customise
 *     are equally prominent (ICO requires this — nudge-compliant).
 *   - On later visits with a stored decision, nothing is shown. The
 *     Footer's "Manage cookies" link re-opens the settings modal via a
 *     custom DOM event (CONSENT_OPEN_EVENT).
 *   - Every decision (accept / reject / save prefs) writes the dr_consent
 *     cookie AND fires gtag('consent', 'update', ...) so the current page
 *     view is measured with the correct signals.
 */
export default function ConsentBanner() {
  const [view, setView] = useState<View>("hidden");
  // Two category-level toggles for the settings modal. Persisted to state
  // only while the modal is open; on "Save" we fold them into a full
  // ConsentState and write the cookie.
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  // Initialise the banner state on mount. If the cookie says "already
  // decided", stay hidden — unless the Footer link fires the open event.
  useEffect(() => {
    const existing = readConsentCookie();
    if (!existing) {
      setView("banner");
    } else {
      setAnalytics(existing.analytics_storage);
      setAdvertising(existing.ad_storage);
    }

    const openHandler = () => {
      const cur = readConsentCookie();
      if (cur) {
        setAnalytics(cur.analytics_storage);
        setAdvertising(cur.ad_storage);
      }
      setView("settings");
    };
    window.addEventListener(CONSENT_OPEN_EVENT, openHandler);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openHandler);
  }, []);

  // Shared "commit a decision" flow — write cookie, fire gtag, hide UI.
  const commit = useCallback((next: Omit<ConsentState, "timestamp">) => {
    writeConsentCookie(next);
    const full: ConsentState = { ...next, timestamp: new Date().toISOString() };
    applyConsent(full);
    setView("hidden");
  }, []);

  const handleAcceptAll = useCallback(() => {
    setAnalytics(true);
    setAdvertising(true);
    commit(acceptAll());
  }, [commit]);

  const handleRejectAll = useCallback(() => {
    setAnalytics(false);
    setAdvertising(false);
    commit(rejectAll());
  }, [commit]);

  const handleSavePrefs = useCallback(() => {
    commit(categoriesToState({ analytics, advertising }));
  }, [analytics, advertising, commit]);

  if (view === "hidden") return null;

  return (
    <>
      {view === "banner" && (
        <div
          role="dialog"
          aria-label="Cookie preferences"
          className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
              <div className="flex-1 text-sm text-charcoal/80 leading-relaxed">
                <p className="font-semibold text-charcoal mb-1">We use cookies</p>
                <p>
                  Essential cookies keep the site working. With your permission, we also measure how people use the site and the campaigns that bring them here.{" "}
                  <Link href="/privacy" className="underline underline-offset-2 decoration-charcoal/30 hover:decoration-charcoal">
                    Read our privacy policy
                  </Link>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-4 py-2 rounded-full border border-charcoal/20 text-charcoal hover:bg-charcoal/5 text-sm font-semibold transition-colors duration-200"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-full bg-green text-white hover:bg-green-dark text-sm font-semibold shadow-sm transition-colors duration-200"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => setView("settings")}
                  className="px-3 py-2 text-charcoal/70 hover:text-charcoal text-sm font-semibold underline underline-offset-2 decoration-charcoal/30 hover:decoration-charcoal transition-colors duration-200"
                >
                  Customise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "settings" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cookie settings"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setView("hidden");
          }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-green mb-2">
                    Cookie settings
                  </p>
                  <h2 className="text-2xl font-heading font-bold text-charcoal leading-tight">
                    Choose what you&apos;re comfortable with
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setView("hidden")}
                  aria-label="Close"
                  className="flex-shrink-0 p-1.5 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-charcoal/70 leading-relaxed mb-6">
                You can change these anytime via the &ldquo;Manage cookies&rdquo; link in our footer.
              </p>

              <div className="space-y-4">
                <CategoryRow
                  title="Essential"
                  description="Keeps the site working — checkout, login, anti-abuse protection, and the cookie itself that remembers your choice."
                  checked
                  disabled
                  onChange={() => {}}
                />
                <CategoryRow
                  title="Analytics"
                  description="Helps us see which pages people read and where we can improve. Aggregate only — we never sell your data."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <CategoryRow
                  title="Advertising"
                  description="Lets us measure which campaigns bring donors, and show relevant ads on Google. Required for our Google Ads conversion tracking to work."
                  checked={advertising}
                  onChange={setAdvertising}
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-4 py-2 rounded-full border border-charcoal/20 text-charcoal hover:bg-charcoal/5 text-sm font-semibold transition-colors duration-200"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  className="px-4 py-2 rounded-full border border-green text-green hover:bg-green-light text-sm font-semibold transition-colors duration-200"
                >
                  Save preferences
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-full bg-green text-white hover:bg-green-dark text-sm font-semibold shadow-sm transition-colors duration-200"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors duration-200 ${
        disabled
          ? "border-charcoal/10 bg-charcoal/[0.03] cursor-not-allowed"
          : "border-charcoal/10 hover:border-charcoal/20 cursor-pointer"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-heading font-semibold text-charcoal text-[15px]">
            {title}
          </span>
          {disabled && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-charcoal/40">
              Always on
            </span>
          )}
        </div>
        <p className="text-[13px] text-charcoal/65 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex-shrink-0 pt-0.5">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
            checked ? "bg-green" : "bg-charcoal/20"
          } ${disabled ? "opacity-60" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </label>
  );
}
