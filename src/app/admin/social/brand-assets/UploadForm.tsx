"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandVariant } from "@/lib/brand-assets";
import { uploadBrandAssetAction } from "./actions";

/**
 * Brand-asset upload form for a specific variant. Drop / pick a file,
 * optionally annotate, save. On save, the action archives any
 * previous active asset for the variant (one active per variant).
 *
 * `compact` mode shrinks the dropzone for inline "Replace" use cases.
 */
export default function UploadForm({
  variant,
  compact = false,
}: {
  variant: BrandVariant;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(f: File) {
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        setError("Could not read file.");
        return;
      }
      startTransition(async () => {
        const result = await uploadBrandAssetAction({
          variant,
          fileBase64: dataUrl,
          fileName: file.name,
          mimeType: file.type,
          bytes: file.size,
          notes: notes.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFile(null);
        setPreviewUrl(null);
        setNotes("");
        router.refresh();
      });
    };
    reader.onerror = () => setError("File read failed.");
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onDragOver={(e) => e.preventDefault()}
        className={`flex items-center justify-center gap-4 rounded-xl border-2 border-dashed border-charcoal/20 bg-cream/40 hover:bg-cream cursor-pointer transition-colors ${
          compact ? "py-6" : "py-10"
        }`}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Upload preview"
              className="w-16 h-16 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-charcoal text-[13px] font-semibold">
                {file?.name}
              </span>
              <span className="text-charcoal/55 text-[11px]">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-charcoal font-semibold text-[14px]">
              Drop logo here, or click to choose
            </p>
            <p className="text-[11px] text-charcoal/55 mt-1">
              PNG · SVG · JPEG · WebP · max 5 MB · transparent preferred
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — e.g. 'approved 2024 version'"
        maxLength={140}
        className="w-full px-3 py-2 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-[13px]"
      />

      {error && (
        <p role="alert" className="text-[12px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending || !file}
          className="px-5 py-2 rounded-full bg-charcoal text-white text-[13px] font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Uploading…" : "Save brand asset"}
        </button>
      </div>
    </form>
  );
}
