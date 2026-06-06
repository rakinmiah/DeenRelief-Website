"use client";

import { useState, useTransition } from "react";
import {
  dismissEventAction,
  draftLaunchPacketAction,
  launchAppealAction,
  markEventReviewedAction,
} from "./actions";

type ActionKind = "draft" | "launch" | "review" | "dismiss";

/**
 * Per-event action buttons.
 *
 * Two-stage Launch button: first click reveals a confirm panel; second
 * click actually fires the orchestrator. Other actions fire immediately
 * — Draft is cheap and Redraft is reversible; Review/Dismiss are
 * trivial to undo.
 */
export default function EventControls({
  eventId,
  hasDraft,
  status,
  alreadyLaunched,
}: {
  eventId: string;
  hasDraft: boolean;
  status: "detected" | "reviewed" | "launched" | "dismissed";
  alreadyLaunched: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [confirmingLaunch, setConfirmingLaunch] = useState(false);

  function run(
    kind: ActionKind,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setError(null);
    setAction(kind);
    startTransition(async () => {
      const result = await fn();
      setAction(null);
      if (!result.ok) setError(result.error ?? "Action failed.");
      else if (kind === "launch") setConfirmingLaunch(false);
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

      {/* ─── Launch confirmation panel ─── */}
      {confirmingLaunch && !alreadyLaunched && (
        <div className="px-4 py-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-charcoal font-semibold text-[14px] mb-1">
            Activate /now spotlight for this appeal?
          </p>
          <p className="text-charcoal/70 text-[13px] mb-3 leading-relaxed">
            This will <strong>only</strong>: point{" "}
            <span className="font-mono">deenrelief.org/now</span> at the
            matched campaign page for 7 days, push an admin alert, and
            mark this event{" "}
            <span className="font-bold">launched</span>. The site banner
            and homepage featured campaign are <strong>not</strong>{" "}
            touched — flip those manually in Campaign Command Center if
            you want them changed too.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                run("launch", () => launchAppealAction(eventId))
              }
              disabled={pending}
              className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending && action === "launch" ? "Launching…" : "Yes, launch now"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingLaunch(false)}
              disabled={pending}
              className="px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* ─── Draft / redraft ─── */}
        <button
          type="button"
          onClick={() =>
            run("draft", () => draftLaunchPacketAction(eventId))
          }
          disabled={pending || alreadyLaunched}
          className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending && action === "draft"
            ? "Drafting…"
            : hasDraft
              ? "Redraft packet"
              : "Draft launch packet"}
        </button>

        {/* ─── Launch ─── */}
        {!alreadyLaunched && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (!hasDraft) {
                setError("Draft the launch packet before launching the appeal.");
                return;
              }
              setConfirmingLaunch(true);
            }}
            disabled={pending}
            className="px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              hasDraft
                ? "Activates /now spotlight to the matched campaign + admin push. Does NOT change the site banner or featured campaign."
                : "Draft the packet first"
            }
          >
            🚀 Launch appeal
          </button>
        )}

        {/* ─── Review (only when still 'detected') ─── */}
        {status === "detected" && !alreadyLaunched && (
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

        {/* ─── Dismiss ─── */}
        {status !== "dismissed" && !alreadyLaunched && (
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
        Drafting writes a full launch packet in the Deen Relief brand
        voice. <span className="font-semibold text-charcoal/70">Launching</span>{" "}
        activates the <span className="font-mono">/now</span> spotlight
        (bio-link redirect) for 7 days + fires an admin push. The site
        banner and featured campaign are controlled separately in
        Campaign Command Center.
      </p>
    </div>
  );
}
