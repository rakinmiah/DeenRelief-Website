"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Blocking disclaimer shown before the checkout form for monthly orphan
 * sponsorships. Orphan care is only meaningful if it's stable — a child's
 * food, schooling and healthcare can't be switched on one month and off the
 * next. So before a donor commits to a recurring sponsorship we ask them to
 * acknowledge (and tick a box) that they intend to keep it going for at least
 * a year. They can still cancel anytime — this sets the ethical
 * expectation, it isn't a contract.
 *
 * The donor must either agree (checkbox + confirm) or take the explicit
 * one-time route. There is no silent dismiss: backdrop clicks and Esc are
 * intentionally inert so the choice is conscious.
 */
export default function MonthlyCommitmentModal({
  oneTimeHref,
  onAgree,
}: {
  /** Where "Give a one-time gift instead" sends the donor. */
  oneTimeHref: string;
  /** Called once the donor ticks the box and confirms. */
  onAgree: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const headingId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while the modal is open and focus the first control.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    checkboxRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={descId}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Before you sponsor
          </span>

          <h2
            id={headingId}
            className="text-2xl sm:text-3xl font-heading font-bold text-charcoal leading-tight mb-4"
          >
            A sponsorship is a promise to a child
          </h2>

          <div id={descId} className="space-y-3 text-[15px] text-grey leading-relaxed">
            <p>
              When you sponsor an orphan, a real child begins to depend on your
              monthly gift for their food, schooling, healthcare and shelter.
              These are needs that can&apos;t be paused.
            </p>
            <p>
              Because of this, we ask sponsors to commit to{" "}
              <strong className="text-charcoal font-semibold">
                at least a full year
              </strong>{" "}
              of giving. A sponsorship that stops suddenly can leave a child
              without supplies they were counting on, and finding replacement
              support takes time.
            </p>
            <p className="text-[13px] text-grey/90">
              You can still cancel at any point if your circumstances change —
              this isn&apos;t a contract. We simply ask that you start only if
              you intend to see it through, so the children in our care have the
              stability they deserve.
            </p>
          </div>

          <label className="flex items-start gap-3 mt-5 p-4 rounded-xl border border-charcoal/10 bg-green-light/40 cursor-pointer">
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-green flex-shrink-0 cursor-pointer"
            />
            <span className="flex-1 text-[14px] text-charcoal leading-snug">
              I understand and intend to keep my sponsorship going for at least
              a year so the child I support has stable, uninterrupted care.
            </span>
          </label>

          <div className="mt-6 flex flex-col gap-3">
            <button
              ref={confirmRef}
              type="button"
              disabled={!checked}
              onClick={onAgree}
              className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-green text-white hover:bg-green-dark font-semibold text-base transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              I agree — continue to sponsor
            </button>
            <a
              href={oneTimeHref}
              className="w-full inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-grey hover:text-charcoal border border-charcoal/15 hover:border-charcoal/30 font-medium text-sm transition-colors duration-200"
            >
              I&apos;d rather give a one-time gift instead
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
