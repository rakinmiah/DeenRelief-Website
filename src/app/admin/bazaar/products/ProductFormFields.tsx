"use client";

import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import MultiImageUploadField from "@/components/admin/MultiImageUploadField";
import type { ProductCategory } from "@/lib/bazaar-types";
import type { AdminMakerRow } from "@/lib/bazaar-catalog";

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "abaya", label: "Abaya" },
  { value: "thobe", label: "Thobe" },
  { value: "prayer-mat", label: "Prayer mat" },
  { value: "hijab", label: "Hijab" },
  { value: "tasbih", label: "Tasbih" },
  { value: "quran-cover", label: "Qur'an cover" },
  { value: "kufi", label: "Kufi" },
  { value: "kids", label: "Kids" },
];

/**
 * Shared product form — client component so the AI auto-fill +
 * image upload widgets can update React state on every field
 * that the analyser fills (name, tagline, description, category,
 * materials, care instructions).
 *
 * Pattern:
 *   - Every field is a controlled input with React state. Initial
 *     value comes from the `initial` prop (edit page) or empty
 *     string / sensible default (create page).
 *   - ImageUploadField for primary image; onUploaded fires the
 *     AI analyse call in parallel.
 *   - MultiImageUploadField for gallery (no AI tied to gallery —
 *     the primary is the analysis surface).
 *   - Form submission flows through the parent's
 *     action={createProductAction | updateProductAction} prop;
 *     all our controlled inputs have native `name` attributes
 *     so FormData contains every value at submit time.
 */
