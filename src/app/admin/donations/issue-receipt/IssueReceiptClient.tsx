"use client";

import { useState } from "react";
import { issueManualReceiptAction } from "./actions";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.08em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  amountGbp: "",
  donationDate: "",
  campaign: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
};

export default function IssueReceiptClient({
  campaigns,
}: {
  campaigns: { slug: string; label: string }[];
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; email: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await issueManualReceiptAction(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't send the receipt.");
      return;
    }
    setSent({ reference: result.reference ?? "", email: form.email });
  }

  if (sent) {
    return (
      <div className="bg-white border border-green/30 rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="font-heading font-bold text-xl text-charcoal">Receipt sent</h2>
        <p className="text-grey text-sm mt-2">
          Receipt <span className="font-mono text-charcoal">{sent.reference}</span> was
          emailed to <span className="text-charcoal">{sent.email}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY });
            setSent(null);
          }}
          className="mt-5 px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-cream transition-colors"
        >
          Issue another
        </button>
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="firstName">First name</label>
          <input id="firstName" className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="lastName">Last name</label>
          <input id="lastName" className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="email">Donor email (where the receipt is sent)</label>
        <input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls} htmlFor="amount">Amount (£)</label>
          <input id="amount" type="number" min="1" step="0.01" inputMode="decimal" className={inputCls} value={form.amountGbp} onChange={(e) => set("amountGbp", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="donationDate">Date donated</label>
          <input id="donationDate" type="date" className={inputCls} value={form.donationDate} onChange={(e) => set("donationDate", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="campaign">Cause</label>
          <select id="campaign" className={inputCls} value={form.campaign} onChange={(e) => set("campaign", e.target.value)} required>
            <option value="">Select…</option>
            {campaigns.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <details className="rounded-xl bg-cream border border-charcoal/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-charcoal/80">
          Donor address (optional — include it for a Gift-Aid-grade receipt)
        </summary>
        <div className="mt-4 space-y-4">
          <input className={inputCls} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Address line 1" />
          <input className={inputCls} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Address line 2 (optional)" />
          <div className="grid sm:grid-cols-2 gap-4">
            <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Town / city" />
            <input className={inputCls} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} placeholder="Postcode" />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3.5 rounded-full bg-charcoal text-white font-semibold hover:bg-charcoal/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-wait"
      >
        {submitting ? "Sending…" : "Send receipt"}
      </button>
    </form>
  );
}
