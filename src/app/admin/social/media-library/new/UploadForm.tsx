"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveMediaAction,
  uploadMediaAction,
  type MediaActionResult,
  type UploadMediaResult,
} from "../actions";

/**
 * Multi-file queue uploader.
 *
 * The SMM drops N photos at once (or picks them via the system file
 * dialog). Each item streams through the queue independently:
 *
 *   picked → uploading → analysing → saving → done
 *                                    ↓
 *                                 (or) error
 *
 * Concurrency is throttled to MAX_CONCURRENT so we don't fan 50
 * Claude Vision calls out at once — Anthropic's tier-1 rate limits
 * sit around ~50 RPM, so 5 at a time is comfortable headroom plus
 * gives the UI a watchable progression rather than everything
 * finishing at once.
 *
 * Each item auto-saves with the AI-suggested metadata as-is. The SMM
 * doesn't review at upload time — she edits any rows that need
 * correction afterwards from the library grid (faster overall, since
 * Claude's tags are usually right for ~80% of photos).
 *
 * Failure isolation: one bad file (vision error, oversized, wrong
 * MIME) doesn't stop the rest. The queue keeps going; the failed
 * item shows a red error chip.
 */

const MAX_CONCURRENT = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Auto-retry settings — backs off exponentially between attempts. */
const MAX_RETRIES = 2; // total tries = 1 + MAX_RETRIES = 3
const RETRY_BACKOFF_MS = [1000, 3000]; // 1s, then 3s

/**
 * Errors we shouldn't retry — these are permanent problems with the file
 * itself or the user's input, not transient infrastructure issues.
 * Anything else (network blip, rate limit, 5xx) gets retried.
 */
function isPermanentError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("only jpeg") ||
    lower.includes("must be between") ||
    lower.includes("payload could not be decoded") ||
    lower.includes("empty file payload") ||
    lower.includes("invalid_image")
  );
}