export default function ProductFormFields({
  initial,
  makers,
}: {
  initial?: {
    slug: string;
    name: string;
    tagline: string;
    description: string;
    category: ProductCategory;
    sku: string;
    pricePence: number;
    weightGrams: number;
    primaryImage: string;
    galleryImages: string[];
    materials: string;
    careInstructions: string[];
    sizingGuideHtml: string | null;
    makerId: string;
    stockCount: number;
    lowStockThreshold: number;
    isActive: boolean;
  };
  makers: AdminMakerRow[];
}) {
  // Controlled state per field. Initial values from `initial`
  // when editing, sensible defaults when creating.
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? "abaya"
  );
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [pricePence, setPricePence] = useState(
    initial?.pricePence?.toString() ?? ""
  );
  const [weightGrams, setWeightGrams] = useState(
    initial?.weightGrams?.toString() ?? ""
  );
  const [primaryImage, setPrimaryImage] = useState(initial?.primaryImage ?? "");
  const [galleryImages] = useState<string[]>(initial?.galleryImages ?? []);
  const [materials, setMaterials] = useState(initial?.materials ?? "");
  const [careInstructions, setCareInstructions] = useState(
    (initial?.careInstructions ?? []).join("\n")
  );
  const [sizingGuideHtml, setSizingGuideHtml] = useState(
    initial?.sizingGuideHtml ?? ""
  );
  const [makerId, setMakerId] = useState(initial?.makerId ?? makers[0]?.id ?? "");
  const [stockCount, setStockCount] = useState(
    initial?.stockCount?.toString() ?? "0"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initial?.lowStockThreshold?.toString() ?? "2"
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  // AI auto-fill state
  const [aiStatus, setAiStatus] = useState<
    "idle" | "analyzing" | "filled" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  /**
   * Fires immediately after the primary image upload completes.
   * Calls the AI analyze endpoint with the uploaded URL (OpenAI
   * fetches the image from Supabase Storage's CDN — no need to
   * re-encode and re-upload). On success, prefills the empty
   * fields. Never overwrites a field the admin has already
   * typed into; the auto-fill only populates blanks.
   */
  async function runAiAnalysis(imageUrl: string) {
    setAiStatus("analyzing");
    setAiError(null);
    try {
      const res = await fetch("/api/admin/bazaar/catalog/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Analysis failed");
      }
      const f = json.fields as {
        name: string;
        tagline: string;
        description: string;
        category: ProductCategory;
        materials: string;
        careInstructions: string[];
      };
      // Only fill blanks — don't clobber user input.
      if (!name) setName(f.name);
      if (!tagline) setTagline(f.tagline);
      if (!description) setDescription(f.description);
      if (!materials) setMaterials(f.materials);
      if (!careInstructions.trim())
        setCareInstructions(f.careInstructions.join("\n"));
      // Category dropdown defaults to "abaya"; only override if
      // the user hasn't touched it (i.e. it's still the default)
      // AND the AI's category is different.
      if (category === "abaya" && f.category !== "abaya") {
        setCategory(f.category);
      }
      // Auto-suggest a slug from the name if blank.
      if (!slug) {
        setSlug(
          f.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        );
      }
      setAiStatus("filled");
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "Analysis failed");
    }
  }

  return (
    <div className="space-y-5">
      {/* Primary image + AI analysis ---------------------------- */}
      <div>
        <ImageUploadField
          name="primaryImage"
          label="Primary image"
          folder="products"
          initialUrl={primaryImage}
          previewAspect="portrait"
          helper="Upload once — we'll auto-fill the rest of the catalog fields from the image (you can edit anything after)."
          onUploaded={(url) => {
            setPrimaryImage(url);
            void runAiAnalysis(url);
          }}
        />
        {aiStatus === "analyzing" && (
          <p className="mt-2 text-[12px] text-charcoal/70 bg-amber-light/40 border border-amber/30 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber animate-pulse" />
            Analysing image and drafting catalog fields…
          </p>
        )}
        {aiStatus === "filled" && (
          <p className="mt-2 text-[12px] text-green-dark bg-green/10 border border-green/30 rounded-lg px-3 py-1.5">
            Fields drafted from the image. Edit anything below before
            saving.
          </p>
        )}
        {aiStatus === "error" && aiError && (
          <p className="mt-2 text-[12px] text-amber-dark bg-amber-light/40 border border-amber/40 rounded-lg px-3 py-1.5">
            Couldn&apos;t analyse the image ({aiError}). Fill the fields
            yourself — the upload itself succeeded.
          </p>
        )}
      </div>

      {/* Gallery images ----------------------------------------- */}
      <MultiImageUploadField
        name="galleryImages"
        label="Gallery images"
        folder="products"
        initialUrls={galleryImages}
        helper="Optional. Add additional product photos for the gallery row on the detail page."
      />

      {/* Identity ----------------------------------------------- */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Sylhet Abaya"
            className={inputCx}
          />
        </Field>
        <Field label="Slug (URL)" htmlFor="slug">
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="the-sylhet-abaya"
            pattern="[a-z0-9-]+"
            className={`${inputCx} font-mono`}
          />
          <p className="mt-1 text-[11px] text-charcoal/50">
            Lowercase letters, numbers, hyphens. Stable — used in URLs
            and emailed in receipts.
          </p>
        </Field>
      </div>

      <Field label="Tagline" htmlFor="tagline">
        <input
          id="tagline"
          name="tagline"
          type="text"
          required
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Hand-stitched cotton-blend, designed for everyday modesty"
          className={inputCx}
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Long-form description. Use blank lines for paragraph breaks."
          className={inputCx}
        />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Category" htmlFor="category">
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className={inputCx}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SKU" htmlFor="sku">
          <input
            id="sku"
            name="sku"
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="DR-ABY-001"
            className={`${inputCx} font-mono`}
          />
        </Field>
        <Field label="Maker" htmlFor="makerId">
          <select
            id="makerId"
            name="makerId"
            required
            value={makerId}
            onChange={(e) => setMakerId(e.target.value)}
            className={inputCx}
          >
            {makers.length === 0 && (
              <option value="" disabled>
                No makers yet — create one first
              </option>
            )}
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.region}, {m.country})
                {m.isActive ? "" : " — hidden"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Pricing + stock ---------------------------------------- */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Field label="Price (pence)" htmlFor="pricePence">
          <input
            id="pricePence"
            name="pricePence"
            type="number"
            min={100}
            step={1}
            required
            value={pricePence}
            onChange={(e) => setPricePence(e.target.value)}
            placeholder="7900"
            className={inputCx}
          />
          <p className="mt-1 text-[11px] text-charcoal/50">7900 = £79.00</p>
        </Field>
        <Field label="Weight (g)" htmlFor="weightGrams">
          <input
            id="weightGrams"
            name="weightGrams"
            type="number"
            min={1}
            step={1}
            required
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            placeholder="480"
            className={inputCx}
          />
        </Field>
        <Field label="Stock count" htmlFor="stockCount">
          <input
            id="stockCount"
            name="stockCount"
            type="number"
            min={0}
            step={1}
            required
            value={stockCount}
            onChange={(e) => setStockCount(e.target.value)}
            className={inputCx}
          />
          <p className="mt-1 text-[11px] text-charcoal/50">
            For variant products, this is the total across variants and
            individual variant stock takes precedence at checkout.
          </p>
        </Field>
        <Field label="Low-stock threshold" htmlFor="lowStockThreshold">
          <input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            step={1}
            required
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className={inputCx}
          />
        </Field>
      </div>

      {/* Materials + care --------------------------------------- */}
      <Field label="Materials" htmlFor="materials">
        <input
          id="materials"
          name="materials"
          type="text"
          required
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          placeholder="70% cotton, 30% rayon, dyed with low-impact dyes"
          className={inputCx}
        />
      </Field>
      <Field
        label="Care instructions (one per line)"
        htmlFor="careInstructions"
      >
        <textarea
          id="careInstructions"
          name="careInstructions"
          rows={3}
          value={careInstructions}
          onChange={(e) => setCareInstructions(e.target.value)}
          placeholder={
            "Cold machine wash on a gentle cycle\nHang to dry in shade"
          }
          className={inputCx}
        />
      </Field>

      <Field label="Sizing guide (HTML, optional)" htmlFor="sizingGuideHtml">
        <textarea
          id="sizingGuideHtml"
          name="sizingGuideHtml"
          rows={4}
          value={sizingGuideHtml}
          onChange={(e) => setSizingGuideHtml(e.target.value)}
          placeholder='<p>Our abayas run true to UK sizing…</p>'
          className={`${inputCx} font-mono`}
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
        Active — visible on /bazaar (uncheck to hide without losing the row)
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
