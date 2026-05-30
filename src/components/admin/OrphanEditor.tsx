"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrphanAction } from "@/app/admin/sponsorship/actions";
import type {
  Orphan,
  AgeBand,
  Gender,
  OrphanStatus,
  UpdateOrphanInput,
} from "@/lib/sponsorship-admin";

/**
 * Orphan profile editor. Deliberately constrains what can be entered to the
 * data-minimised fields the schema allows (first name/pseudonym, country +
 * broad region, age band — never an exact address or full DOB). The helper
 * text reinforces the safeguarding rules for the coordinator.
 *
 * Profile photos + update media are uploaded through the dedicated private
 * upload route, not this form — child imagery never travels as inline HTML.
 */

const AGE_BANDS: AgeBand[] = ["0-2", "3-5", "6-8", "9-11", "12-14", "15-17"];
const STATUSES: OrphanStatus[] = [
  "available",
  "sponsored",
  "paused",
  "graduated",
  "withdrawn",
];

const labelCls =
  "block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-charcoal/15 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/15 text-charcoal text-sm";

export default function OrphanEditor({
  orphan,
  photoUrl,
}: {
  orphan: Orphan;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(photoUrl);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: orphan.slug,
    displayName: orphan.displayName,
    pseudonym: orphan.pseudonym,
    country: orphan.country,
    region: orphan.region ?? "",
    ageBand: (orphan.ageBand ?? "") as AgeBand | "",
    dobYear: orphan.dobYear ? String(orphan.dobYear) : "",
    gender: orphan.gender,
    status: orphan.status,
    bio: orphan.bio,
    internalRef: orphan.internalRef ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orphanId", orphan.id);
      const res = await fetch("/api/admin/sponsorship/orphan-photo", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
      setCurrentPhoto(body.url as string);
      setPhotoMsg("Photo updated.");
      router.refresh();
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const input: UpdateOrphanInput = {
      slug: form.slug,
      displayName: form.displayName,
      pseudonym: form.pseudonym,
      country: form.country,
      region: form.region.trim() || null,
      ageBand: (form.ageBand || null) as AgeBand | null,
      dobYear: form.dobYear ? Number(form.dobYear) : null,
      gender: form.gender as Gender,
      status: form.status as OrphanStatus,
      bio: form.bio,
      internalRef: form.internalRef.trim() || null,
    };
    const result = await saveOrphanAction(orphan.id, input);
    setSaving(false);
    if (result.ok) {
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: result.error ?? "Couldn't save." });
    }
  }

  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-5 space-y-4">
      {/* Profile photo — the hero image sponsors see in the portal. */}
      <div className="flex items-center gap-4 pb-4 border-b border-charcoal/8">
        {currentPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPhoto}
            alt="Profile"
            className="w-20 h-20 rounded-2xl object-cover ring-1 ring-charcoal/10 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-green/10 ring-1 ring-charcoal/10 flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-2xl text-green/70">
              {(form.displayName.trim()[0] ?? "•").toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-charcoal">Profile photo</p>
          <p className="text-xs text-grey/70 mb-2">
            Shown as the hero image to this child&apos;s sponsors.
          </p>
          <label className="inline-flex items-center px-3.5 py-1.5 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors cursor-pointer">
            {uploadingPhoto
              ? "Uploading…"
              : currentPhoto
              ? "Replace photo"
              : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
          {photoMsg && (
            <p className="mt-1.5 text-xs text-grey" role="status">
              {photoMsg}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-amber-light/40 border border-amber/30 px-3.5 py-2.5 text-xs text-amber-dark leading-relaxed">
        <strong>Safeguarding:</strong> use a first name or pseudonym, country
        and broad region only (never a town, address, or GPS), and an age band
        rather than a full date of birth. Keep the bio free of identifying
        details (school names, surnames, exact locations).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="displayName">
            Display name (first name / pseudonym)
          </label>
          <input
            id="displayName"
            className={inputCls}
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="slug">
            URL slug
          </label>
          <input
            id="slug"
            className={inputCls}
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={form.pseudonym}
          onChange={(e) => set("pseudonym", e.target.checked)}
        />
        Display name is a protective pseudonym
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="country">
            Country
          </label>
          <input
            id="country"
            className={inputCls}
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="region">
            Region (broad — governorate/province)
          </label>
          <input
            id="region"
            className={inputCls}
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls} htmlFor="ageBand">
            Age band
          </label>
          <select
            id="ageBand"
            className={inputCls}
            value={form.ageBand}
            onChange={(e) => set("ageBand", e.target.value as AgeBand | "")}
          >
            <option value="">—</option>
            {AGE_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="dobYear">
            Birth year (optional)
          </label>
          <input
            id="dobYear"
            type="number"
            className={inputCls}
            value={form.dobYear}
            onChange={(e) => set("dobYear", e.target.value)}
            placeholder="e.g. 2015"
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            className={inputCls}
            value={form.gender}
            onChange={(e) => set("gender", e.target.value as Gender)}
          >
            <option value="undisclosed">Undisclosed</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={inputCls}
            value={form.status}
            onChange={(e) => set("status", e.target.value as OrphanStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="internalRef">
            Internal reference (admin only)
          </label>
          <input
            id="internalRef"
            className={inputCls}
            value={form.internalRef}
            onChange={(e) => set("internalRef", e.target.value)}
            placeholder="Field-partner ref"
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="bio">
          Wellbeing narrative
        </label>
        <textarea
          id="bio"
          className={`${inputCls} min-h-[120px] resize-y`}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="General wellbeing and progress. No identifying detail."
        />
        <p className="mt-1 text-xs text-grey/70">
          Basic formatting is allowed; images are not — add photos to an update
          instead.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
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
  );
}
