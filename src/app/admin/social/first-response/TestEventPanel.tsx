"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearTestEventsAction,
  createTestEventAction,
} from "./test-actions";
import { TEST_SCENARIOS, type TestScenarioId } from "./test-scenarios";
import { displayPriority } from "@/lib/first-response-scoring";

/**
 * Test-scenario panel — collapsed by default so it doesn't clutter
 * the dashboard during real use. Click "Show test tools" to expand.
 *
 * Each scenario uses the real ingester under the hood (same scoring,
 * same coverage matching, same push-notification gate) so what the
 * SMM sees in the dashboard after clicking is identical to what
 * she'd see for a real event of comparable severity.
 */
export default function TestEventPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingScenario, setPendingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    scenario: string;
    score: number | null;
    tier: string;
    eventId: string | null;
  } | null>(null);
  const [clearResult, setClearResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function handleCreate(scenarioId: TestScenarioId) {
    setError(null);
    setPendingScenario(scenarioId);
    startTransition(async () => {
      const result = await createTestEventAction(scenarioId);
      setPendingScenario(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastResult({
        scenario: TEST_SCENARIOS[scenarioId].label,
        score: result.score,
        tier: result.tier,
        eventId: result.eventId,
      });
      setClearResult(null);
      router.refresh();
    });
  }

  function handleClear() {
    if (!confirm("Delete ALL test events from the database? Real alerts are untouched.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await clearTestEventsAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClearResult(result.deleted);
      setLastResult(null);
      router.refresh();
    });
  }

  return (
    <section className="mt-10 mb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] font-bold tracking-[0.18em] uppercase text-charcoal/50 hover:text-charcoal/80 transition-colors"
      >
        {expanded ? "▾ Hide test tools" : "▸ Show test tools"}
      </button>
      {expanded && (
        <div className="mt-3 bg-amber-light/30 border border-amber/25 rounded-2xl p-4 md:p-5">
          <div className="mb-4">
            <p className="text-charcoal font-semibold text-[14px] mb-1">
              Test scenarios — for demos &amp; QA
            </p>
            <p className="text-charcoal/70 text-[13px] leading-relaxed max-w-2xl">
              Create a pretend emergency to try things out or demo. They look
              real but are clearly marked, and you can clear them anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {(Object.keys(TEST_SCENARIOS) as TestScenarioId[]).map((id) => {
              const scenario = TEST_SCENARIOS[id];
              const isPending = pendingScenario === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCreate(id)}
                  disabled={pending}
                  className="text-left bg-white border border-charcoal/15 rounded-xl px-4 py-3 hover:border-charcoal/30 hover:bg-cream/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <p className="text-charcoal font-semibold text-[13px]">
                    {scenario.label}
                  </p>
                  <p className="text-charcoal/65 text-[11px] mt-0.5 leading-snug">
                    {scenario.description}
                  </p>
                  <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-amber-dark mt-1.5">
                    {isPending ? "Creating…" : `→ ${scenario.expectedTier}`}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-amber/30">
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="text-[12px] font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 disabled:opacity-50"
            >
              Clear all test events
            </button>
            {clearResult !== null && (
              <span className="text-[12px] text-charcoal/70">
                Cleared {clearResult} test event{clearResult === 1 ? "" : "s"}.
              </span>
            )}
            {error && (
              <span className="text-[12px] text-red-700">
                {error}
              </span>
            )}
          </div>

          {lastResult && (
            <div className="mt-3 pt-3 border-t border-amber/30">
              <p className="text-[12px] text-charcoal/85 leading-relaxed">
                <strong>Created:</strong> {lastResult.scenario} ·{" "}
                <strong>Priority:</strong>{" "}
                {displayPriority(lastResult.score) ?? "—"}/10{" "}
                · <strong>Alert level:</strong>{" "}
                <span
                  className={`uppercase font-bold tracking-[0.05em] ${
                    lastResult.tier === "critical"
                      ? "text-red-700"
                      : lastResult.tier === "high"
                        ? "text-amber-dark"
                        : "text-charcoal/60"
                  }`}
                >
                  {lastResult.tier}
                </span>
                {lastResult.eventId && (
                  <>
                    {" · "}
                    <Link
                      href={`/admin/social/first-response/${lastResult.eventId}`}
                      className="text-amber-dark hover:text-amber-darker underline underline-offset-2 font-semibold"
                    >
                      Open event →
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
