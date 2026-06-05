"use client";

/**
 * Per-row delete control for a First Response event. Two-step (click the trash
 * → confirm) so a stray click can't wipe a report. Sits above the row's
 * full-card <Link> overlay via pointer-events-auto + z-10. On success the
 * server action revalidates the page; we also router.refresh() so the row
 * disappears immediately.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEmergencyEventAction } from "./event-actions";

export default function DeleteEventButton({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteEmergencyEventAction(eventId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        title={error}
        className="pointer-events-auto relative z-10 text-[10px] font-semibold text-red-600 hover:underline"
      >
        Delete failed — retry
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="pointer-events-auto relative z-10 inline-flex items-center gap-1.5">
        <span className="text-[10.5px] text-charcoal/55">Delete?</span>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-charcoal/45 hover:text-charcoal"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title="Delete this report"
      aria-label={`Delete report: ${title}`}
      className="pointer-events-auto relative z-10 text-charcoal/30 hover:text-red-600 transition-colors p-1 -m-1"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 11v6M14 11v6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
