"use client";

import Link from "next/link";
import { useState } from "react";
import { trackBazaarFaqExpanded } from "@/lib/analytics";
import type { BazaarFaq, BazaarFaqPage } from "@/lib/bazaar-faqs";

/**
 * Accordion-style FAQ block for the bazaar pages.
 *
 * Matches the donation-funnel FaqAccordion visual pattern so the
 * site reads consistently between charity and shop surfaces.
 * Differences:
 *   - Fires bazaar_faq_expanded GA4 events (not the donation
 *     faq_expanded variant) so analysts can segment commerce FAQ
 *     engagement separately from cause FAQs.
 *   - Accepts a `page` discriminator that travels into the GA4
 *     event so explorers can group "which FAQ on which page".
 *
 * SEO: the calling page also emits a FAQPage JSON-LD block from
 * the same `faqs` array (via buildBazaarFaqSchema). Google
 * cross-checks the schema against visible page content; expand-on-
 * click doesn't violate this — the answers are in the DOM at
 * load time, just visually hidden by max-height.
 */
export default function BazaarFaqAccordion({
  faqs,
  page,
}: {
  faqs: BazaarFaq[];
  page: BazaarFaqPage;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleToggle(index: number, faq: BazaarFaq) {
    const isOpening = openFaq !== index;
    setOpenFaq(isOpening ? index : null);
    if (isOpening) {
      // Fire on OPEN only — closing isn't meaningful for funnel
      // analysis. trackEvent is consent-gated (no-op without
      // analytics_storage), safe to call unconditionally.
      trackBazaarFaqExpanded({
        page,
        faqId: faq.id,
        faqIndex: index,
      });
    }
  }

  return (
    <div className="divide-y divide-charcoal/5">
      {faqs.map((faq, index) => (
        <div key={faq.id}>
          <button
            type="button"
            onClick={() => handleToggle(index, faq)}
            aria-expanded={openFaq === index}
            className="w-full flex items-center justify-between py-5 text-left group"
          >
            <span className="font-heading font-semibold text-[1.0625rem] text-charcoal pr-4 group-hover:text-green transition-colors duration-200">
              {faq.question}
            </span>
            <svg
              className={`w-5 h-5 flex-shrink-0 text-charcoal/30 transition-transform duration-200 ${
                openFaq === index ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
          {openFaq === index && (
            <div className="pb-5">
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] whitespace-pre-line">
                {faq.answer}
              </p>
              {faq.links && faq.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {faq.links.map((link) => {
                    const isExternal = link.href.startsWith("http");
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        {...(isExternal
                          ? {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-green hover:text-green-dark transition-colors duration-200"
                      >
                        {link.label}
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
