"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  linkSponsorshipAction,
  setSponsorshipStatusAction,
  resendActivationAction,
} from "@/app/admin/sponsorship/actions";
import type { SponsorshipStatus, SponsorStatus } from "@/lib/sponsorship-admin";

interface LinkRow {
  id: string;
  orphanLabel: string;
  status: SponsorshipStatus;
  startedOn: string;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

const STATUS_STYLE: Record<SponsorshipStatus, string> = {
  active: "bg-green-light text-green",
  paused: "bg-amber-light text-amber-dark",
  ended: "bg-grey-light text-grey",
};

export default function SponsorDetailClient({
  sponsorId,
  status,
  links,
  orphans,
}: {
  sponsorId: string;
  status: SponsorStatus;
  links: LinkRow[];
  orphans: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [orphanId, setOrphanId] = useState("");
  const [subId, setSubId] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleResend() {
    setResending(true);
    setMsg(null);
    const result = await resendActivationAction(sponsorId);
    setResending(false);
    setMsg(
      result.ok
        ? { ok: true, text: "Activation email re-sent." }
        : { ok: false, text: result.error ?? "Couldn't send." }
    );
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!orphanId) return;
    setBusy(true);
    setMsg(null);
    const result = await linkSponsorshipAction({
      sponsorId,
      orphanId,
      stripeSubscriptionId: subId.trim() || undefined,
    });
    setBusy(false);
    if (result.ok) {
      setOrphanId("");
      setSubId("");
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't link." });
    }
  }

  async function changeStatus(id: string, status: SponsorshipStatus) {
    setBusy(true);
    const result = await setSponsorshipStatusAction(id, status);
    setBusy(false);
    if (result.ok) router.refresh();
    else setMsg({ ok: false, text: result.error ?? "Couldn't update." });
  }

  return (
    <div className="space-y-7">
      <section className="rounded-xl border border-charcoal/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">
              Account activation
            </h2>
            <p className="text-xs text-grey/70 mt-0.5">
              {status === "invited"
                ? "Invited — hasn't set a password yet."
                : status === "active"
                ? "Active. Re-sending sends a fresh set-password link."
                : `Status: ${status}.`}
            </p>
          </div>
          <button
            onClick={handleResend}
            disabled={resending}
            className="px-4 py-2 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors disabled:opacity-60"
          >
            {resending ? "Sending…" : "Resend activation email"}
          </button>
        </div>
        {msg && (
          <p
            className={`mt-3 text-sm ${msg.ok ? "text-green" : "text-red-600"}`}
            role="status"
          >
            {msg.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey mb-2">
          Sponsored children ({links.length})
        </h2>
        {links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-grey text-sm">
            Not linked to any child yet.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">
                    {l.orphanLabel}
                  </p>
                  <p className="text-xs text-grey/70">since {l.startedOn}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full ${STATUS_STYLE[l.status]}`}
                >
                  {l.status}
                </span>
                {l.status !== "ended" && (
                  <div className="flex items-center gap-2">
                    {l.status === "active" ? (
                      <button
                        onClick={() => changeStatus(l.id, "paused")}
                        disabled={busy}
                        className="text-xs text-amber-dark hover:underline disabled:opacity-50"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus(l.id, "active")}
                        disabled={busy}
                        className="text-xs text-green hover:underline disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => changeStatus(l.id, "ended")}
                      disabled={busy}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      End
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <form
        onSubmit={handleLink}
        className="rounded-xl border border-charcoal/10 bg-white p-5 space-y-4"
      >
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey">
          Link to a child
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            className={inputCls}
            value={orphanId}
            onChange={(e) => setOrphanId(e.target.value)}
            required
          >
            <option value="">— Choose a child —</option>
            {orphans.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            placeholder="Stripe subscription ID (optional)"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-lg bg-green text-white text-sm font-semibold hover:bg-green-dark transition-colors disabled:opacity-60"
          >
            Link
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
    </div>
  );
}
