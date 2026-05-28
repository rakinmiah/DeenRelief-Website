"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import {
  MEDIA_TONES,
  MEDIA_USE_CASES,
  type MediaUseCase,
} from "@/lib/media-library";
import {
  saveMediaAction,
  uploadMediaAction,
  type UploadMediaResult,
} from "../actions";

/**
 * Upload + tag-edit form (client component).
 *
 * Three states:
 *   • picking  — empty drop zone
 *   • analysing — file uploaded, Claude Vision running, suggestions
 *                 pending. SMM sees the photo immediately.
 *   • editing  — suggestions arrived, form populated, SMM reviews +
 *                clicks Save. On save, redirect to library.
 */
export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Stage 1: file metadata
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    bytes: number;
    mimeType: string;
  } | null>(null);

  // Stage 2: upload result
  const [uploadResult, setUploadResult] = useState<UploadMediaResult | null>(
    null
  );
  const [uploadPending, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Stage 3: editable form state
  const [caption, setCaption] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [campaignSlugs, setCampaignSlugs] = useState<CampaignSlug[]>([]);
  const [countryIso, setCountryIso] = useState("");
  const [eventTypesRaw, setEventTypesRaw] = useState("");
  const [tone, setTone] = useState<string>("");
  const [useCases, setUseCases] = useState<MediaUseCase[]>([]);
  const [peopleVisible, setPeopleVisible] = useState(false);
  const [identifiableMinors, setIdentifiableMinors] = useState(false);

  const [savePending, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleFileSelected(file: File) {
    setUploadError(null);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      setPreviewUrl(dataUrl);
      setFileMeta({
        name: file.name,
        bytes: file.size,
        mimeType: file.type,
      });

      // Kick the upload immediately — base64 is the data URI payload.
      startUpload(async () => {
        const result = await uploadMediaAction({
          fileBase64: dataUrl,
          fileName: file.name,
          mimeType: file.type,
          bytes: file.size,
        });
        if (!result.ok) {
          setUploadError(result.error);
          return;
        }
        setUploadResult(result.data);

        // Prefill form with suggestions when available.
        const s = result.data.suggestions;
        if (s) {
          setCaption(s.caption);
          setTagsRaw(s.tags.join(", "));
          setCampaignSlugs(s.campaign_slugs as CampaignSlug[]);
          setCountryIso(s.country_iso ?? "");
          setEventTypesRaw(s.event_types.join(", "));
          setTone(s.tone);
          setUseCases(s.use_cases as MediaUseCase[]);
          setPeopleVisible(s.people_visible);
          setIdentifiableMinors(s.identifiable_minors);
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadResult || !fileMeta) return;
    setSaveError(null);

    const tags = tagsRaw
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const eventTypes = eventTypesRaw
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    startSave(async () => {
      const result = await saveMediaAction({
        storagePath: uploadResult.storagePath,
        caption,
        tags,
        campaignSlugs,
        countryIso: countryIso.trim().toUpperCase() || null,
        eventTypes,
        tone: tone || null,
        useCases,
        peopleVisible,
        identifiableMinors,
        bytes: fileMeta.bytes,
        mimeType: fileMeta.mimeType,
        aiTagging: uploadResult.aiTagging ?? undefined,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      router.push("/admin/social/media-library");
      router.refresh();
    });
  }

  // ─── Empty drop zone ────────────────────────────────────────────
  if (!previewUrl) {
    return (
      <div className="space-y-4">
        <DropZone
          onFile={handleFileSelected}
          fileInputRef={inputRef}
        />
        <p className="text-[12px] text-charcoal/55">
          JPEG, PNG, or WebP. Max 10 MB per image. Multi-upload coming
          later — for now, one photo at a time, but the AI tagger makes
          each one ~30 seconds of work.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6"
    >
      {/* ─── Preview column ─── */}
      <div className="flex flex-col gap-3">
        <div className="aspect-square rounded-2xl overflow-hidden bg-cream border border-charcoal/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-full h-full object-cover"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPreviewUrl(null);
            setUploadResult(null);
            setFileMeta(null);
          }}
          className="text-[12px] text-charcoal/60 hover:text-charcoal underline underline-offset-2"
        >
          Choose a different file
        </button>
        {uploadResult?.suggestions ? (
          <p className="text-[11px] text-charcoal/55 leading-relaxed">
            Pre-filled by Claude Vision.{" "}
            {uploadResult.aiTagging && (
              <>
                {uploadResult.aiTagging.inputTokens}/
                {uploadResult.aiTagging.outputTokens} tokens in/out.{" "}
              </>
            )}
            Review and adjust before saving.
          </p>
        ) : uploadPending ? (
          <p className="text-[11px] text-amber-dark leading-relaxed">
            Analysing image with Claude Vision…
          </p>
        ) : uploadResult?.suggestionsError ? (
          <p className="text-[11px] text-red-700 leading-relaxed">
            AI tagging failed — fill the fields manually below. Error:{" "}
            {uploadResult.suggestionsError}
          </p>
        ) : null}
      </div>

      {/* ─── Form column ─── */}
      <div className="space-y-4">
        {uploadError && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {uploadError}
          </div>
        )}
        {saveError && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {saveError}
          </div>
        )}

        <Field label="Caption">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            placeholder="One-line description of what's in the photo"
            maxLength={140}
            className={baseInput}
          />
        </Field>

        <Field label="Tags (comma-separated, lowercase)">
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="volunteers, food-distribution, brighton"
            className={baseInput}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country (ISO-2)">
            <input
              type="text"
              value={countryIso}
              onChange={(e) =>
                setCountryIso(e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="BD, PK, PS, GB…"
              maxLength={2}
              className={baseInput}
            />
          </Field>
          <Field label="Tone">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className={baseInput}
            >
              <option value="">— select tone —</option>
              {MEDIA_TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Campaigns this image suits">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CAMPAIGNS) as CampaignSlug[]).map((slug) => {
              const on = campaignSlugs.includes(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() =>
                    setCampaignSlugs((prev) =>
                      on ? prev.filter((s) => s !== slug) : [...prev, slug]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                    on
                      ? "bg-charcoal text-white"
                      : "bg-cream border border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
                  }`}
                >
                  {CAMPAIGNS[slug]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Event types (comma-separated)">
          <input
            type="text"
            value={eventTypesRaw}
            onChange={(e) => setEventTypesRaw(e.target.value)}
            placeholder="earthquake, flood, ramadan, daily-operations"
            className={baseInput}
          />
        </Field>

        <Field label="Use cases (for slide selection)">
          <div className="flex flex-wrap gap-2">
            {MEDIA_USE_CASES.map((uc) => {
              const on = useCases.includes(uc);
              return (
                <button
                  key={uc}
                  type="button"
                  onClick={() =>
                    setUseCases((prev) =>
                      on ? prev.filter((s) => s !== uc) : [...prev, uc]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                    on
                      ? "bg-charcoal text-white"
                      : "bg-cream border border-charcoal/15 text-charcoal/70 hover:bg-charcoal/5"
                  }`}
                >
                  {uc}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="space-y-2 bg-amber-light/40 border border-amber/20 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-amber-dark">
            Safeguarding
          </p>
          <label className="flex items-center gap-2 text-[13px] text-charcoal/85">
            <input
              type="checkbox"
              checked={peopleVisible}
              onChange={(e) => setPeopleVisible(e.target.checked)}
            />
            People visible in shot (recognisable adults)
          </label>
          <label className="flex items-center gap-2 text-[13px] text-charcoal/85">
            <input
              type="checkbox"
              checked={identifiableMinors}
              onChange={(e) => setIdentifiableMinors(e.target.checked)}
            />
            Identifiable minors (auto-excluded from selection unless you
            also add the &lsquo;consent-on-file&rsquo; use case)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal/5">
          <button
            type="submit"
            disabled={savePending || uploadPending || !uploadResult}
            className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savePending ? "Saving…" : "Save to library"}
          </button>
        </div>
      </div>
    </form>
  );
}

const baseInput =
  "w-full px-3 py-2.5 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function DropZone({
  onFile,
  fileInputRef,
}: {
  onFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
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
        Drop an image here, or click to choose
      </p>
      <p className="text-[12px] text-charcoal/55">
        JPEG · PNG · WebP · max 10 MB
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
