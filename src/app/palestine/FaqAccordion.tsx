"use client";

import Link from "next/link";
import { useState } from "react";
import { trackFaqExpanded, type DonationCampaign } from "@/lib/analytics";

interface FaqLink {
  href: string;
  label: string;
}

interface Faq {
  question: string;
  answer: string;
  /** Optional in-answer CTA rendered below the answer text. */
  links?: FaqLink[];
}

export default function FaqAccordion({
  faqs,
  causePage,
}: {
  faqs: Faq[];
  /** When set, every FAQ open fires `faq_expanded` for analytics. */
  causePage?: DonationCampaign;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    const willOpen = openFaq !== index;
    setOpenFaq(willOpen ? index : null);
    // Fire only on the open transition — closing isn't an engagement signal.
    if (willOpen && causePage) {
      trackFaqExpanded({ causePage, faqIndex: index });
    }
  };

  return (
    <div className="divide-y divide-charcoal/5">
      {faqs.map((faq, index) => (
        <div key={index}>
          <button
            onClick={() => handleToggle(index)}
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
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
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
                      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
