"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Small "← Back to contact" pill that renders only when the
 * current URL has `?from=contact`.
 *
 * Mounted at the top of /bazaar/shipping, /bazaar/returns, and
 * /bazaar/sizing-guide — the three "deflect" pages that the
 * contact page links to with `?from=contact` appended. A visitor
 * arriving from anywhere else (bazaar nav, footer, a social
 * link) sees nothing extra and gets the page as it always was.
 *
 * Why conditional rather than always-on: a permanent "back to
 * contact" link on shipping/returns would be confusing for the
 * 95% of visitors who didn't come from the contact page.
 *
 * Must be wrapped in <Suspense> by the parent — useSearchParams
 * needs a boundary on prerendered pages.
 */
export default function BackToContactLink() {
  const searchParams = useSearchParams();
  if (searchParams.get("from") !== "contact") return null;

  return (
    <Link
      href="/bazaar/contact"
      // `flex w-fit` instead of `inline-flex`: forces the link
      // onto its own line so the gold "Returns" / "Shipping"
      // kicker that follows it doesn't sit alongside it, while
      // `w-fit` keeps the hover area tight to the text rather
      // than spanning the column.
      className="flex w-fit items-center gap-1.5 mb-4 text-xs font-semibold text-charcoal/60 hover:text-charcoal transition-colors group"
    >
      <svg
        className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
        />
      </svg>
      <span className="uppercase tracking-[0.1em]">
        Back to contact
      </span>
    </Link>
  );
}
