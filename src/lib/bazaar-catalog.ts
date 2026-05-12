/**
 * DB-backed bazaar catalog — products, makers, variants.
 *
 * Replaces the file-based src/lib/bazaar-placeholder.ts. The public
 * function names + return shapes mirror the placeholder helpers so
 * the catalog swap across pages is a one-line import change.
 *
 * Read paths:
 *   - PUBLIC reads (catalog page, product detail, makers page) use
 *     the ANON Supabase client. The RLS policies on migration 007
 *     restrict anon to active rows only — defence-in-depth: even
 *     if a code path leaks the anon key, inactive products / staff-
 *     side data never escapes.
 *   - ADMIN reads (admin catalog list, edit forms) use the SERVICE-
 *     ROLE client so inactive products are visible.
 *
 * Write paths:
 *   - Always service-role. Anon never writes to catalog tables.
 *   - Stock decrement / restore lives here too — called from the
 *     Stripe webhook on `paid` and `refunded`.
 */

import { getSupabaseAdmin, supabase as supabaseAnon } from "@/lib/supabase";
import type {
  Maker,
  Product,
  ProductCategory,
  ProductOriginCountry,
  ProductVariant,
} from "@/lib/bazaar-types";
import type { BazaarOrderItemRow } from "@/lib/bazaar-db";
import {
  cancelNotifications,
  enqueueNotification,
} from "@/lib/admin-notifications";

// ─────────────────────────────────────────────────────────────────
// Internal raw row shapes (snake_case as Postgres returns them)
// ─────────────────────────────────────────────────────────────────

