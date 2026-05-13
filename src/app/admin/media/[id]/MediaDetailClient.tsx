"use client";

import { useState, useTransition } from "react";
import {
  deleteMediaAction,
  updateMediaMetadataAction,
} from "../actions";

/**
 * Right-column controls for the media detail page:
 *   - Copy public URL button (writes to clipboard)
 *   - Edit description / tags form
 *   - Delete this file (typed DELETE confirm)
 */
export default function MediaDetailClient({
  mediaId,
  publicUrl,
  filename,
  initialDescription,
  initialTags,
}: {
  mediaId: string;
  publicUrl: string;
  filename: string;
  initialDescription: string;
  initialTags: string[];
}) {
  const [description, setDescription] = useState(initialDescription);
  const [tagsRaw, setTagsRaw] = useState(initialTags.join(", "));
  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedRecently, setCopiedRecently] = useState(false);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch {
      // Fallback: silently fail — the URL is right there in the
      // input below, the trustee can copy manually.
    }
  }

  function handleSaveMetadata() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await updateMediaMetadataAction(
        mediaId,
        description,
        tagsRaw
      );
      if (result.ok) {
        setInfo("Saved.");
      } else {
        setError(result.error ?? "Couldn't save.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMediaAction(mediaId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Public URL + copy + download */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
          Public URL
        </span>
        <input
          type="text"
          value={publicUrl}
          readOnly
          className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-cream/50 text-charcoal/80 text-[12px] font-mono select-all"
          onClick={(e) => e.currentTarget.select()}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex-1 px-3 py-2 rounded-full bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors"
          >
            {copiedRecently ? "Copied ✓" : "Copy URL"}
          </button>
          <a
            href={publicUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-xs font-semibold text-center hover:bg-cream transition-colors"
          >
            Download
          </a>
        </div>
      </div>

      {/* Metadata editor */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
          Edit details
        </span>
        <div>
          <label
            htmlFor="media-description"
            className="block text-[11px] font-semibold text-charcoal/70 mb-1"
          >
            Description
          </label>
          <textarea
            id="media-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Annual report 2026 cover photo, taken in Sylhet"
            className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-green/40 resize-y"
          />
        </div>
        <div>
          <label
            htmlFor="media-tags"
            className="block text-[11px] font-semibold text-charcoal/70 mb-1"
          >
            Tags <span className="font-normal text-charcoal/40">(comma-separated)</span>
          </label>
          <input
            id="media-tags"
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g. sylhet, makers, marketing"
            className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-green/40"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveMetadata}
          disabled={isPending}
          className="w-full px-3 py-2 rounded-full bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save details"}
        </button>
      </div>

      {info && (
        <p className="text-sm text-green-dark bg-green/10 border border-green/30 rounded-lg px-4 py-2.5">
          {info}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Delete */}
      <div className="bg-white border border-red-200 rounded-2xl p-5">
        <p className="text-charcoal font-semibold text-sm mb-1">Danger zone</p>
        <p className="text-charcoal/60 text-[12px] mb-3 leading-relaxed">
          Permanently delete this file from storage and the library.
          The audit log keeps a record of the deletion.
        </p>
        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            Delete this file…
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setArmed(false);
                  setTyped("");
                }}
                disabled={isPending}
                className="flex-1 px-3 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal text-xs font-medium hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending || typed !== "DELETE"}
                className="flex-1 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
