"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";

/**
 * Bazaar contact form — the only client component on
 * /bazaar/contact. Reads the optional `?order=…` query param to
 * pre-fill the order-number field (links from the order
 * confirmation email use this so the customer doesn't have to
 * dig the reference out themselves).
 *
 * Posts to /api/contact with `source: "bazaar"`. The receiver
 * prefixes the subject with [Bazaar] for inbox triage and
 * includes the order number in the email body when present.
 *
 * The reason dropdown stamps the subject line — that's what
 * makes the inbox triage useful (the trustee scanning subjects
 * sees "[Bazaar] Contact: Returns & refunds" instead of a
 * generic enquiry).
 *
 * ── Draft persistence ──
 * Every change is written to localStorage under DRAFT_KEY so a
 * customer who clicks "Returns policy" to check the rules
 * mid-message returns to a populated form, not a blank one. The
 * draft is cleared on successful submit and has a 24-hour TTL —
 * anything older is treated as abandoned and discarded silently
 * on mount. A small "Saved draft restored — Discard" line shows
 * when restoration actually happened so the user knows what
 * they're looking at and has a one-click escape.
 */

const REASONS = [
  "Order status",
  "Returns & refunds",
  "Damaged or wrong item",
  "Sizing question",
  "Product or stock question",
  "Wholesale / bulk order",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

const DRAFT_KEY = "deenrelief_bazaar_contact_draft_v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftPayload {
  /** epoch ms when the draft was last written */
  savedAt: number;
  name: string;
  email: string;
  orderNumber: string;
  reason: string;
  message: string;
}

function loadDraft(): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftPayload>;
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return {
      savedAt: parsed.savedAt,
      name: parsed.name ?? "",
      email: parsed.email ?? "",
      orderNumber: parsed.orderNumber ?? "",
      reason: parsed.reason ?? "",
      message: parsed.message ?? "",
    };
  } catch {
    // Corrupt JSON, storage disabled, private mode → treat as no draft
    return null;
  }
}

function isDraftMeaningful(d: Omit<DraftPayload, "savedAt">): boolean {
  return Boolean(
    d.name.trim() ||
      d.email.trim() ||
      d.orderNumber.trim() ||
      d.reason ||
      d.message.trim()
  );
}

function saveDraft(d: Omit<DraftPayload, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    // Don't write empty drafts — avoids creating a phantom entry on
    // first paint, and means "clear all fields" naturally evicts it.
    if (!isDraftMeaningful(d)) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...d, savedAt: Date.now() })
    );
  } catch {
    // Quota exceeded / disabled storage → silently skip; the form
    // still works, the user just doesn't get the draft feature.
  }
}

