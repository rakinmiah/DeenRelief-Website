"use client";

import { useState, useTransition } from "react";
import {
  dismissEventAction,
  draftLaunchPacketAction,
  markEventReviewedAction,
} from "./actions";

/**
 * Per-event action buttons — drafts the launch packet via Claude, or
 * marks the event reviewed / dismissed. The detail page reloads via
 * revalidatePath after each action so we don't need local state for
 * the packet itself.
 */
export default function EventControls({
  eventId,
  hasDraft,
  status,
}: {
  eventId: string;
  hasDraft: boolean;
  status: "detected" | "reviewed" | "launched" | "dismissed";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"draft" | "review" | "dismiss" | null>(
    null
  );

  function run(
    kind: "draft" | "review" | "dismiss",
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setError(null);
    setAction(kind);
    startTransition(async () => {
      const result = await fn();
      setAction(null);
      if (!result.ok) setError(result.error ?? "Action failed.");
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            run("draft", () => draftLaunchPacketAction(eventId))
          }
          disabled={pending}
          className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending && action === "draft"
            ? "Drafting via Claude…"
            : hasDraft
              ? "Redraft packet"
              : "Draft launch packet"}
        </button>

        {status === "detected" && (
          <button
            type="button"
            onClick={() =>
              run("review", () => markEventReviewedAction(eventId))
            }
            disabled={pending}
            className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-semibold hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending && action === "review" ? "Marking…" : "Mark reviewed"}
          </button>
        )}

        {status !== "dismissed" && status !== "launched" && (
          <button
            type="button"
            onClick={() => run("dismiss", () => dismissEventAction(eventId))}
            disabled={pending}
            className="px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
          >
            {pending && action === "dismiss" ? "Dismissing…" : "Dismiss"}
          </button>
        )}
      </div>
      <p className="text-[12px] text-charcoal/50 leading-snug">
        Drafting calls Claude Opus 4.7 with the Deen Relief brand voice spec.
        Takes ~30–60 seconds. The result is editable — this is a starting
        point, not a finished post.
      </p>
    </div>
  );
}
