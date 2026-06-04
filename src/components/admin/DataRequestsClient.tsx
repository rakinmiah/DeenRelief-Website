"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  fulfillExportRequestAction,
  fulfillErasureRequestAction,
} from "@/app/admin/sponsorship/actions";
import type { SponsorDataRequest } from "@/lib/sponsorship-admin";
import { Button, StatusBadge } from "@/components/admin/ui";

function formatWhen(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DataRequestsClient({
  pending,
  handled,
}: {
  pending: SponsorDataRequest[];
  handled: SponsorDataRequest[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleExport(r: SponsorDataRequest) {
    setBusy(r.id);
    setMsg(null);
    const result = await fulfillExportRequestAction(r.id, r.sponsorId);
    setBusy(null);
    if (result.ok) {
      setMsg({ ok: true, text: "Marked as fulfilled." });
      router.refresh();
    } else setMsg({ ok: false, text: result.error ?? "Couldn't update." });
  }

  async function handleErasure(r: SponsorDataRequest) {
    const confirmed = window.confirm(
      `Permanently erase ${r.sponsorEmail ?? "this sponsor"}? This deletes their account and all personal data. It cannot be undone.`
    );
    if (!confirmed) return;
    setBusy(r.id);
    setMsg(null);
    const result = await fulfillErasureRequestAction(r.id, r.sponsorId);
    setBusy(null);
    if (result.ok) {
      setMsg({ ok: true, text: "Sponsor erased." });
      router.refresh();
    } else setMsg({ ok: false, text: result.error ?? "Couldn't erase." });
  }

  return (
    <div className="space-y-7">
      {msg && (
        <div
          className={`rounded-lg px-3.5 py-2.5 text-sm ${
            msg.ok
              ? "bg-green-light text-green"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          role="status"
        >
          {msg.text}
        </div>
      )}

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey mb-2">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-8 text-center text-grey text-sm">
            No pending requests.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">
                    {r.sponsorEmail ?? r.sponsorId}
                  </p>
                  <p className="text-xs text-grey/70">
                    {r.requestType === "erasure" ? "Erasure" : "Export"} ·
                    requested {formatWhen(r.requestedAt)}
                  </p>
                </div>
                {r.requestType === "erasure" ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleErasure(r)}
                    loading={busy === r.id}
                  >
                    Erase
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleExport(r)}
                    loading={busy === r.id}
                  >
                    Mark fulfilled
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-grey/70 hover:text-grey">
            Handled ({handled.length})
          </summary>
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white mt-2 opacity-80">
            {handled.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <p className="text-charcoal flex items-center gap-2 flex-wrap">
                  <span>
                    {r.sponsorEmail ?? r.sponsorId} · {r.requestType}
                  </span>
                  <StatusBadge domain="dataRequest" status={r.status} />
                </p>
                <p className="text-xs text-grey/70">
                  {r.handledByEmail ? `by ${r.handledByEmail} · ` : ""}
                  {r.fulfilledAt ? formatWhen(r.fulfilledAt) : ""}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