type Status =
  | "queued"
  | "uploading"
  | "analysing"
  | "saving"
  | "done"
  | "error";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: Status;
  error: string | null;
  uploadResult: UploadMediaResult | null;
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [, startTransition] = useTransition();

  function handleFilesSelected(files: FileList | File[]) {
    const arr = Array.from(files);
    const accepted: QueueItem[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const file of arr) {
      if (!ALLOWED_MIME.has(file.type)) {
        rejected.push({ name: file.name, reason: "wrong file type" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        rejected.push({ name: file.name, reason: "over 10 MB" });
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        error: null,
        uploadResult: null,
      });
    }

    if (accepted.length === 0 && rejected.length > 0) {
      alert(
        `No valid files. Rejected ${rejected.length}: ${rejected
          .map((r) => `${r.name} (${r.reason})`)
          .join(", ")}`
      );
      return;
    }

    setItems((prev) => [...prev, ...accepted]);
    // Start processing in the next tick so React has rendered the
    // queued items first.
    setTimeout(() => processQueue(accepted), 0);

    if (rejected.length > 0) {
      console.warn("[upload] rejected:", rejected);
    }
  }

  async function processQueue(toProcess: QueueItem[]) {
    // Simple pool: while there's work, dispatch up to MAX_CONCURRENT
    // workers, each of which pulls the next queued item.
    const queue = [...toProcess];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i += 1) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const next = queue.shift();
            if (!next) return;
            await processItem(next);
          }
        })()
      );
    }
    await Promise.all(workers);
  }

  async function processItem(item: QueueItem) {
    try {
      updateItem(item.id, { status: "uploading" });
      const fileBase64 = await readAsDataUrl(item.file);

      // Upload step — retry on transient failures.
      const uploadRes = await retry(
        () =>
          uploadMediaAction({
            fileBase64,
            fileName: item.file.name,
            mimeType: item.file.type,
            bytes: item.file.size,
          }),
        (attempt, err) => {
          updateItem(item.id, {
            status: "uploading",
            error: `Retry ${attempt}/${MAX_RETRIES} — ${err}`,
          });
        }
      );
      if (!uploadRes.ok) {
        updateItem(item.id, { status: "error", error: uploadRes.error });
        return;
      }
      updateItem(item.id, {
        status: "analysing",
        uploadResult: uploadRes.data,
        error: null, // clear any retry-warning text now that we succeeded
      });

      // AI tagging already happened inside uploadMediaAction; the
      // 'analysing' phase here is mostly cosmetic, plus the brief
      // window before saving. Apply suggestions as-is.
      const s = uploadRes.data.suggestions;
      updateItem(item.id, { status: "saving" });

      const saveRes = await retry(
        () =>
          saveMediaAction({
            storagePath: uploadRes.data.storagePath,
            caption: s?.caption ?? "",
            tags: s?.tags ?? [],
            campaignSlugs: s?.campaign_slugs ?? [],
            countryIso: s?.country_iso ?? null,
            eventTypes: s?.event_types ?? [],
            tone: s?.tone ?? null,
            useCases: s?.use_cases ?? [],
            peopleVisible: s?.people_visible ?? false,
            identifiableMinors: s?.identifiable_minors ?? false,
            bytes: item.file.size,
            mimeType: item.file.type,
            aiTagging: uploadRes.data.aiTagging ?? undefined,
          }),
        (attempt, err) => {
          updateItem(item.id, {
            status: "saving",
            error: `Retry ${attempt}/${MAX_RETRIES} — ${err}`,
          });
        }
      );
      if (!saveRes.ok) {
        updateItem(item.id, { status: "error", error: saveRes.error });
        return;
      }
      updateItem(item.id, { status: "done", error: null });
    } catch (err) {
      updateItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "unexpected error",
      });
    }
  }

  /**
   * Run an action with exponential backoff retry. Bails immediately on
   * permanent errors (validation failures the file itself caused — no
   * point retrying those). Notifies on each retry via the onRetry
   * callback so the UI can show "Retry 1/2" to the SMM.
   */
  async function retry<T>(
    action: () => Promise<MediaActionResult<T>>,
    onRetry: (attempt: number, message: string) => void
  ): Promise<MediaActionResult<T>> {
    let last: MediaActionResult<T> = await action();
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      if (last.ok) return last;
      if (isPermanentError(last.error)) return last;
      onRetry(attempt, last.error);
      await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 3000);
      last = await action();
    }
    return last;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === "string") resolve(dataUrl);
        else reject(new Error("Could not read file"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  function handleFinish() {
    startTransition(() => {
      router.push("/admin/social/media-library");
      router.refresh();
    });
  }

  const counts = {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    error: items.filter((i) => i.status === "error").length,
    inFlight: items.filter(
      (i) =>
        i.status === "uploading" ||
        i.status === "analysing" ||
        i.status === "saving"
    ).length,
  };
  const allFinished =
    items.length > 0 && counts.done + counts.error === items.length;

  /* ─── Empty state ──────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <DropZone
          onFiles={handleFilesSelected}
          fileInputRef={inputRef}
        />
      </div>
    );
  }

  /* ─── Queue view ───────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 bg-cream/60 border border-charcoal/10 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-4 text-[13px]">
          <span className="font-semibold text-charcoal">
            {counts.done}/{counts.total} saved
          </span>
          {counts.inFlight > 0 && (
            <span className="text-amber-dark">
              {counts.inFlight} processing…
            </span>
          )}
          {counts.error > 0 && (
            <span className="text-red-700">
              {counts.error} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={counts.inFlight > 0}
            className="px-3 py-1.5 rounded-full bg-white border border-charcoal/15 text-charcoal text-[12px] font-semibold hover:bg-cream disabled:opacity-50 transition-colors"
          >
            + Add more
          </button>
          <button
            type="button"
            onClick={handleFinish}
            disabled={!allFinished}
            className="px-3 py-1.5 rounded-full bg-charcoal text-white text-[12px] font-semibold hover:bg-charcoal/85 disabled:opacity-50 transition-colors"
          >
            {allFinished ? "Done · go to library" : "Wait for processing…"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesSelected(e.target.files);
            e.target.value = ""; // reset so re-selecting same files re-adds them
          }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <QueueCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function QueueCard({ item }: { item: QueueItem }) {
  const statusLabel: Record<Status, string> = {
    queued: "Queued",
    uploading: "Uploading…",
    analysing: "Tagging…",
    saving: "Saving…",
    done: "Saved ✓",
    error: "Failed",
  };
  const statusColor: Record<Status, string> = {
    queued: "bg-charcoal/10 text-charcoal/60",
    uploading: "bg-amber-light text-amber-dark",
    analysing: "bg-amber-light text-amber-dark",
    saving: "bg-amber-light text-amber-dark",
    done: "bg-green/15 text-green-dark",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-cream relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="w-full h-full object-cover"
        />
        {(item.status === "uploading" ||
          item.status === "analysing" ||
          item.status === "saving") && (
          <div className="absolute inset-0 bg-charcoal/30 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cream/30 border-t-cream rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <span
          className={`text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full self-start ${statusColor[item.status]}`}
        >
          {statusLabel[item.status]}
        </span>
        <p
          className="text-[11px] text-charcoal/70 truncate"
          title={item.file.name}
        >
          {item.file.name}
        </p>
        {item.error && (
          <p className="text-[10px] text-red-700 leading-tight line-clamp-2">
            {item.error}
          </p>
        )}
        {item.status === "done" && item.uploadResult?.suggestions && (
          <p className="text-[10px] text-charcoal/55 leading-tight line-clamp-1">
            {item.uploadResult.suggestions.caption}
          </p>
        )}
      </div>
    </div>
  );
}

function DropZone({
  onFiles,
  fileInputRef,
}: {
  onFiles: (files: FileList | File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
        dragOver
          ? "border-charcoal bg-cream"
          : "border-charcoal/20 bg-white hover:bg-cream"
      }`}
    >
      <p className="text-charcoal font-semibold text-[15px]">
        Drop photos here, or click to choose
      </p>
      <p className="text-[12px] text-charcoal/55 text-center max-w-md">
        One photo, a batch, or a whole folder. JPEG · PNG · WebP ·
        max 10 MB each.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

