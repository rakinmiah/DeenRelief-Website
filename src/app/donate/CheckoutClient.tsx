"use client";

/**
 * Donation checkout — client component.
 *
 * Flow:
 *   1. On mount, POST /api/donations/create-intent with the seeded amount
 *      and campaign. Receive a PaymentIntent clientSecret.
 *   2. Mount Stripe <Elements> with that clientSecret. The PaymentElement
 *      auto-detects Apple Pay / Google Pay / card based on the browser.
 *   3. User fills donor details (name, email, address, postcode).
 *   4. On submit:
 *      a. POST /api/donations/confirm to store donor + pending donation.
 *      b. Call stripe.confirmPayment() which redirects to return_url on success.
 *      c. The webhook asynchronously flips status to succeeded.
 *   5. If the user changes the amount mid-flow, we create a new PaymentIntent.
 *
 * Gift Aid: an optional checkbox collects an HMRC declaration. The verbatim
 * declaration text (built from src/lib/gift-aid.ts) is sent alongside the
 * donor details and stored as an audit record for HMRC.
 *
 * Monthly subscriptions land in a later phase.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { CampaignSlug } from "@/lib/campaigns";
import {
  GIFT_AID_SCOPE,
  buildDeclarationText,
  totalWithGiftAidGbp,
} from "@/lib/gift-aid";

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

interface Props {
  initialCampaign: CampaignSlug | "general";
  campaignLabel: string;
  initialAmountGbp: number;
  initialFrequency: "one-time" | "monthly";
}

export default function CheckoutClient({
  initialCampaign,
  campaignLabel,
  initialAmountGbp,
  initialFrequency,
}: Props) {
  const [amountGbp, setAmountGbp] = useState<number>(initialAmountGbp);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState<boolean>(true);

  const createIntent = useCallback(async (gbp: number) => {
    setIntentLoading(true);
    setIntentError(null);
    try {
      const res = await fetch("/api/donations/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: initialCampaign,
          amount: Math.round(gbp * 100),
          frequency: initialFrequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment.");
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIntentLoading(false);
    }
  }, [initialCampaign, initialFrequency]);

  useEffect(() => {
    createIntent(amountGbp);
    // Intentionally run once on mount. Amount changes re-create via "Update amount" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elementsOptions: StripeElementsOptions | undefined = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#1F6B3A", // green-dark
                colorText: "#1F2937",
                borderRadius: "12px",
                fontFamily: "DM Sans, system-ui, sans-serif",
              },
            },
          }
        : undefined,
    [clientSecret]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 sm:p-10">
      <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
        Secure Checkout
      </span>
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-2">
        Complete Your Donation
      </h1>
      <p className="text-grey mb-6">{campaignLabel}</p>

      {/* Amount summary + inline edit */}
      <AmountBlock
        amountGbp={amountGbp}
        frequency={initialFrequency}
        onUpdate={(next) => {
          setAmountGbp(next);
          createIntent(next);
        }}
      />

      {intentError && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
          {intentError}
          <button
            onClick={() => createIntent(amountGbp)}
            className="ml-2 underline font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {intentLoading && !clientSecret && (
        <div className="mt-6 flex items-center justify-center py-16 text-grey">
          <span className="inline-block w-5 h-5 border-2 border-green border-t-transparent rounded-full animate-spin mr-3" />
          Preparing secure checkout…
        </div>
      )}

      {clientSecret && elementsOptions && (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm
            amountGbp={amountGbp}
            campaign={initialCampaign}
            frequency={initialFrequency}
            paymentIntentId={paymentIntentId}
          />
        </Elements>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-[12px] text-charcoal/40 font-medium">
        <span>Charity No. 1158608</span>
        <span className="text-charcoal/15">|</span>
        <span>Secure payment by Stripe</span>
        <span className="text-charcoal/15">|</span>
        <span>100% to relief</span>
      </div>
    </div>
  );
}

