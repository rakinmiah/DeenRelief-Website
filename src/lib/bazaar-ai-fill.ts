/**
 * AI-assisted catalog field auto-fill.
 *
 * Given a product image, returns a structured set of catalog
 * fields the admin can review before saving. The admin always
 * has final edit rights — this is "smart defaults", not "trust
 * the bot".
 *
 * Model: OpenAI gpt-4o (vision + structured JSON output). Cost
 * at typical product-photo sizes is around half a cent per call.
 *
 * The system prompt:
 *   - Sets the brand voice (artisan / charity / honest — not
 *     marketing fluff)
 *   - Restricts category to the schema enum so we never get a
 *     value Postgres will reject
 *   - Includes several real placeholder products as few-shot
 *     examples so the voice matches the existing catalog
 *   - Requests strict JSON output (parsed + type-narrowed
 *     defensively before being returned)
 *
 * What the AI fills:
 *   name, tagline, description, category, materials,
 *   careInstructions
 *
 * What it intentionally doesn't:
 *   price (operational), sku (admin convention), weight
 *   (needs scale), stock count + threshold (operational), sizing
 *   guide (operational).
 *
 * Failure mode: throws on any error (HTTP error from OpenAI,
 * malformed JSON, missing env). The route surfaces the error
 * to the admin UI as a non-blocking warning — the upload still
 * succeeded, the admin just types the fields themselves.
 */

import type { ProductCategory } from "@/lib/bazaar-types";

const ALLOWED_CATEGORIES: ProductCategory[] = [
  "abaya",
  "thobe",
  "prayer-mat",
  "hijab",
  "tasbih",
  "quran-cover",
  "kufi",
  "kids",
];

export interface AiFillResult {
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  materials: string;
  careInstructions: string[];
}

const SYSTEM_PROMPT = `You are a catalog writer for Deen Relief Bazaar, a small Islamic-goods shop run by a UK charity. Every item is hand-made by named artisans in Bangladesh and Turkey, and the shop's brand voice is specific, honest, and slightly under-promising — never marketing fluff.

Reference voice from existing catalog items:

PRODUCT: The Sylhet Abaya (abaya)
TAGLINE: Hand-stitched cotton-blend, designed for everyday modesty
DESCRIPTION: A flowing, breathable abaya cut from a soft cotton-rayon blend that drapes beautifully and holds its shape through the day.

Each piece is hand-finished in Sylhet, Bangladesh — the side seams, the cuffs, and the discreet pocket lining are all sewn one stitch at a time. The fabric is sourced from a small mill in Narayanganj that pays its weavers above the regional minimum wage.

Designed for school runs, work, the masjid, and everywhere in between.
MATERIALS: 70% cotton, 30% rayon, dyed with low-impact dyes in Narayanganj
CARE: ["Cold machine wash on a gentle cycle", "Hang to dry in shade — direct sunlight may fade the dye", "Iron on medium with the garment turned inside out"]

PRODUCT: The Adana Tasbih (tasbih)
TAGLINE: Hand-carved olive wood, 99 beads
DESCRIPTION: A traditional 99-bead tasbih hand-carved from a single piece of Anatolian olive wood. Each bead is sanded by hand to a soft matte finish; the tassel is finished with a brass cap and a simple silk cord.

Made by Yusuf in his workshop in Adana, who has been carving tasbih since he was twelve.
MATERIALS: Anatolian olive wood, brass cap, silk cord
CARE: ["Wipe with a soft dry cloth", "Avoid water — the wood will warp", "A drop of olive oil once a year keeps the colour deep"]

Voice rules:
- Concrete details over adjectives. "Cotton-rayon blend" over "premium fabric".
- One short factual tagline (≤ 12 words). No marketing exclamations.
- Description: 2-4 paragraphs, ~80-150 words total. Use blank lines for paragraph breaks. Mention the maker / region / craft technique where the image suggests it.
- Materials: a single comma-separated technical line. Avoid superlatives.
- Care: 2-4 short, plain-English instruction lines.

You will receive a product photo. Identify the product, then write the fields in this exact JSON shape:

{
  "name": "string — capitalised, often starts with 'The'",
  "tagline": "string",
  "description": "string with \\n\\n paragraph breaks",
  "category": "one of: ${ALLOWED_CATEGORIES.join(" | ")}",
  "materials": "string",
  "careInstructions": ["string", "string", "..."]
}

If the image is ambiguous, infer the most likely interpretation and proceed. Do not refuse. Do not include any text outside the JSON object.`;

