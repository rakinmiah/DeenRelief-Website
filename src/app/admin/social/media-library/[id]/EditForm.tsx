"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";
import {
  MEDIA_TONES,
  MEDIA_USE_CASES,
  type MediaItem,
  type MediaUseCase,
} from "@/lib/media-library";
import { archiveMediaAction, editMediaAction } from "../actions";

/**
 * Edit form for an existing media library item. Mirrors the upload
 * form's tag-editing UI but pre-populated from the row, and with an
 * archive button instead of upload-flow controls.
 */
export default function EditForm({ item }: { item: MediaItem }) {
  const router = useRouter();
  const [caption, setCaption] = useState(item.caption ?? "");
  const [tagsRaw, setTagsRaw] = useState(item.tags.join(", "));
  const [campaignSlugs, setCampaignSlugs] = useState<CampaignSlug[]>(
    item.campaignSlugs as CampaignSlug[]
  );
  const [countryIso, setCountryIso] = useState(item.countryIso ?? "");
  const [eventTypesRaw, setEventTypesRaw] = useState(
    item.eventTypes.join(", ")
  );
  const [tone, setTone] = useState(item.tone ?? "");
  const [useCases, setUseCases] = useState<MediaUseCase[]>(
    item.useCases as MediaUseCase[]
  );
  const [peopleVisible, setPeopleVisible] = useState(item.peopleVisible);
  const [identifiableMinors, setIdentifiableMinors] = useState(
    item.identifiableMinors
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tags = tagsRaw
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const eventTypes = eventTypesRaw
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    startTransition(async () => {
      const result = await editMediaAction({
        id: item.id,
        caption,
        tags,
        campaignSlugs,
        countryIso: countryIso.trim().toUpperCase() || null,
        eventTypes,
        tone: tone || null,
        useCases,
        peopleVisible,
        identifiableMinors,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleArchive() {
    if (
      !confirm(
        "Archive this media item? It'll be hidden from the library and packet selector."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await archiveMediaAction(item.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/social/media-library");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6"
    >
      <div className="flex flex-col gap-3">
        <div
          className="aspect-square rounded-2xl overflow-hidden border border-charcoal/10"
          style={{ backgroundColor: item.dominantColor ?? "#F7F3E8" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.publicUrl}
            alt={item.caption ?? "Media item"}
            className="w-full h-full object-cover"
          />
        </div>
        <a
          href={item.publicUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[12px] text-charcoal/60 hover:text-charcoal underline underline-offset-2"
        >
          Open full size ↗
        </a>
        <button
          type="button"
          onClick={handleArchive}
          disabled={pending}
          className="text-[12px] text-red-700 hover:text-red-900 underline underline-offset-2 self-start"
        >
          Archive this item
        </button>
      </div>

      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <Field label="Caption">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={140}
            className={baseInput}
          />
        </Field>

        <Field label="Tags (comma-separated, lowercase)">
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
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

        <Field label="Campaigns">
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
            className={baseInput}
          />
        </Field>

        <Field label="Use cases">
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
            People visible in shot
          </label>
          <label className="flex items-center gap-2 text-[13px] text-charcoal/85">
            <input
              type="checkbox"
              checked={identifiableMinors}
              onChange={(e) => setIdentifiableMinors(e.target.checked)}
            />
            Identifiable minors
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal/5">
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 transition-colors"
          >
            {pending ? "Saving…" : "Save changes"}
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