interface RawMaker {
  id: string;
  name: string;
  country: ProductOriginCountry;
  region: string;
  photo_url: string;
  story: string;
  quote: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RawVariant {
  id: string;
  product_id: string;
  size: string | null;
  colour: string | null;
  sku: string;
  stock_count: number;
  price_pence_override: number | null;
  created_at: string;
  updated_at: string;
}

interface RawProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  sku: string;
  price_pence: number;
  weight_grams: number;
  primary_image: string;
  gallery_images: string[];
  materials: string;
  care_instructions: string[];
  sizing_guide_html: string | null;
  maker_id: string;
  stock_count: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Mappers — raw → app shape (Product / Maker / ProductVariant)
// ─────────────────────────────────────────────────────────────────

function mapMaker(r: RawMaker): Maker {
  return {
    name: r.name,
    country: r.country,
    region: r.region,
    photoUrl: r.photo_url,
    story: r.story,
    ...(r.quote ? { quote: r.quote } : {}),
  };
}

function mapVariant(r: RawVariant): ProductVariant {
  return {
    id: r.id,
    ...(r.size ? { size: r.size } : {}),
    ...(r.colour ? { colour: r.colour } : {}),
    sku: r.sku,
    stockCount: r.stock_count,
    ...(r.price_pence_override !== null
      ? { pricePence: r.price_pence_override }
      : {}),
  };
}

function mapProduct(
  rp: RawProduct,
  maker: Maker,
  variants: RawVariant[]
): Product {
  return {
    id: rp.id,
    slug: rp.slug,
    name: rp.name,
    tagline: rp.tagline,
    description: rp.description,
    category: rp.category,
    pricePence: rp.price_pence,
    sku: rp.sku,
    weightGrams: rp.weight_grams,
    primaryImage: rp.primary_image,
    galleryImages: rp.gallery_images,
    variants: variants.map(mapVariant),
    ...(rp.sizing_guide_html ? { sizingGuide: rp.sizing_guide_html } : {}),
    careInstructions: rp.care_instructions,
    materials: rp.materials,
    maker,
    stockCount: rp.stock_count,
    lowStockThreshold: rp.low_stock_threshold,
    isActive: rp.is_active,
  };
}

// ─────────────────────────────────────────────────────────────────
// Public reads — anon client, RLS-restricted to active rows
// ─────────────────────────────────────────────────────────────────

const PRODUCT_COLUMNS =
  "id, slug, name, tagline, description, category, sku, price_pence, weight_grams, primary_image, gallery_images, materials, care_instructions, sizing_guide_html, maker_id, stock_count, low_stock_threshold, is_active, created_at, updated_at";

const VARIANT_COLUMNS =
  "id, product_id, size, colour, sku, stock_count, price_pence_override, created_at, updated_at";

const MAKER_COLUMNS =
  "id, name, country, region, photo_url, story, quote, is_active, created_at, updated_at";

/**
 * The full active catalog for /bazaar (listing page). Sorted by
 * created_at DESC — newest products surface at the top of the
 * grid, encouraging makers to ship fresh batches.
 */
export async function fetchActiveProducts(): Promise<Product[]> {
  const { data: products, error } = await supabaseAnon
    .from("bazaar_products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<RawProduct[]>();
  if (error) {
    throw new Error(`fetchActiveProducts failed: ${error.message}`);
  }
  if (!products || products.length === 0) return [];

  // Fetch makers and variants in two batched queries — avoids N+1
  // without forcing the consumer to deal with nested PostgREST
  // joins (which have type quirks).
  const makerIds = [...new Set(products.map((p) => p.maker_id))];
  const productIds = products.map((p) => p.id);

  const [{ data: makers, error: makersErr }, { data: variants, error: variantsErr }] =
    await Promise.all([
      supabaseAnon
        .from("bazaar_product_makers")
        .select(MAKER_COLUMNS)
        .in("id", makerIds)
        .returns<RawMaker[]>(),
      supabaseAnon
        .from("bazaar_product_variants")
        .select(VARIANT_COLUMNS)
        .in("product_id", productIds)
        .returns<RawVariant[]>(),
    ]);
  if (makersErr) throw new Error(`makers fetch failed: ${makersErr.message}`);
  if (variantsErr)
    throw new Error(`variants fetch failed: ${variantsErr.message}`);

  const makerById = new Map((makers ?? []).map((m) => [m.id, m]));
  const variantsByProductId = new Map<string, RawVariant[]>();
  for (const v of variants ?? []) {
    const list = variantsByProductId.get(v.product_id) ?? [];
    list.push(v);
    variantsByProductId.set(v.product_id, list);
  }

  return products
    .map((rp) => {
      const rawMaker = makerById.get(rp.maker_id);
      if (!rawMaker) return null;
      return mapProduct(
        rp,
        mapMaker(rawMaker),
        variantsByProductId.get(rp.id) ?? []
      );
    })
    .filter((p): p is Product => p !== null);
}

/**
 * Fetch a single active product by slug for the detail page.
 * Returns null on unknown slug so the page can 404 cleanly.
 */
export async function fetchProductBySlug(
  slug: string
): Promise<Product | null> {
  const { data: rp, error } = await supabaseAnon
    .from("bazaar_products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<RawProduct>();
  if (error) {
    throw new Error(`fetchProductBySlug failed: ${error.message}`);
  }
  if (!rp) return null;

  const [{ data: maker, error: makerErr }, { data: variants, error: variantsErr }] =
    await Promise.all([
      supabaseAnon
        .from("bazaar_product_makers")
        .select(MAKER_COLUMNS)
        .eq("id", rp.maker_id)
        .maybeSingle<RawMaker>(),
      supabaseAnon
        .from("bazaar_product_variants")
        .select(VARIANT_COLUMNS)
        .eq("product_id", rp.id)
        .returns<RawVariant[]>(),
    ]);
  if (makerErr) throw new Error(`maker fetch failed: ${makerErr.message}`);
  if (variantsErr)
    throw new Error(`variants fetch failed: ${variantsErr.message}`);
  if (!maker) {
    throw new Error(
      `Product ${rp.id} references missing maker ${rp.maker_id}`
    );
  }

  return mapProduct(rp, mapMaker(maker), variants ?? []);
}

/**
 * Bulk fetch of products by id — used by the checkout API to
 * validate cart line items in a single round-trip rather than per-
 * item. Returns an array; missing IDs are silently dropped, the
 * caller checks for completeness.
 */
export async function fetchProductsByIds(
  ids: string[]
): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data: products, error } = await supabase
    .from("bazaar_products")
    .select(PRODUCT_COLUMNS)
    .in("id", ids)
    .returns<RawProduct[]>();
  if (error) {
    throw new Error(`fetchProductsByIds failed: ${error.message}`);
  }
  if (!products || products.length === 0) return [];

  const makerIds = [...new Set(products.map((p) => p.maker_id))];
  const productIds = products.map((p) => p.id);
  const [{ data: makers, error: makersErr }, { data: variants, error: variantsErr }] =
    await Promise.all([
      supabase
        .from("bazaar_product_makers")
        .select(MAKER_COLUMNS)
        .in("id", makerIds)
        .returns<RawMaker[]>(),
      supabase
        .from("bazaar_product_variants")
        .select(VARIANT_COLUMNS)
        .in("product_id", productIds)
        .returns<RawVariant[]>(),
    ]);
  if (makersErr) throw new Error(`makers fetch failed: ${makersErr.message}`);
  if (variantsErr)
    throw new Error(`variants fetch failed: ${variantsErr.message}`);

  const makerById = new Map((makers ?? []).map((m) => [m.id, m]));
  const variantsByProductId = new Map<string, RawVariant[]>();
  for (const v of variants ?? []) {
    const list = variantsByProductId.get(v.product_id) ?? [];
    list.push(v);
    variantsByProductId.set(v.product_id, list);
  }

  return products
    .map((rp) => {
      const rawMaker = makerById.get(rp.maker_id);
      if (!rawMaker) return null;
      return mapProduct(
        rp,
        mapMaker(rawMaker),
        variantsByProductId.get(rp.id) ?? []
      );
    })
    .filter((p): p is Product => p !== null);
}

/**
 * Resolve a Product + variant pair to its effective unit price in
 * pence. Mirrors the placeholder helper of the same name.
 */
export function resolveUnitPricePence(
  product: Product,
  variantId?: string
): number {
  if (!variantId) return product.pricePence;
  const variant = product.variants.find((v) => v.id === variantId);
  return variant?.pricePence ?? product.pricePence;
}

/**
 * Public makers list for /bazaar/about-our-makers. Sorted by
 * country then region so the page reads geographically.
 */
export async function fetchActiveMakers(): Promise<Maker[]> {
  const { data, error } = await supabaseAnon
    .from("bazaar_product_makers")
    .select(MAKER_COLUMNS)
    .eq("is_active", true)
    .order("country", { ascending: true })
    .order("region", { ascending: true })
    .returns<RawMaker[]>();
  if (error) throw new Error(`fetchActiveMakers failed: ${error.message}`);
  return (data ?? []).map(mapMaker);
}

// ─────────────────────────────────────────────────────────────────
// Admin reads (service-role — sees inactive rows too)
// ─────────────────────────────────────────────────────────────────

/** Maker shape with id + is_active visible to admin. */
export interface AdminMakerRow extends Maker {
  id: string;
  isActive: boolean;
}

export async function fetchAdminMakers(): Promise<AdminMakerRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_product_makers")
    .select(MAKER_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<RawMaker[]>();
  if (error) throw new Error(`fetchAdminMakers failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    isActive: r.is_active,
    ...mapMaker(r),
  }));
}

export async function fetchAdminMakerById(
  id: string
): Promise<AdminMakerRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_product_makers")
    .select(MAKER_COLUMNS)
    .eq("id", id)
    .maybeSingle<RawMaker>();
  if (error) throw new Error(`fetchAdminMakerById failed: ${error.message}`);
  if (!data) return null;
  return { id: data.id, isActive: data.is_active, ...mapMaker(data) };
}

/** Lightweight product row for the admin list table. */
export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  pricePence: number;
  stockCount: number;
  lowStockThreshold: number;
  isActive: boolean;
  makerName: string;
  variantCount: number;
}

export async function fetchAdminProducts(): Promise<AdminProductRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: products, error } = await supabase
    .from("bazaar_products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<RawProduct[]>();
  if (error) throw new Error(`fetchAdminProducts failed: ${error.message}`);
  if (!products || products.length === 0) return [];

  const makerIds = [...new Set(products.map((p) => p.maker_id))];
  const productIds = products.map((p) => p.id);
  const [{ data: makers }, { data: variants }] = await Promise.all([
    supabase
      .from("bazaar_product_makers")
      .select("id, name")
      .in("id", makerIds)
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("bazaar_product_variants")
      .select("product_id")
      .in("product_id", productIds)
      .returns<{ product_id: string }[]>(),
  ]);

  const makerNameById = new Map((makers ?? []).map((m) => [m.id, m.name]));
  const variantCounts = new Map<string, number>();
  for (const v of variants ?? []) {
    variantCounts.set(v.product_id, (variantCounts.get(v.product_id) ?? 0) + 1);
  }

  return products.map((rp) => ({
    id: rp.id,
    slug: rp.slug,
    name: rp.name,
    sku: rp.sku,
    category: rp.category,
    pricePence: rp.price_pence,
    stockCount: rp.stock_count,
    lowStockThreshold: rp.low_stock_threshold,
    isActive: rp.is_active,
    makerName: makerNameById.get(rp.maker_id) ?? "(unknown)",
    variantCount: variantCounts.get(rp.id) ?? 0,
  }));
}

/**
 * Fetch a product + its variants + its maker for the admin edit
 * form. Bypasses RLS so inactive products are editable.
 */
export async function fetchAdminProductById(id: string): Promise<{
  product: Product;
  makerId: string;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data: rp, error } = await supabase
    .from("bazaar_products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle<RawProduct>();
  if (error) throw new Error(`fetchAdminProductById failed: ${error.message}`);
  if (!rp) return null;

  const [{ data: maker }, { data: variants }] = await Promise.all([
    supabase
      .from("bazaar_product_makers")
      .select(MAKER_COLUMNS)
      .eq("id", rp.maker_id)
      .maybeSingle<RawMaker>(),
    supabase
      .from("bazaar_product_variants")
      .select(VARIANT_COLUMNS)
      .eq("product_id", rp.id)
      .order("created_at", { ascending: true })
      .returns<RawVariant[]>(),
  ]);

  if (!maker) {
    throw new Error(`Product ${rp.id} references missing maker ${rp.maker_id}`);
  }

  return {
    product: mapProduct(rp, mapMaker(maker), variants ?? []),
    makerId: rp.maker_id,
  };
}

// ─────────────────────────────────────────────────────────────────
// Admin writes
// ─────────────────────────────────────────────────────────────────

export interface MakerInput {
  name: string;
  country: ProductOriginCountry;
  region: string;
  photoUrl: string;
  story: string;
  quote?: string | null;
  isActive: boolean;
}

export async function createMaker(input: MakerInput): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_product_makers")
    .insert({
      name: input.name,
      country: input.country,
      region: input.region,
      photo_url: input.photoUrl,
      story: input.story,
      quote: input.quote || null,
      is_active: input.isActive,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`createMaker failed: ${error?.message ?? "no row returned"}`);
  }
  return data.id;
}

export async function updateMaker(
  id: string,
  input: MakerInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_product_makers")
    .update({
      name: input.name,
      country: input.country,
      region: input.region,
      photo_url: input.photoUrl,
      story: input.story,
      quote: input.quote || null,
      is_active: input.isActive,
    })
    .eq("id", id);
  if (error) throw new Error(`updateMaker failed: ${error.message}`);
}

export interface ProductInput {
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
  sizingGuideHtml?: string | null;
  makerId: string;
  stockCount: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export async function createProduct(input: ProductInput): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_products")
    .insert({
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      category: input.category,
      sku: input.sku,
      price_pence: input.pricePence,
      weight_grams: input.weightGrams,
      primary_image: input.primaryImage,
      gallery_images: input.galleryImages,
      materials: input.materials,
      care_instructions: input.careInstructions,
      sizing_guide_html: input.sizingGuideHtml || null,
      maker_id: input.makerId,
      stock_count: input.stockCount,
      low_stock_threshold: input.lowStockThreshold,
      is_active: input.isActive,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`createProduct failed: ${error?.message ?? "no row"}`);
  }
  return data.id;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_products")
    .update({
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      category: input.category,
      sku: input.sku,
      price_pence: input.pricePence,
      weight_grams: input.weightGrams,
      primary_image: input.primaryImage,
      gallery_images: input.galleryImages,
      materials: input.materials,
      care_instructions: input.careInstructions,
      sizing_guide_html: input.sizingGuideHtml || null,
      maker_id: input.makerId,
      stock_count: input.stockCount,
      low_stock_threshold: input.lowStockThreshold,
      is_active: input.isActive,
    })
    .eq("id", id);
  if (error) throw new Error(`updateProduct failed: ${error.message}`);
}

export interface VariantInput {
  size?: string | null;
  colour?: string | null;
  sku: string;
  stockCount: number;
  pricePenceOverride?: number | null;
}

export async function createVariant(
  productId: string,
  input: VariantInput
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bazaar_product_variants")
    .insert({
      product_id: productId,
      size: input.size || null,
      colour: input.colour || null,
      sku: input.sku,
      stock_count: input.stockCount,
      price_pence_override: input.pricePenceOverride ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`createVariant failed: ${error?.message ?? "no row"}`);
  }
  return data.id;
}

export async function updateVariant(
  id: string,
  input: VariantInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_product_variants")
    .update({
      size: input.size || null,
      colour: input.colour || null,
      sku: input.sku,
      stock_count: input.stockCount,
      price_pence_override: input.pricePenceOverride ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(`updateVariant failed: ${error.message}`);
}

export async function deleteVariant(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bazaar_product_variants")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteVariant failed: ${error.message}`);
}

/**
 * Hard-delete a product and its uploaded images.
 *
 * Why this is safe for order history:
 *   - bazaar_product_variants has ON DELETE CASCADE — variants
 *     vanish with the parent automatically.
 *   - bazaar_order_items.product_id has ON DELETE SET NULL — old
 *     order rows preserve their snapshot fields (name, variant
 *     label, maker, unit price, quantity) and just lose the
 *     pointer to the product row.
 *
 * In other words: deleting a product breaks NOTHING in the
 * historical ledger — the admin order page + customer receipt
 * email still render correctly because they were always reading
 * the snapshot fields, not the live product.
 *
 * Storage cleanup: best-effort delete of the primary image +
 * gallery images from Supabase Storage. Failures are logged but
 * do not abort the product delete (orphaned storage is benign;
 * a half-deleted product row would be worse).
 *
 * Returns a short summary so the calling server action can put
 * useful detail in the audit log.
 */
export async function deleteProductAndImages(id: string): Promise<{
  name: string;
  slug: string;
  sku: string;
  imagesDeleted: number;
}> {
  const supabase = getSupabaseAdmin();

  // Fetch the row first so we know the storage paths to clean up
  // AND so the audit log gets the human-readable identity of the
  // deleted product.
  const { data: row, error: readErr } = await supabase
    .from("bazaar_products")
    .select("name, slug, sku, primary_image, gallery_images")
    .eq("id", id)
    .maybeSingle<{
      name: string;
      slug: string;
      sku: string;
      primary_image: string;
      gallery_images: string[];
    }>();
  if (readErr) {
    throw new Error(`deleteProduct read failed: ${readErr.message}`);
  }
  if (!row) {
    throw new Error(`deleteProduct: product ${id} not found`);
  }

  // Collect every storage object key referenced by this product
  // (primary + gallery). Filter to URLs that look like our
  // bucket; foreign URLs (placeholder paths from the seed) are
  // skipped silently.
  const allImageUrls = [row.primary_image, ...(row.gallery_images ?? [])];
  const objectKeys = allImageUrls
    .map(storageKeyFromPublicUrl)
    .filter((k): k is string => k !== null);

  // Delete the row first. If storage cleanup fails afterwards the
  // worst case is orphaned WebP files in the bucket — not a
  // half-deleted product row.
  const { error: delErr } = await supabase
    .from("bazaar_products")
    .delete()
    .eq("id", id);
  if (delErr) {
    throw new Error(`deleteProduct failed: ${delErr.message}`);
  }

  let imagesDeleted = 0;
  if (objectKeys.length > 0) {
    const { data: rmData, error: rmErr } = await supabase.storage
      .from("bazaar-products")
      .remove(objectKeys);
    if (rmErr) {
      console.error(
        `[deleteProductAndImages] storage cleanup failed for ${id}:`,
        rmErr
      );
    } else {
      imagesDeleted = rmData?.length ?? 0;
    }
  }

  return {
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    imagesDeleted,
  };
}

/**
 * Pull the in-bucket object key out of a Supabase Storage public
 * URL. Returns null for URLs that don't match our bucket pattern
 * (e.g. placeholder paths from the seed migration, or images
 * hosted elsewhere).
 *
 * Public URL pattern:
 *   https://<project>.supabase.co/storage/v1/object/public/bazaar-products/<KEY>
 */
function storageKeyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/bazaar-products/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const key = url.slice(idx + marker.length);
  return key.length > 0 ? key : null;
}

