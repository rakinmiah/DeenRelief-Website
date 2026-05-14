"use client";

import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { ProductOriginCountry } from "@/lib/bazaar-types";

/**
 * Shared form fields for the maker create + edit pages.
 *
 * Client component — controlled state so the photo upload widget
 * can write the URL back into the form. No AI auto-fill on
 * makers: their stories are biographical, not visual.
 */
export default function MakerFormFields({
  initial,
}: {
  initial?: {
    name: string;
    country: ProductOriginCountry;
    region: string;
    photoUrl: string;
    story: string;
    quote: string | null;
    isActive: boolean;
  };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [country, setCountry] = useState<ProductOriginCountry>(
    initial?.country ?? "Bangladesh"
  );
  const [region, setRegion] = useState(initial?.region ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  const [story, setStory] = useState(initial?.story ?? "");
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Khadija R."
            className={inputCx}
          />
          <p className="mt-1 text-[11px] text-charcoal/50">
            First-name-plus-initial keeps maker privacy intact.
          </p>
        </Field>
        <Field label="Country" htmlFor="country">
          <select
            id="country"
            name="country"
            required
            value={country}
            onChange={(e) =>
              setCountry(e.target.value as ProductOriginCountry)
            }
            className={inputCx}
          >
            <option value="Bangladesh">Bangladesh</option>
            <option value="Turkey">Turkey</option>
            <option value="Pakistan">Pakistan</option>
          </select>
        </Field>
      </div>

      <Field label="Region" htmlFor="region">
        <input
          id="region"
          name="region"
          type="text"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Sylhet"
          className={inputCx}
        />
      </Field>

      <ImageUploadField
        name="photoUrl"
        label="Maker portrait"
        folder="makers"
        initialUrl={photoUrl}
        previewAspect="portrait"
        helper="Upload a portrait — auto-converted to WebP and resized for the web."
        onUploaded={setPhotoUrl}
      />

      <Field label="Story" htmlFor="story">
        <textarea
          id="story"
          name="story"
          rows={6}
          required
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Where they live, how they came to the craft, what changed for them since joining the Bazaar."
          className={inputCx}
        />
        <p className="mt-1 text-[11px] text-charcoal/50">
          Aim for 60–100 words. Specific details beat generic praise.
        </p>
      </Field>

      <Field label="Quote (optional)" htmlFor="quote">
        <textarea
          id="quote"
          name="quote"
          rows={2}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder='"I sew them like I sew for my own family. If a stitch is loose I do it again."'
          className={inputCx}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
        <input
          type="checkbox"
          name="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded border-charcoal/30 text-green focus:ring-green"
        />
        Active — visible on /bazaar/about-our-makers
      </label>
    </div>
  );
}

const inputCx =
  "block w-full px-3 py-2 rounded-lg border border-charcoal/15 bg-white text-charcoal text-sm focus:outline-none focus:border-charcoal/50";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
