"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "../actions";

const labelCls =
  "text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/50";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postcode: string | null;
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5">
      <span className={`${labelCls} sm:w-40 shrink-0`}>{label}</span>
      <span className="text-sm text-charcoal">{value || <span className="text-grey/50">—</span>}</span>
    </div>
  );
}

export default function ProfileClient({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    fullName: initial.fullName,
    phone: initial.phone ?? "",
    line1: initial.address.line1 ?? "",
    line2: initial.address.line2 ?? "",
    city: initial.address.city ?? "",
    postcode: initial.address.postcode ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function cancel() {
    setForm({
      fullName: initial.fullName,
      phone: initial.phone ?? "",
      line1: initial.address.line1 ?? "",
      line2: initial.address.line2 ?? "",
      city: initial.address.city ?? "",
      postcode: initial.address.postcode ?? "",
    });
    setEditing(false);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const result = await updateProfileAction({
      fullName: form.fullName,
      phone: form.phone.trim() || null,
      addressLine1: form.line1.trim() || null,
      addressLine2: form.line2.trim() || null,
      city: form.city.trim() || null,
      postcode: form.postcode.trim() || null,
    });
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't save." });
    }
  }

  const addr = initial.address;
  const addressLines = [addr.line1, addr.line2, [addr.city, addr.postcode].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      {/* Personal details */}
      <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-heading font-bold text-lg text-charcoal">
            Personal details
          </h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-semibold text-green hover:text-green-dark transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {msg && (
          <p
            className={`mb-3 text-sm ${msg.ok ? "text-green" : "text-red-600"}`}
            role="status"
          >
            {msg.text}
          </p>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="pf-name">Full name</label>
              <input id="pf-name" className={`${inputCls} mt-1.5`} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-phone">Phone</label>
              <input id="pf-phone" className={`${inputCls} mt-1.5`} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" />
            </div>
            <Row label="Email" value={<span>{initial.email} <span className="text-grey/60">· contact us to change</span></span>} />
          </div>
        ) : (
          <div className="divide-y divide-charcoal/5">
            <Row label="Full name" value={initial.fullName} />
            <Row label="Email" value={initial.email} />
            <Row label="Phone" value={initial.phone} />
          </div>
        )}
      </section>

      {/* Postal address */}
      <section className="rounded-2xl border border-charcoal/5 bg-white shadow-sm p-6">
        <h2 className="font-heading font-bold text-lg text-charcoal mb-1">
          Postal address
        </h2>
        <p className="text-xs text-grey/70 mb-3">
          We use this to claim Gift Aid on your donations. Keeping it current
          keeps your Gift Aid valid.
        </p>
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="pf-l1">Address line 1</label>
              <input id="pf-l1" className={`${inputCls} mt-1.5`} value={form.line1} onChange={(e) => set("line1", e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-l2">Address line 2</label>
              <input id="pf-l2" className={`${inputCls} mt-1.5`} value={form.line2} onChange={(e) => set("line2", e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="pf-city">City</label>
                <input id="pf-city" className={`${inputCls} mt-1.5`} value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="pf-pc">Postcode</label>
                <input id="pf-pc" className={`${inputCls} mt-1.5`} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-charcoal whitespace-pre-line">
            {addressLines || <span className="text-grey/50">No address on file</span>}
          </p>
        )}
      </section>

      {editing && (
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-full bg-green text-white text-sm font-semibold shadow-sm hover:bg-green-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal/80 text-sm font-medium hover:border-charcoal/30 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
