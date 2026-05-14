"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Drag-and-drop multi-file uploader for the media library.
 *
 * Posts each file individually to /api/admin/media/upload (one
 * POST per file). Sequential rather than parallel so the trustee
 * can see one progress at a time and so we don't slam Supabase
 * with N concurrent uploads on a slow connection.
 *
 * Phase 1 scope: no chunked / resumable uploads. Each file goes
 * up as a single multipart POST. Supabase Storage's per-plan
 * file-size limit is what bites first (50 MB free, 5 GB Pro);
 * we surface that limit's error inline if it fires.
 */

interface UploadState {
  filename: string;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

export default function MediaUploaderClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setBusy(true);
    const initial: UploadState[] = list.map((f) => ({
      filename: f.name,
      status: "queued",
    }));
    setUploads(initial);

    for (let i = 0; i < list.length; i++) {
      setUploads((prev) =>
        prev.map((u, idx) =>
          idx === i ? { ...u, status: "uploading" } : u
        )
      );
      try {
        const formData = new FormData();
        formData.append("file", list[i]);
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = (await res
            .json()
            .catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? `Upload failed (${res.status})`);
        }
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i ? { ...u, status: "done" } : u
          )
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i
              ? {
                  ...u,
                  status: "error",
                  error:
                    err instanceof Error
                      ? err.message
                      : "Upload failed.",
                }
              : u
          )
        );
      }
    }

    setBusy(false);
    // Refresh the page to show the newly uploaded items.
    router.refresh();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function clearCompleted() {
    setUploads((prev) =>
      prev.filter((u) => u.status === "uploading" || u.status === "queued")
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-green/60 bg-green/5"
            : "border-charcoal/20 bg-cream/40"
        }`}
      >
        <svg
          className="w-10 h-10 text-charcoal/40 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        <p className="text-charcoal font-medium text-sm mb-1">
          Drop images, videos, PDFs here
        </p>
        <p className="text-charcoal/50 text-[12px] mb-4">
          or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              // Reset the input so re-picking the same file fires
              // onChange again.
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Choose files"}
        </button>
        <p className="text-[11px] text-charcoal/40 mt-4">
          Supabase free tier caps uploads at 50 MB per file.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-cream border-b border-charcoal/10">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
              Recent uploads ({uploads.length})
            </span>
            {uploads.some((u) => u.status === "done" || u.status === "error") && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-[11px] font-semibold text-charcoal/60 hover:text-charcoal transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="divide-y divide-charcoal/8">
            {uploads.map((u, i) => (
              <li
                key={`${u.filename}-${i}`}
                className="px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="truncate text-charcoal">{u.filename}</span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                    u.status === "done"
                      ? "text-green-dark"
                      : u.status === "error"
                        ? "text-red-700"
                        : u.status === "uploading"
                          ? "text-amber-dark"
                          : "text-charcoal/40"
                  }`}
                  title={u.error}
                >
                  {u.status === "done"
                    ? "✓ Uploaded"
                    : u.status === "error"
                      ? `Failed: ${u.error}`
                      : u.status === "uploading"
                        ? "Uploading…"
                        : "Queued"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
