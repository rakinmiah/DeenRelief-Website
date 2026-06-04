"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scanStorageOrphansAction, type ScanResult } from "./actions";

/**
 * "Scan Supabase Storage" button — finds files in the bucket that
 * have no media_library row, runs Claude Vision on each, creates
 * the rows. Lets the SMM bulk-upload via Supabase Dashboard then
 * reconcile in one click.
 *
 * Batch-limited server-side (20 per scan) to fit inside Vercel
 * function timeouts. The result panel shows whether more remain;
 * the SMM clicks again until done.
 */
export default function ScanStorageButton() {
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleScan() {
    setError(null);
    startTransition(async () => {
      const res = await scanStorageOrphansAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      // Refresh the grid so newly-created rows show immediately.
      router.refresh();
    });
  }

  return (
    <div className="bg-amber-light/30 border border-amber/20 rounded-2xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-charcoal font-semibold text-[14px] mb-1">
            Find untagged photos
          </p>
          <p className="text-charcoal/70 text-[13px] leading-relaxed max-w-2xl">
            Find any photos you uploaded straight to storage that
            aren&apos;t in your library yet, and tag them automatically.
            Up to 20 at a time — click again to keep going.
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={pending}
          className="shrink-0 px-5 py-2.5 rounded-full bg-amber-dark text-white text-sm font-semibold hover:bg-amber-dark/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Scanning…" : "Scan Storage"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {result && !pending && (
        <div className="mt-4 pt-4 border-t border-amber/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
            <Stat label="In storage" value={result.totalInStorage} />
            <Stat label="Already tagged" value={result.alreadyInLibrary} />
            <Stat
              label="New photos"
              value={result.orphansFound}
              accent={result.orphansFound > 0}
            />
            <Stat
              label="This batch"
              value={result.orphansProcessed}
              accent={result.orphansProcessed > 0}
            />
          </div>
          <p className="text-[13px] text-charcoal/85">
            {result.orphansProcessed === 0 ? (
              <>Everything in storage is already in your library — nothing to do. 🤍</>
            ) : (
              <>
                Tagged <strong>{result.tagged}</strong> automatically
                {result.taggingFailed > 0 && (
                  <>
                    {" "}
                    · <strong className="text-red-700">{result.taggingFailed}</strong>{" "}
                    we couldn&apos;t tag (added with empty tags — add them
                    yourself)
                  </>
                )}
                {result.moreToProcess && (
                  <>
                    {" "}
                    ·{" "}
                    <strong>
                      {result.orphansFound - result.orphansProcessed} more
                    </strong>{" "}
                    waiting — click again to keep going.
                  </>
                )}
              </>
            )}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-[12px] font-semibold text-red-700 cursor-pointer">
                {result.errors.length} error{result.errors.length === 1 ? "" : "s"} (click to expand)
              </summary>
              <ul className="mt-2 text-[11px] text-charcoal/70 font-mono space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-xl px-3 py-2">
      <span
        className={`block text-2xl font-heading font-bold tracking-tight ${accent ? "text-amber-dark" : "text-charcoal"}`}
      >
        {value}
      </span>
      <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/55 mt-0.5">
        {label}
      </span>
    </div>
  );
}
