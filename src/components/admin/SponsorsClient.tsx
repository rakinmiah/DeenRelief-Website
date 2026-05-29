"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inviteSponsorAction } from "@/app/admin/sponsorship/actions";
import type { SponsorProfile, SponsorStatus } from "@/lib/sponsorship-admin";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

const STATUS_STYLE: Record<SponsorStatus, string> = {
  invited: "bg-amber-light text-amber-dark",
  active: "bg-green-light text-green",
  suspended: "bg-red-50 text-red-600",
  closed: "bg-grey-light text-grey",
};

export default function SponsorsClient({
  sponsors,
  orphans,
}: {
  sponsors: SponsorProfile[];
  orphans: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [orphanId, setOrphanId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const result = await inviteSponsorAction({
      email,
      fullName,
      stripeCustomerId: stripeCustomerId.trim() || undefined,
      orphanId: orphanId || undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      setMsg({ ok: true, text: "Invite sent." });
      setEmail("");
      setFullName("");
      setStripeCustomerId("");
      setOrphanId("");
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't send invite." });
    }
  }

  return (
    <div className="space-y-7">
      <form
        onSubmit={handleInvite}
        className="rounded-xl border border-charcoal/10 bg-white p-5 space-y-4"
      >
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey">
          Invite a sponsor
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="inv-name">
              Full name
            </label>
            <input
              id="inv-name"
              className={inputCls}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-email">
              Email
            </label>
            <input
              id="inv-email"
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="inv-stripe">
              Stripe customer ID (optional)
            </label>
            <input
              id="inv-stripe"
              className={inputCls}
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_…"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-orphan">
              Link to child (optional)
            </label>
            <select
              id="inv-orphan"
              className={inputCls}
              value={orphanId}
              onChange={(e) => setOrphanId(e.target.value)}
            >
              <option value="">— Link later —</option>
              {orphans.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send invite"}
          </button>
          {msg && (
            <span
              className={`text-sm ${msg.ok ? "text-green" : "text-red-600"}`}
              role="status"
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey mb-2">
          All sponsors ({sponsors.length})
        </h2>
        {sponsors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-grey text-sm">
            No sponsors yet.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {sponsors.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sponsorship/sponsors/${s.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-cream transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">
                    {s.fullName || s.contactEmail}
                  </p>
                  <p className="text-xs text-grey/70 truncate">
                    {s.contactEmail}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full ${STATUS_STYLE[s.status]}`}
                >
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
