"use client";

import { useState, useTransition } from "react";
import { archiveShortLink, restoreShortLink } from "./actions";

/**
 * Per-row actions for the short links list — Copy URL + Archive/Restore.
 *
 * Lives as a tiny client component so the rest of the list page can
 * remain server-rendered for fast initial load.
 */
export default function LinkRowActions({
  id,
  shortUrl,
  archived,
}: {
  id: string;
  shortUrl: string;
  archived: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Some browsers (esp. without HTTPS) block clipboard. Fall back to
      // a manual prompt — clunky but never breaks.
      prompt("Copy this URL:", shortUrl);
    }
  }

  function handleArchiveToggle() {
    setError(null);
    startTransition(async () => {
      const result = archived
        ? await restoreShortLink(id)
        : await archiveShortLink(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="px-2.5 py-1.5 rounded-md text-[12px] font-medium text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
        title="Copy short URL"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        type="button"
        onClick={handleArchiveToggle}
        disabled={pending}
        className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50 ${
          archived
            ? "text-green-dark hover:bg-green-light/40"
            : "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5"
        }`}
      >
        {pending ? "…" : archived ? "Restore" : "Archive"}
      </button>
      {error && (
        <span className="text-[11px] text-red-600 ml-1" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