/** Editable amount display — shows current £ + lets user change without full page nav. */
function AmountBlock({
  amountGbp,
  frequency,
  onUpdate,
}: {
  amountGbp: number;
  frequency: "one-time" | "monthly";
  onUpdate: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(amountGbp));

  return (
    <div className="mb-6 p-5 bg-green-light rounded-xl flex items-center justify-between">
      {editing ? (
        <div className="flex items-center gap-2 w-full">
          <span className="text-2xl font-heading font-bold text-charcoal">£</span>
          <input
            type="number"
            min={5}
            max={10000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 text-2xl font-heading font-bold text-charcoal bg-white rounded-lg px-3 py-2 border border-charcoal/10 focus:outline-none focus:border-green"
            autoFocus
          />
          <button
            onClick={() => {
              const n = Math.floor(Number(draft));
              if (n >= 5 && n <= 10000) {
                onUpdate(n);
                setEditing(false);
              }
            }}
            className="px-4 py-2 bg-green text-white text-sm font-semibold rounded-lg hover:bg-green-dark"
          >
            Update
          </button>
        </div>
      ) : (
        <>
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-green/70 mb-0.5">
              Your donation
            </p>
            <p className="text-3xl font-heading font-bold text-charcoal">
              £{amountGbp.toLocaleString()}
              {frequency === "monthly" && (
                <span className="text-base font-medium text-grey"> / month</span>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(String(amountGbp));
              setEditing(true);
            }}
            className="text-sm font-semibold text-green hover:text-green-dark underline"
          >
            Change
          </button>
        </>
      )}
    </div>
  );
}

/** The form inside <Elements> — has access to stripe + elements hooks. */
function CheckoutForm({
  amountGbp,
  campaign,
  frequency,
  paymentIntentId,
}: {
  amountGbp: number;
  campaign: string;
  frequency: "one-time" | "monthly";
  paymentIntentId: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Donor fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");

  // Gift Aid
  const [giftAidEnabled, setGiftAidEnabled] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);
  const declarationText = useMemo(
    () => buildDeclarationText(amountGbp),
    [amountGbp]
  );
  const totalWithGiftAid = useMemo(
    () => totalWithGiftAidGbp(amountGbp),
    [amountGbp]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements || !paymentIntentId) {
      setError("Payment form not ready. Please refresh and try again.");
      return;
    }

    // Client-side validation mirroring the API route
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!addressLine1.trim()) {
      setError("Please enter your address.");
      return;
    }
    if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postcode.trim())) {
      setError("Please enter a valid UK postcode.");
      return;
    }

    setSubmitting(true);

    try {
      // Store donor + pending donation BEFORE confirming payment. If confirm
      // succeeds but the row insert fails, we'd have an orphan charge with
      // no donor record — worse than the reverse.
      const confirmRes = await fetch("/api/donations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          campaign,
          frequency,
          donor: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || undefined,
            city: city.trim() || undefined,
            postcode: postcode.trim().toUpperCase(),
          },
          giftAid: giftAidEnabled
            ? {
                enabled: true,
                scope: GIFT_AID_SCOPE,
                declarationText,
              }
            : { enabled: false },
          marketingConsent: false,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error ?? "Could not save donation.");

      // Now confirm payment with Stripe. On success, Stripe redirects to
      // return_url. On failure, the promise resolves with { error } and we
      // show it inline — no redirect.
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/donate/thank-you`,
          receipt_email: email.trim(),
          payment_method_data: {
            billing_details: {
              name: `${firstName.trim()} ${lastName.trim()}`,
              email: email.trim(),
              address: {
                line1: addressLine1.trim(),
                line2: addressLine2.trim() || undefined,
                city: city.trim() || undefined,
                postal_code: postcode.trim().toUpperCase(),
                country: "GB",
              },
            },
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message ?? "Payment failed. Please try again.");
        setSubmitting(false);
      }
      // On success, Stripe redirects — no need to clear submitting.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* Donor details */}
      <fieldset className="space-y-4">
        <legend className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/60 mb-2">
          Your details
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="First name"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
            required
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
            required
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="House / street"
          value={addressLine1}
          onChange={setAddressLine1}
          autoComplete="address-line1"
          required
        />
        <Field
          label="Flat / apartment (optional)"
          value={addressLine2}
          onChange={setAddressLine2}
          autoComplete="address-line2"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="City (optional)"
            value={city}
            onChange={setCity}
            autoComplete="address-level2"
          />
          <Field
            label="Postcode"
            value={postcode}
            onChange={(v) => setPostcode(v.toUpperCase())}
            autoComplete="postal-code"
            required
          />
        </div>
      </fieldset>

      {/* Gift Aid */}
      <fieldset>
        <legend className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/60 mb-3">
          Gift Aid
        </legend>
        <div
          className={`rounded-xl border transition-colors duration-200 ${
            giftAidEnabled
              ? "border-green/40 bg-green-light/40"
              : "border-charcoal/10 bg-white"
          }`}
        >
          <label className="flex items-start gap-3 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={giftAidEnabled}
              onChange={(e) => setGiftAidEnabled(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-green flex-shrink-0 cursor-pointer"
            />
            <span className="flex-1">
              <span className="block font-semibold text-charcoal text-[15px] leading-snug">
                Boost my donation by 25% at no extra cost
              </span>
              <span className="block text-sm text-grey mt-1 leading-relaxed">
                {giftAidEnabled ? (
                  <>
                    Your donation becomes{" "}
                    <strong className="text-green-dark">
                      £{totalWithGiftAid.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>{" "}
                    with Gift Aid, funded by HMRC — not you.
                  </>
                ) : (
                  <>
                    Tick to add £{(amountGbp * 0.25).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to your gift. UK taxpayers only.
                  </>
                )}
              </span>
            </span>
          </label>

          {giftAidEnabled && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowDeclaration((s) => !s)}
                className="text-xs font-semibold text-green hover:text-green-dark underline"
              >
                {showDeclaration ? "Hide" : "Read"} the full declaration
              </button>
              {showDeclaration && (
                <div className="mt-3 p-4 bg-white border border-charcoal/10 rounded-lg text-[13px] text-charcoal/80 leading-relaxed whitespace-pre-line">
                  {declarationText}
                </div>
              )}
            </div>
          )}
        </div>
      </fieldset>

      {/* Payment */}
      <fieldset>
        <legend className="text-[11px] font-bold tracking-[0.1em] uppercase text-charcoal/60 mb-3">
          Payment
        </legend>
        <div className="p-4 border border-charcoal/10 rounded-xl bg-white">
          <PaymentElement />
        </div>
      </fieldset>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center px-8 py-4 rounded-full bg-green text-white hover:bg-green-dark font-semibold shadow-sm text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing…
          </>
        ) : giftAidEnabled ? (
          <>
            Donate £{amountGbp.toLocaleString()}
            <span className="ml-2 text-white/75 text-sm font-medium">
              (£{totalWithGiftAid.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with Gift Aid)
            </span>
          </>
        ) : (
          `Donate £${amountGbp.toLocaleString()}`
        )}
      </button>

      <p className="text-[11px] text-charcoal/40 text-center leading-relaxed">
        By donating you confirm the payment details above are correct. Your card
        is charged in GBP by Deen Relief (Charity No. 1158608).
      </p>
    </form>
  );
}

/** Basic text input, styled consistently. */
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-charcoal mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 border border-charcoal/10 rounded-xl bg-white focus:outline-none focus:border-green focus:ring-2 focus:ring-green/10 text-base"
      />
    </label>
  );
}
