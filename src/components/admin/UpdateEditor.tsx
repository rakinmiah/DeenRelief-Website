"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveUpdateAction,
  publishUpdateAction,
  unpublishUpdateAction,
  deleteMediaAction,
} from "@/app/admin/sponsorship/actions";
import type { OrphanUpdate, OrphanUpdateMediaRow } from "@/lib/sponsorship-admin";

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

export default function UpdateEditor({
  orphanId,
  update,
  initialMedia,
}: {
  orphanId: string;
  update: OrphanUpdate;
  initialMedia: OrphanUpdateMediaRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(update.title);
  const [periodLabel, setPeriodLabel] = useState(update.periodLabel ?? "");
  const [bodyHtml, setBodyHtml] = useState(update.bodyHtml);
  const [published, setPublished] = useState(update.published);
  const [media, setMedia] = useState(initialMedia);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const result = await saveUpdateAction(update.id, {
      title,
      bodyHtml,
      periodLabel: periodLabel.trim() || null,
    });
    setSaving(false);
    setMsg(
      result.ok
        ? { ok: true, text: "Saved." }
        : { ok: false, text: result.error ?? "Couldn't save." }
    );
  }

  async function handlePublishToggle() {
    setSaving(true);
    setMsg(null);
    // Save first so the published version reflects the latest edits.
    await saveUpdateAction(update.id, {
      title,
      bodyHtml,
      periodLabel: periodLabel.trim() || null,
    });
    const result = published
      ? await unpublishUpdateAction(update.id)
      : await publishUpdateAction(update.id);
    setSaving(false);
    if (result.ok) {
      setPublished(!published);
      setMsg({ ok: true, text: published ? "Unpublished." : "Published." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't update status." });
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("updateId", update.id);
      fd.append("orphanId", orphanId);
      const res = await fetch("/api/admin/sponsorship/media", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
      setMedia((m) => [...m, body.media as OrphanUpdateMediaRow]);
      setMsg({ ok: true, text: "Uploaded." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteMedia(id: string) {
    const result = await deleteMediaAction(id);
    if (result.ok) {
      setMedia((m) => m.filter((x) => x.id !== id));
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't delete." });
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-charcoal/10 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="period">
              Period label
            </label>
            <input
              id="period"
              className={inputCls}
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="e.g. May 2026"
            />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="body">
            Update
          </label>
          <textarea
            id="body"
            className={`${inputCls} min-h-[160px] resize-y`}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="How the child is doing this month…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handlePublishToggle}
            disabled={saving}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
              published
                ? "border border-charcoal/15 text-charcoal hover:border-amber-dark hover:text-amber-dark"
                : "bg-green text-white hover:bg-green-dark"
            }`}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
              published
                ? "bg-green-light text-green"
                : "bg-grey-light text-grey"
            }`}
          >
            {published ? "Published" : "Draft"}
          </span>
          {msg && (
            <span
              className={`text-sm ${msg.ok ? "text-green" : "text-red-600"}`}
              role="status"
            >
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="rounded-xl border border-charcoal/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-grey">
            Photos &amp; videos ({media.length})
          </h2>
          <label className="px-3.5 py-1.5 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors cursor-pointer">
            {uploading ? "Uploading…" : "+ Add media"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {media.length === 0 ? (
          <p className="text-sm text-grey/70">
            No media yet. Photos and videos you add are stored privately.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/8">
            {media.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 py-2.5 text-sm text-charcoal"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cream text-grey">
                  {m.kind}
                </span>
                <span className="flex-1 min-w-0 truncate text-grey">
                  {m.storagePath.split("/").pop()}
                </span>
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