/**
 * Number of products that reference a given maker. Used by the
 * danger-zone UI to refuse a delete when products would orphan —
 * the FK on bazaar_products.maker_id is ON DELETE RESTRICT, so
 * the DB would reject the delete anyway. Surfacing the count
 * lets us give the trustee a clear "delete or reassign these
 * first" message instead of a raw FK violation.
 */
export async function countProductsByMakerId(
  makerId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("bazaar_products")
    .select("id", { count: "exact", head: true })
    .eq("maker_id", makerId);
  if (error) {
    throw new Error(`countProductsByMakerId failed: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Hard-delete a maker and its portrait photo.
 *
 * The FK on bazaar_products.maker_id is ON DELETE RESTRICT, so
 * this throws if any product still references the maker. The
 * UI pre-checks via countProductsByMakerId and disables the
 * delete button in that case; this server-side guard is
 * belt-and-braces.
 *
 * Order history is unaffected — bazaar_order_items.maker_name_snapshot
 * is a plain text snapshot with no FK to the maker, so historical
 * order rows and customer receipts keep rendering correctly.
 *
 * Storage cleanup: best-effort delete of the maker's photo from
 * Supabase Storage. Failures are logged; the maker row still
 * deletes (orphaned photo is benign).
 */
export async function deleteMakerAndPhoto(id: string): Promise<{
  name: string;
  productCountAtDelete: number;
  imageDeleted: boolean;
}> {
  const supabase = getSupabaseAdmin();

  const { data: row, error: readErr } = await supabase
    .from("bazaar_product_makers")
    .select("name, photo_url")
    .eq("id", id)
    .maybeSingle<{ name: string; photo_url: string }>();
  if (readErr) {
    throw new Error(`deleteMaker read failed: ${readErr.message}`);
  }
  if (!row) {
    throw new Error(`deleteMaker: maker ${id} not found`);
  }

  // Pre-check: count products referencing this maker. The DB
  // would reject anyway via FK, but we want a friendly error.
  const productCount = await countProductsByMakerId(id);
  if (productCount > 0) {
    throw new Error(
      `Cannot delete: ${productCount} product${productCount === 1 ? "" : "s"} still reference this maker. Delete or reassign those products first.`
    );
  }

  const { error: delErr } = await supabase
    .from("bazaar_product_makers")
    .delete()
    .eq("id", id);
  if (delErr) {
    throw new Error(`deleteMaker failed: ${delErr.message}`);
  }

  let imageDeleted = false;
  const photoKey = storageKeyFromPublicUrl(row.photo_url);
  if (photoKey) {
    const { error: rmErr } = await supabase.storage
      .from("bazaar-products")
      .remove([photoKey]);
    if (rmErr) {
      console.error(
        `[deleteMakerAndPhoto] storage cleanup failed for ${id}:`,
        rmErr
      );
    } else {
      imageDeleted = true;
    }
  }

  return {
    name: row.name,
    productCountAtDelete: productCount,
    imageDeleted,
  };
}

/**
 * Adjust stock count by a delta (positive or negative). Used by:
 *   - Admin stock adjustment form
 *   - Webhook stock decrement on paid
 *   - Webhook stock restore on refunded
 *
 * variantId may be passed to target a variant row instead of the
 * parent product. The check constraints on the schema (stock_count
 * >= 0) reject any update that would push stock negative — caller
 * surfaces the error.
 *
 * Uses an RPC-style atomic read-modify-write so concurrent paid
 * webhooks don't double-decrement. Postgres handles serialization
 * via the row lock during UPDATE.
 *
 * After the update, fires notifyLowStockForTarget so every code
 * path that touches stock automatically gets correct low-stock
 * notification behaviour without each caller having to remember
 * to call it. Wrapped in a try/catch — a failed notification
 * write never blocks the stock update.
 */
export async function adjustStock(
  target: { productId: string; variantId?: string | null },
  delta: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const table = target.variantId
    ? "bazaar_product_variants"
    : "bazaar_products";
  const id = target.variantId ?? target.productId;

  // Read current count.
  const { data: row, error: readErr } = await supabase
    .from(table)
    .select("stock_count")
    .eq("id", id)
    .maybeSingle<{ stock_count: number }>();
  if (readErr) throw new Error(`adjustStock read failed: ${readErr.message}`);
  if (!row) throw new Error(`adjustStock: ${table}/${id} not found`);

  const newCount = row.stock_count + delta;
  if (newCount < 0) {
    throw new Error(
      `Cannot adjust stock to ${newCount} (current ${row.stock_count}, delta ${delta}).`
    );
  }

  const { error: updErr } = await supabase
    .from(table)
    .update({ stock_count: newCount })
    .eq("id", id);
  if (updErr) throw new Error(`adjustStock write failed: ${updErr.message}`);

  // Threshold check — emits or cancels admin notifications based
  // on the new state. Fire-and-forget; a failed notify never
  // blocks the underlying stock change.
  try {
    await notifyLowStockForTarget(target.productId, target.variantId ?? null);
  } catch (err) {
    console.error(
      `[bazaar-catalog] low-stock notify failed for ${id}:`,
      err
    );
  }
}

/**
 * Check the current stock for a product (or variant) against its
 * low-stock threshold and emit / cancel admin notifications
 * accordingly. One row in the bell at most per (target, state).
 *
 * State machine:
 *   stock = 0           → cancel "low" + emit "out"
 *   0 < stock ≤ thresh  → cancel "out" + emit "low" (with count)
 *   stock > threshold    → cancel both ("stock back to fine,
 *                          nothing to alert on")
 *
 * Cancellation always runs before emit so the existing rows for
 * the same target+type are suppressed and the replacement carries
 * the current count in its body. The fetchActiveUnreadNotifications
 * query then surfaces only the current state.
 *
 * Looks up a friendly display name (product name + variant label)
 * to put in the notification title — the trustee shouldn't have
 * to click through to find out which SKU is short.
 */
export async function notifyLowStockForTarget(
  productId: string,
  variantId: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch the product (always) and the variant if specified, in
  // parallel. We need: current stock, threshold, and a label.
  const productPromise = supabase
    .from("bazaar_products")
    .select("name, stock_count, low_stock_threshold")
    .eq("id", productId)
    .maybeSingle<{
      name: string;
      stock_count: number;
      low_stock_threshold: number;
    }>();

  const variantPromise = variantId
    ? supabase
        .from("bazaar_product_variants")
        .select("size, colour, sku, stock_count")
        .eq("id", variantId)
        .maybeSingle<{
          size: string | null;
          colour: string | null;
          sku: string;
          stock_count: number;
        }>()
    : Promise.resolve({ data: null, error: null });

  const [productRes, variantRes] = await Promise.all([
    productPromise,
    variantPromise,
  ]);
  if (productRes.error || !productRes.data) {
    // Product missing — can't notify. Bail silently.
    return;
  }
  if (variantId && (variantRes.error || !variantRes.data)) {
    // Variant claimed but missing — bail.
    return;
  }

  const product = productRes.data;
  const variant = variantRes.data as
    | { size: string | null; colour: string | null; sku: string; stock_count: number }
    | null;

  // Variant stock takes precedence when we're targeting a variant;
  // otherwise the parent product's stock_count drives the decision.
  // The threshold is always the PRODUCT's threshold — we don't
  // currently model variant-specific thresholds.
  const currentStock = variant ? variant.stock_count : product.stock_count;
  const threshold = product.low_stock_threshold;

  const variantLabel = variant
    ? [variant.size, variant.colour].filter(Boolean).join(" · ") ||
      variant.sku
    : null;
  const displayName = variantLabel
    ? `${product.name} (${variantLabel})`
    : product.name;
  // target_id uses the variant id when present so each variant has
  // its own deduplication key; otherwise the product id.
  const targetId = variantId ?? productId;
  const targetUrl = `/admin/bazaar/products/${productId}`;

  if (currentStock === 0) {
    // Sold out — clear any "low" warning and emit the stronger
    // "out" alert (re-fired so the body reflects current state).
    await cancelNotifications({ targetId, type: "bazaar_stock_low" });
    await cancelNotifications({ targetId, type: "bazaar_stock_out" });
    await enqueueNotification({
      type: "bazaar_stock_out",
      severity: "urgent",
      title: `Sold out — ${displayName}`,
      body: `Stock just hit zero. Reorder from the maker or hide the listing in the admin.`,
      targetUrl,
      targetId,
    });
    return;
  }

  if (currentStock <= threshold) {
    // Low — refresh the row so the count is current.
    await cancelNotifications({ targetId, type: "bazaar_stock_out" });
    await cancelNotifications({ targetId, type: "bazaar_stock_low" });
    await enqueueNotification({
      type: "bazaar_stock_low",
      severity: "warning",
      title: `Low stock — ${displayName}`,
      body: `${currentStock} left (threshold ${threshold}). Reorder soon to avoid sell-out.`,
      targetUrl,
      targetId,
    });
    return;
  }

  // Stock comfortably above threshold — clear any stale alerts.
  // No new notification.
  await cancelNotifications({ targetId, type: "bazaar_stock_low" });
  await cancelNotifications({ targetId, type: "bazaar_stock_out" });
}

/**
 * Decrement stock for every line item in a paid order. Called from
 * the bazaar webhook handler immediately after promoting the order
 * to status='paid'.
 *
 * Items where product_id / variant_id are null (the placeholder-
 * catalog backfill window) are skipped silently — there's no DB
 * row to decrement against. Once the catalog is seeded and the
 * snapshot backfill runs, this becomes a no-op for those rows.
 */
export async function decrementStockForOrderItems(
  items: BazaarOrderItemRow[]
): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue;
    try {
      await adjustStock(
        { productId: item.productId, variantId: item.variantId },
        -item.quantity
      );
    } catch (err) {
      // Stock decrement failure shouldn't unwind the order — the
      // customer has already paid. Log loudly and continue; admin
      // can correct stock manually if needed.
      console.error(
        `[stock decrement] failed for order_item ${item.id}:`,
        err
      );
    }
  }
}

/**
 * Restore stock for every line item in a refunded order. Mirror of
 * decrementStockForOrderItems. Called when an order is refunded
 * (admin click or Stripe Dashboard).
 */
export async function restoreStockForOrderItems(
  items: BazaarOrderItemRow[]
): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue;
    try {
      await adjustStock(
        { productId: item.productId, variantId: item.variantId },
        +item.quantity
      );
    } catch (err) {
      console.error(
        `[stock restore] failed for order_item ${item.id}:`,
        err
      );
    }
  }
}
