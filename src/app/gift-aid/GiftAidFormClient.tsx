"use client";

import { useState } from "react";
import { buildDeclarationText } from "@/lib/gift-aid";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.08em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

export default function GiftAidFormClient({
  campaigns,
}: {
  campaigns: { slug: string; label: string }[];
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    campaign: "",
    amountGbp: "",
    donationDate: "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const amountNum = Number(form.amountGbp);
  const declarationAmount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmed) {
      setError("Please tick the box to confirm your Gift Aid declaration.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/gift-aid-declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, confirmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white border border-green/30 rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="font-heading font-bold text-xl text-charcoal">Thank you</h2>
        <p className="text-grey text-sm mt-2 leading-relaxed">
          Your Gift Aid declaration has been received. Our team will confirm
          your donation and reclaim the Gift Aid from HMRC. May Allah reward
          your generosity.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-charcoal/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {error && (
        <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Donation details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="campaign">Cause you donated to</label>
          <select
            id="campaign"
            className={inputCls}
            value={form.campaign}
            onChange={(e) => set("campaign", e.target.value)}
            required
          >
            <option value="">Select a cause…</option>
            {campaigns.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="amount">Amount (£)</label>
          <input
            id="amount"
            type="number"
            min="5"
            step="0.01"
            inputMode="decimal"
            className={inputCls}
            value={form.amountGbp}
            onChange={(e) => set("amountGbp", e.target.value)}
            placeholder="e.g. 100"
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="donationDate">Date you donated</label>
        <input
          id="donationDate"
          type="date"
          className={inputCls}
          value={form.donationDate}
          onChange={(e) => set("donationDate", e.target.value)}
          required
        />
      </div>

      <hr className="border-charcoal/8" />

      {/* Donor identity — required for HMRC Gift Aid */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="fullName">Full name</label>
          <input id="fullName" className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" required />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="phone">Phone (optional)</label>
        <input id="phone" type="tel" className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
      </div>

      <div>
        <label className={labelCls} htmlFor="addressLine1">Home address</label>
        <input id="addressLine1" className={inputCls} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="House number and street" autoComplete="address-line1" required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="city">Town / city (optional)</label>
          <input id="city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
        </div>
        <div>
          <label className={labelCls} htmlFor="postcode">Postcode</label>
          <input id="postcode" className={inputCls} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} autoComplete="postal-code" required />
        </div>
      </div>

      {/* The HMRC declaration */}
      <div className="rounded-xl bg-cream border border-charcoal/10 p-4">
        <p className="text-[13px] text-charcoal/80 leading-relaxed whitespace-pre-line">
          {buildDeclarationText(declarationAmount)}
        </p>
        <label className="mt-4 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-charcoal/30 text-green focus:ring-green/30"
          />
          <span className="text-sm text-charcoal">
            I confirm I am a UK taxpayer and want Deen Relief to claim Gift Aid
            on this donation (and my donations in the past 4 years and future).
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3.5 rounded-full bg-green text-white font-semibold hover:bg-green-dark transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
      >
        {submitting ? "Submitting…" : "Submit Gift Aid declaration"}
      </button>

      <p className="text-[11px] text-charcoal/40 text-center leading-relaxed">
        Deen Relief · Registered charity 1158608. We use your details only to
        reclaim Gift Aid and keep the HMRC-required record.
      </p>
    </form>
  );
}