function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function BazaarContactForm() {
  const searchParams = useSearchParams();
  const orderFromUrl = searchParams.get("order") ?? "";

  const [formState, setFormState] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [reason, setReason] = useState<Reason | "">("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Once we've finished restoring (or decided not to) we flip this so
  // the save effect can start writing. Without the gate, the first
  // render's empty state would overwrite the stored draft before the
  // restore-from-storage useEffect runs.
  const [hydrated, setHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Mount: load draft (preferred) OR fall back to URL order param.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setName(draft.name);
      setEmail(draft.email);
      // Draft order number wins over URL — if the user was already
      // typing about one order, don't overwrite with whatever they
      // happen to be clicking now.
      setOrderNumber(draft.orderNumber || orderFromUrl);
      if ((REASONS as readonly string[]).includes(draft.reason)) {
        setReason(draft.reason as Reason);
      }
      setMessage(draft.message);
      if (isDraftMeaningful(draft)) setDraftRestored(true);
    } else if (orderFromUrl) {
      setOrderNumber(orderFromUrl);
    }
    setHydrated(true);
    // We intentionally read orderFromUrl once at mount and don't
    // re-run if it changes — re-running would re-restore the draft
    // and fight whatever the user has since typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ name, email, orderNumber, reason, message });
  }, [hydrated, name, email, orderNumber, reason, message]);

  function handleDiscardDraft() {
    clearDraft();
    setName("");
    setEmail("");
    setOrderNumber(orderFromUrl);
    setReason("");
    setMessage("");
    setDraftRestored(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !reason || !message) return;
    setErrorMessage(null);
    setFormState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject: reason,
          message,
          source: "bazaar",
          orderNumber: orderNumber || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Send failed");
      }
      // Success — wipe the draft so the next visit starts fresh.
      clearDraft();
      setFormState("submitted");
      setName("");
      setEmail("");
      setOrderNumber("");
      setReason("");
      setMessage("");
      setDraftRestored(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setFormState("error");
    }
  }

  if (formState === "submitted") {
    return (
      <div className="bg-cream rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h3 className="font-heading font-bold text-lg text-charcoal mb-2">
          Message sent
        </h3>
        <p className="text-grey text-sm leading-relaxed max-w-sm mx-auto">
          We&apos;ll reply within one working day. Check your spam
          folder if you don&apos;t see anything from{" "}
          <span className="font-medium text-charcoal">
            {BAZAAR_SUPPORT_EMAIL}
          </span>{" "}
          by then.
        </p>
      </div>
    );
  }

  return (
    <>
      {draftRestored && (
        <div className="mb-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-green/8 border border-green/25 text-[13px] text-green-dark">
          <span className="inline-flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            We picked up where you left off.
          </span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-charcoal/55 hover:text-charcoal font-semibold underline decoration-charcoal/20 hover:decoration-charcoal/50 transition-colors"
          >
            Start over
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-cream rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="bazaar-contact-name"
              className="block text-sm font-semibold text-charcoal mb-2"
            >
              Name
            </label>
            <input
              id="bazaar-contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
            />
          </div>
          <div>
            <label
              htmlFor="bazaar-contact-email"
              className="block text-sm font-semibold text-charcoal mb-2"
            >
              Email
            </label>
            <input
              id="bazaar-contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bazaar-contact-reason"
            className="block text-sm font-semibold text-charcoal mb-2"
          >
            What&apos;s this about?
          </label>
          <select
            id="bazaar-contact-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value as Reason | "")}
            className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal focus:outline-none focus:border-green/40 transition-colors duration-200 appearance-none bg-no-repeat bg-right pr-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231F2937' stroke-width='2'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3e%3c/svg%3e\")",
              backgroundSize: "1.25rem",
              backgroundPosition: "right 1rem center",
            }}
          >
            <option value="" disabled>
              Pick a reason…
            </option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="bazaar-contact-order"
            className="block text-sm font-semibold text-charcoal mb-2"
          >
            Order number{" "}
            <span className="text-charcoal/40 font-normal">
              (if relevant)
            </span>
          </label>
          <input
            id="bazaar-contact-order"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="DRB-1234"
            className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200 font-mono text-[15px]"
          />
          <p className="text-xs text-charcoal/50 mt-1.5">
            You&apos;ll find this in the subject line of your order
            confirmation email.
          </p>
        </div>

        <div>
          <label
            htmlFor="bazaar-contact-message"
            className="block text-sm font-semibold text-charcoal mb-2"
          >
            Message
          </label>
          <textarea
            id="bazaar-contact-message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's going on. For sizing or fit questions, your height and usual size in a brand you know fits helps us help you."
            className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200 resize-none"
          />
        </div>

        {formState === "error" && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {errorMessage ??
              `Something went wrong. Please try again or email ${BAZAAR_SUPPORT_EMAIL} directly.`}
          </p>
        )}

        <button
          type="submit"
          disabled={formState === "submitting"}
          className={`w-full py-3 rounded-full bg-green text-white font-semibold text-sm hover:bg-green-dark transition-colors duration-200 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${
            formState === "submitting" ? "opacity-75 pointer-events-none" : ""
          }`}
        >
          {formState === "submitting" ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending…
            </span>
          ) : (
            "Send message"
          )}
        </button>

        {hydrated && !draftRestored && isDraftMeaningful({
          name,
          email,
          orderNumber,
          reason,
          message,
        }) && (
          <p className="text-[11px] text-charcoal/35 text-center -mt-1">
            Saved locally so you can leave and come back.
          </p>
        )}
      </form>
    </>
  );
}
