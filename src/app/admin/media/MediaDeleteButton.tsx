"use client";

import { useTransition } from "react";
import { deleteMediaAction } from "./actions";

/**
 * Tiny hover-revealed × button mounted on each tile in the media
 * grid. Native window.confirm() prompt for friction — typing
 * DELETE in a modal is overkill for a single tile, but a one-tap
 * delete with no confirmation is too easy to fat-finger.
 *
 * Stops click + pointer-down propagation so the surrounding Link
 * doesn't navigate to the detail page when the trustee clicks the
 * × itself. We can't make this a child of the Link without
 * nesting <button> inside <a> (invalid HTML), so the grid mounts
 * it as a sibling under a `relative` wrapper.
 *
 * Visibility: invisible by default, fades in on group-hover from
 * the parent tile. On touch devices `group-hover` triggers on tap
 * (iOS Safari), which is fine — a tap reveals + a second tap
 * confirms.
 */
export default function MediaDeleteButton({
  mediaId,
  filename,
}: {
  mediaId: string;
  filename: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Permanently delete "${filename}"?\n\nThis removes the file from Storage and the library. The audit log keeps a record.`
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteMediaAction(mediaId);
      } catch (err) {
        // The action redirects on success — Next throws an internal
        // NEXT_REDIRECT here, which is normal. Other errors are
        // real failures.
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("NEXT_REDIRECT")) {
          window.alert(`Delete failed: ${msg || "unknown error"}`);
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={isPending}
      aria-label={`Delete ${filename}`}
      title="Delete this file"
      className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-red-600 text-white shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <svg
          className="w-3.5 h-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.3"
          />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      )}
    </button>
  );
}
