"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

/**
 * Single-image upload field for the catalog admin.
 *
 * Renders a file picker (with drag-and-drop), uploads to
 * /api/admin/bazaar/catalog/upload-image as soon as a file is
 * picked, and surfaces:
 *   - inline preview of the chosen image
 *   - upload progress text
 *   - final URL (kept in a hidden input named `name` so the
 *     parent form submits it via FormData)
 *   - "Remove" button to clear the field
 *
 * Optional onUploaded callback fires when the upload succeeds —
 * the product form uses this to trigger AI auto-fill in parallel.
 *
 * Folder prop maps to the API route's `folder` field — controls
 * the storage path ("products/<uuid>.webp" vs "makers/...").
 */

export interface ImageUploadFieldProps {
  /** Name of the hidden input that submits the URL — must match
   *  what the server action / DB column expects. */
  name: string;
  /** Initial URL when editing an existing row. Empty for create. */
  initialUrl?: string;
  /** Which sub-folder to upload into. */
  folder?: "products" | "makers";
  /** Visible field label. */
  label: string;
  /** Optional helper text shown beneath the field. */
  helper?: string;
  /** Optional callback after a successful upload — used by
   *  ProductFormFields to fire AI analysis. */
  onUploaded?: (url: string) => void;
  /** Render at a different aspect ratio in the preview. */
  previewAspect?: "square" | "portrait";
}

export default function ImageUploadField({
  name,
  initialUrl = "",
  folder = "products",
  label,
  helper,
  onUploaded,
  previewAspect = "portrait",
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >(initialUrl ? "success" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Stable id so the dropzone <label> can `htmlFor` the
  // <input type="file">. Without this, clicking the dropzone
  // doesn't open the file picker (the label and input were
  // siblings, not associated) — which is why a failed upload
  // previously got stuck until a page refresh.
  const fileInputId = useId();

  async function uploadFile(file: File) {
    setStatus("uploading");
    setError(null);
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
      const uploadedUrl = json.url as string;
      setUrl(uploadedUrl);
      setStatus("success");
      onUploaded?.(uploadedUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      // ALWAYS clear the input's value so the next pick — even
      // the same filename — fires onChange. Browsers suppress
      // change events when the same file is selected twice in a
      // row; clearing the value sidesteps that, and is essential
      // for letting the admin retry after an error.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleRemove() {
    setUrl("");
    setStatus("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const aspectClass =
    previewAspect === "square" ? "aspect-square" : "aspect-[4/5]";

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
        {label}
      </label>

      {/* Hidden input submits the URL via the parent form's
          server action. Always rendered with the current value
          (empty string when removed). */}
      <input type="hidden" name={name} value={url} />

      {url && status === "success" ? (
        <div className="flex gap-4 items-start">
          <div
            className={`relative ${aspectClass} w-32 rounded-lg overflow-hidden bg-cream border border-charcoal/10 flex-shrink-0`}
          >
            <Image
              src={url}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-charcoal/60 break-all font-mono mb-2">
              {url.replace(/^https?:\/\/[^/]+/, "")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-charcoal/15 text-charcoal hover:bg-cream transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={fileInputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragOver
              ? "border-amber bg-amber-light/30"
              : "border-charcoal/20 bg-white hover:border-charcoal/40 hover:bg-cream/40"
          }`}
        >
          <svg
            className="w-8 h-8 text-charcoal/40"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>
          {status === "uploading" ? (
            <p className="text-sm font-medium text-charcoal">
              Processing &amp; uploading…
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-charcoal">
                Click to upload, or drop an image
              </p>
              <p className="text-[11px] text-charcoal/50">
                JPEG / PNG / WebP / HEIC. Max 8 MB. Auto-converted to
                WebP and resized for the web.
              </p>
            </>
          )}
        </label>
      )}

      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        onChange={handleChange}
        disabled={status === "uploading"}
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
