"use client";

import { useState, useTransition } from "react";
import type { MediaKind } from "@/lib/dr-media";
import {
  deleteMediaAction,
  updateMediaMetadataAction,
} from "../actions";

type DownloadFormat = "original" | "webp" | "jpeg" | "png" | "avif";
type DownloadWidth = "original" | "400" | "800" | "1200" | "2000";

const FORMAT_OPTIONS: { value: DownloadFormat; label: string }[] = [
  { value: "original", label: "Original format" },
  { value: "webp", label: "WebP (smaller, modern)" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG (lossless)" },
  { value: "avif", label: "AVIF (smallest, newest)" },
];

const WIDTH_OPTIONS: { value: DownloadWidth; label: string }[] = [
  { value: "original", label: "Original size" },
  { value: "2000", label: "Large — 2000 px" },
  { value: "1200", label: "Medium — 1200 px" },
  { value: "800", label: "Small — 800 px" },
  { value: "400", label: "Thumbnail — 400 px" },
];

/**
 * Right-column controls for the media detail page:
 *   - Copy public URL button (writes to clipboard)
 *   - Download: for images, format + size picker (originals
 *     preselected); for videos / docs, a single passthrough
 *     download button.
 *   - Edit description / tags form
 *   - Delete this file (typed DELETE confirm)
 *
 * All downloads go through /api/admin/media/[id]/download which
 * forces `Content-Disposition: attachment` so the browser saves the
 * file rather than opening it in a new tab. The Sharp pipeline on
 * that route only kicks in when format/width differ from
 * "original".
 */
export default function MediaDetailClient({
  mediaId,
  publicUrl,
  mediaKind,
  initialDescription,
  initialTags,
}: {
  mediaId: string;
  publicUrl: string;
  mediaKind: MediaKind;
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
  const [format, setFormat] = useState<DownloadFormat>("original");
  const [width, setWidth] = useState<DownloadWidth>("original");

  // Compose the download URL. We only add params when they're
  // non-default — the server will then short-circuit the Sharp
  // pipeline and just stream the original bytes.
  const downloadHref = (() => {
    const params = new URLSearchParams();
    if (format !== "original") params.set("format", format);
    if (width !== "original") params.set("width", width);
    const qs = params.toString();
    return qs
      ? `/api/admin/media/${mediaId}/download?${qs}`
      : `/api/admin/media/${mediaId}/download`;
  })();

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
      {/* Public URL + copy */}
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
        <button
          type="button"
          onClick={handleCopyUrl}
          className="w-full px-3 py-2 rounded-full bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors"
        >
          {copiedRecently ? "Copied ✓" : "Copy URL"}
        </button>
      </div>

      {/* Download — branches by media kind. Images get the
          format + size picker; everything else gets a plain
          one-click download (any re-encoding is server-side
          re-encoding we don't support for video/PDF/docs). */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
          Download
        </span>
        {mediaKind === "image" ? (
          <>
            <div>
              <label
                htmlFor="download-format"
                className="block text-[11px] font-semibold text-charcoal/70 mb-1"
              >
                Format
              </label>
              <select
                id="download-format"
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as DownloadFormat)
                }
                className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-green/40"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="download-width"
                className="block text-[11px] font-semibold text-charcoal/70 mb-1"
              >
                Size
              </label>
              <select
                id="download-width"
                value={width}
                onChange={(e) =>
                  setWidth(e.target.value as DownloadWidth)
                }
                className="w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-green/40"
              >
                {WIDTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-charcoal/40 leading-relaxed">
                Resizes proportionally to the long side — never
                upscales. Original cap stays in place if the
                photo is already smaller.
              </p>
            </div>
            <a
              href={downloadHref}
              className="block w-full px-3 py-2 rounded-full bg-green text-white text-xs font-semibold text-center hover:bg-green-dark transition-colors"
            >
              Download
              {format !== "original" || width !== "original"
                ? ` (${format !== "original" ? format.toUpperCase() : "original"}${
                    width !== "original" ? ` · ${width}px` : ""
                  })`
                : ""}
            </a>
          </>
        ) : (
          <>
            <p className="text-charcoal/60 text-[12px] leading-relaxed">
              {mediaKind === "video"
                ? "Video files download as-is. Re-encoding isn't supported in the library — use a separate editor if you need a different format or resolution."
                : "Downloads the original file as uploaded."}
            </p>
            <a
              href={downloadHref}
              className="block w-full px-3 py-2 rounded-full bg-green text-white text-xs font-semibold text-center hover:bg-green-dark transition-colors"
            >
              Download
            </a>
          </>
        )}
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
