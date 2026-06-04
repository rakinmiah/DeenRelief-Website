"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { UpsellCard, UpsellCardIcon } from "@/lib/donation-upsell";

/**
 * Confirm-step "add a one-off gift" interstitial for ONE-TIME orphan
 * sponsorships. Shown after the donor presses Pay but BEFORE the charge is
 * processed: picking a card adds its amount to today's gift and proceeds to
 * payment; "No thanks" completes the original gift. The donor has not been
 * charged at this point — the copy says so explicitly.
 *
 * Presentational only. The parent (CheckoutForm) owns the payment side: it
 * bumps the PaymentIntent amount and confirms. Esc / backdrop / X all map to
 * skip, since completing the original gift is the safe default.
 */
export default function UpsellInterstitial({
  cards,
  baseAmountGbp,
  onSelect,
  onSkip,
}: {
  cards: UpsellCard[];
  baseAmountGbp: number;
  onSelect: (card: UpsellCard) => void;
  onSkip: () => void;
}) {
  // Esc → skip (complete the original gift). Lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-heading"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.366 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.98 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.287-3.957z" />
              </svg>
              Make your gift go further
            </span>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Close and complete my donation"
              className="-mt-1 -mr-1 p-1.5 rounded-full text-charcoal/40 hover:text-charcoal hover:bg-grey-light transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 id="upsell-heading" className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-2">
            Add a one-off gift?
          </h2>
          <p className="text-[15px] text-grey leading-relaxed mb-5">
            You haven&apos;t been charged yet. Add one of these to today&apos;s
            £{baseAmountGbp.toLocaleString()} gift, or continue as you are.
          </p>

          <div className="space-y-2.5">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card)}
                className="group w-full flex items-center gap-4 rounded-xl border border-charcoal/10 bg-white p-3 text-left transition-colors duration-200 hover:border-amber hover:bg-amber/[0.05] focus:outline-none focus:ring-2 focus:ring-amber/20"
              >
                <CardThumb card={card} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-charcoal text-[15px] leading-snug">
                    {card.title}
                  </span>
                  <span className="block text-[13px] text-grey leading-snug mt-0.5">
                    {card.description}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-amber-dark font-bold whitespace-nowrap">+£{card.add}</span>
                  <svg className="w-5 h-5 text-amber-dark/40 group-hover:text-amber-dark transition-colors" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                <span className="sr-only">Add £{card.add} for {card.title}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="mt-5 w-full inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-green text-white hover:bg-green-dark font-semibold text-base transition-colors duration-200"
          >
            No thanks — complete my £{baseAmountGbp.toLocaleString()} donation
          </button>
        </div>
      </div>
    </div>
  );
}

/** Card thumbnail — real photo if supplied, else an on-brand illustration. */
function CardThumb({ card }: { card: UpsellCard }) {
  if (card.image) {
    return (
      <Image
        src={card.image}
        alt={card.title}
        width={56}
        height={56}
        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
      />
    );
  }
  return (
    <span className="w-14 h-14 rounded-lg bg-amber/10 flex items-center justify-center flex-shrink-0 text-amber-dark">
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[card.icon]} />
      </svg>
    </span>
  );
}

const ICON_PATHS: Record<UpsellCardIcon, string> = {
  // rectangle-stack (folded blankets)
  blanket:
    "M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122",
  // book-open (lessons)
  book:
    "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  // bowl of food with steam (meals)
  meal:
    "M3 12.75h18a9 9 0 0 1-18 0Zm6.75-8.25c0 1-.75 1.25-.75 2.25s.75 1.25.75 2.25m3-4.5c0 1-.75 1.25-.75 2.25s.75 1.25.75 2.25",
  // academic-cap (school kit)
  schoolkit:
    "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5",
  // user (another child)
  child:
    "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  // droplet (clean water)
  water:
    "M12 21a7.5 7.5 0 0 1-7.5-7.5c0-4.5 7.5-12.75 7.5-12.75S19.5 9 19.5 13.5A7.5 7.5 0 0 1 12 21Z",
  // archive-box (food parcel)
  parcel:
    "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
  // home (family housing)
  home:
    "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  // briefcase (essentials kit)
  kit:
    "M20.25 14.15v4.073a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25V14.15M18 14.25v.008m-12-.008v.008m12-4.5V6a2.25 2.25 0 0 0-2.25-2.25h-7.5A2.25 2.25 0 0 0 6 6v3.75m12 0H6m12 0a2.25 2.25 0 0 1 2.25 2.25v.092a2.25 2.25 0 0 1-1.512 2.124L12 15.75l-6.738-1.534A2.25 2.25 0 0 1 3.75 12.092V12a2.25 2.25 0 0 1 2.25-2.25",
};