/**
 * Send the image bytes to OpenAI gpt-4o and parse the response
 * into a typed AiFillResult. Throws on any failure; the caller
 * surfaces the error.
 *
 * imageBuffer should be the original (or processed) image bytes;
 * we base64-encode + send as a data URL inline. For images
 * already in Supabase Storage, pass the URL via `imageUrl`
 * instead (saves the round-trip of re-encoding).
 */
export async function aiFillFromImage(input: {
  imageBuffer?: Buffer;
  imageContentType?: string;
  imageUrl?: string;
}): Promise<AiFillResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  // Build the image payload — prefer URL when given (cheaper +
  // OpenAI's CDN does the fetch), otherwise inline as data URL.
  let imageUrlPart: string;
  if (input.imageUrl) {
    imageUrlPart = input.imageUrl;
  } else if (input.imageBuffer && input.imageContentType) {
    const b64 = input.imageBuffer.toString("base64");
    imageUrlPart = `data:${input.imageContentType};base64,${b64}`;
  } else {
    throw new Error(
      "aiFillFromImage requires either imageUrl or both imageBuffer + imageContentType."
    );
  }

  // Use the SDK rather than raw fetch — handles retries, errors,
  // and structured types. Loaded dynamically so cold-start of
  // routes that don't analyse images doesn't pay the cost.
  const OpenAIModule = await import("openai");
  const OpenAI = OpenAIModule.default;
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    // JSON mode forces the model to return valid JSON. Combined
    // with the system prompt's schema, gives us a strict-enough
    // contract for the parse below.
    response_format: { type: "json_object" },
    // 0.4 — low enough to keep voice consistent, high enough to
    // let the model use product-specific wording.
    temperature: 0.4,
    // Generous ceiling so the full description doesn't get cut off
    // mid-paragraph. Typical responses are ~400–600 tokens.
    max_tokens: 1200,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Here is the product photo. Generate the catalog fields per the schema.",
          },
          {
            type: "image_url",
            image_url: { url: imageUrlPart, detail: "high" },
          },
        ],
      },
    ],
  });

  // Distinguish the failure modes so the admin UI surfaces
  // something actionable rather than the generic "empty response".
  //   1) Explicit refusal field — content policy block.
  //   2) finish_reason "length" — output truncated.
  //   3) Empty content — usually an implicit refusal because the
  //      image isn't a clear product (people, scenes, screenshots).
  //      Model declined to hallucinate product data; tell the
  //      admin to upload an actual product photo.
  const choice = completion.choices[0];
  const message = choice?.message;
  const refusal = (message as { refusal?: string } | undefined)?.refusal;
  if (refusal) {
    throw new Error(
      `The AI declined to analyse this image (${refusal}). Try a clear product-only photo on a plain background.`
    );
  }
  if (choice?.finish_reason === "length") {
    throw new Error(
      "AI response was cut off before completion. Try again — if it persists, the image may be too complex to caption."
    );
  }
  const raw = message?.content;
  if (!raw) {
    throw new Error(
      "AI returned no fields — usually because the image isn't a clearly-identifiable product (e.g. it shows people, a scene, or text). Upload a clean product-only photo (laid flat or on a model is fine) and retry."
    );
  }

  // Defensive parse — JSON mode guarantees valid JSON but not
  // schema conformance. Reject anything missing fields or with
  // out-of-range values.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI returned non-JSON: ${raw.slice(0, 200)}`);
  }
  return validateAiResult(parsed);
}

function validateAiResult(value: unknown): AiFillResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }
  const obj = value as Record<string, unknown>;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const tagline = typeof obj.tagline === "string" ? obj.tagline.trim() : "";
  const description =
    typeof obj.description === "string" ? obj.description.trim() : "";
  const materials =
    typeof obj.materials === "string" ? obj.materials.trim() : "";
  const categoryRaw =
    typeof obj.category === "string" ? obj.category.trim().toLowerCase() : "";

  const careInstructions = Array.isArray(obj.careInstructions)
    ? obj.careInstructions
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (!ALLOWED_CATEGORIES.includes(categoryRaw as ProductCategory)) {
    throw new Error(
      `AI returned invalid category "${categoryRaw}". Valid: ${ALLOWED_CATEGORIES.join(", ")}`
    );
  }
  if (!name || !tagline || !description || !materials || careInstructions.length === 0) {
    throw new Error("AI response is missing required fields.");
  }

  return {
    name,
    tagline,
    description,
    category: categoryRaw as ProductCategory,
    materials,
    careInstructions,
  };
}
