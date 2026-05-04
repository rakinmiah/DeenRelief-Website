"use client";

/**
 * Final-CTA picker for Qurbani.
 *
 * Unlike Palestine/Zakat where this re-presents the full picker on dark
 * background, the Qurbani product picker has 10 options across 4 country
 * groupings — duplicating that picker at the page bottom would be visual
 * noise. Instead this hands the donor back to the canonical picker above,
 * preserving "the form is the form" hierarchy.
 *
 * Trust signal + scroll-back CTA. No state.
 */

export default function MiniDonationPicker() {
  return (
    <div className="max-w-md mx-auto">
      <p className="text-amber text-xs font-semibold mb-5">
        Trusted by 3,200+ donors since 2013
      </p>

      <a
        href="#donate-form"
        className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber text-charcoal hover:bg-amber-dark font-semibold shadow-sm text-base transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Choose Your Qurbani
      </a>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/45 font-medium">
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <span>Secure checkout · Apple Pay · Google Pay · Card</span>
      </div>
    </div>
  );
}
