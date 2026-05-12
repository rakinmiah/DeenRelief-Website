"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

/**
 * Gallery upload — multiple images for a single product.
 *
 * Stores the URL list as one URL per line in a hidden textarea
 * named `name`, matching the server action's
 * `splitLines` parser. Existing form data round-trips through
 * `initialUrls`.
 *
 * UX:
 *   - Drop zone accepts one or many at once (file picker is
 *     `multiple`); each file is uploaded in parallel and the
 *     URL list grows as they complete.
 *   - Thumbnails are reorderable via drag-handle (simple
 *     swap-up / swap-down arrows for now — full drag-and-drop
 *     reorder is overkill for ~4 images per product).
 *   - Per-image Remove button.
 */

export interface MultiImageUploadFieldProps {
  name: string;
  initialUrls?: string[];
  folder?: "products" | "makers";
  label: string;
  helper?: string;
}

export default function MultiImageUploadField({
  name,
  initialUrls = [],
  folder = "products",
  label,
  helper,
}: MultiImageUploadFieldProps) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Stable id for the dropzone <label htmlFor={...}> so clicking
  // the drop area opens the file picker. Without this the label
  // and input are siblings and clicks do nothing.
  const fileInputId = useId();

  async function uploadOne(file: File): Promise<string | null> {
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("folder", folder);
      const res = await fetch("/api/admin/bazaar/catalog/upload-image", {
        method: "POST",
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Upload failed (${res.status})`);
      }
      return json.url as string;
    } catch (err) {
      setError(
        err instanceof Error
          ? `${file.name}: ${err.message}`
          : `${file.name}: upload failed`
      );
      return null;
    }
  }

  async function handleFiles(files: FileList) {
    setError(null);
    const fileList = Array.from(files);
    setUploadingCount((c) => c + fileList.length);
    try {
      // Upload in parallel — each call is independent and Supabase
      // Storage handles concurrent puts fine.
      const results = await Promise.all(fileList.map(uploadOne));
      const fresh = results.filter((u): u is string => Boolean(u));
      setUrls((prev) => [...prev, ...fresh]);
    } finally {
      setUploadingCount((c) => Math.max(0, c - fileList.length));
      // Always clear the input value so picking the same file
      // again (e.g. after a failed upload) fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  function remove(i: number) {
    setUrls((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    setUrls((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }
  function moveDown(i: number) {
    setUrls((prev) => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
        {label}
      </label>

      {/* Hidden textarea — one URL per line, matches the server
          action's splitLines parser for gallery_images. */}
      <textarea
        name={name}
        value={urls.join("\n")}
        readOnly
        className="sr-only"
        aria-hidden="true"
      />

      {urls.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {urls.map((u, i) => (
            <li
              key={u}
              className="relative aspect-square rounded-lg overflow-hidden bg-cream border border-charcoal/10 group"
            >
              <Image
                src={u}
                alt=""
                fill
                sizes="(min-width: 640px) 25vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/50 transition-colors flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    title="Move up"
                    className="w-6 h-6 flex items-center justify-center rounded bg-white/90 text-charcoal text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === urls.length - 1}
                    title="Move down"
                    className="w-6 h-6 flex items-center justify-center rounded bg-white/90 text-charcoal text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Remove"
                  className="self-end px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold uppercase tracking-wider"
                >
                  Remove
                </button>
              </div>
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-charcoal/70 text-white text-[10px] font-bold pointer-events-none">
                {i + 1}
              </span>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor={fileInputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-1 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-amber bg-amber-light/30"
            : "border-charcoal/20 bg-white hover:border-charcoal/40 hover:bg-cream/40"
        }`}
      >
        {uploadingCount > 0 ? (
          <p className="text-sm font-medium text-charcoal">
            Processing &amp; uploading {uploadingCount} image
            {uploadingCount === 1 ? "" : "s"}…
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-charcoal">
              {urls.length === 0
                ? "Click or drop to add gallery images"
                : "Add more images"}
            </p>
            <p className="text-[11px] text-charcoal/50">
              Multiple files supported. Auto-converted to WebP.
            </p>
          </>
        )}
      </label>

      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        onChange={handleChange}
        disabled={uploadingCount > 0}
        className="sr-only"
      />

      {error && (
        <p className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1.5 text-[11px] text-charcoal/50">{helper}</p>
      )}
    </div>
  );
}
