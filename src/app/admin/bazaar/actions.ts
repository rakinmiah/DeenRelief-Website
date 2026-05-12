"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import {
  createMaker,
  createProduct,
  createVariant,
  deleteProductAndImages,
  deleteVariant,
  adjustStock,
  deleteMakerAndPhoto,
  updateMaker,
  updateProduct,
  updateVariant,
  type MakerInput,
  type ProductInput,
  type VariantInput,
} from "@/lib/bazaar-catalog";
import type { ProductCategory, ProductOriginCountry } from "@/lib/bazaar-types";

/**
 * Server actions for the bazaar catalog admin pages.
 *
 * Server actions vs API routes: forms in the admin call these
 * directly via the `action={…}` prop. No fetch wrapper, no JSON
 * serialisation step on either side — the Next.js runtime takes
 * care of it. Tradeoff: actions can't be called from outside the
 * Next.js process (e.g. Stripe webhooks still use API routes).
 *
 * Auth: requireAdminSession() reads the dr_admin_session cookie
 * and throws (which Next surfaces as a 500) when missing. Forms
 * are only reachable from /admin/bazaar/* pages which themselves
 * require the session, so the check is belt-and-braces.
 *
 * Revalidation: after each write we revalidatePath() the affected
 * routes so the public catalog reflects the change on next request
 * (and the admin list redraws without a manual reload).
 *
 * All audit logging happens AFTER the DB write succeeds — we never
 * log a write that didn't happen.
 */

// Helper: re-create a Request-shaped headers bag for the audit
// logger. Server actions don't get a Request object the way an API
// route does, so we synthesise one from the next/headers helper.
async function audit(action: Parameters<typeof logAdminAction>[0]["action"], opts: {
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const session = await requireAdminSession();
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logAdminAction({
    action,
    userEmail: session.email,
    targetId: opts.targetId ?? null,
    metadata: opts.metadata,
    request: fauxRequest,
  });
}

// ─────────────────────────────────────────────────────────────────
// Makers
// ─────────────────────────────────────────────────────────────────

function parseMakerForm(data: FormData): MakerInput {
  const country = String(data.get("country") ?? "");
  const allowedCountries: ProductOriginCountry[] = [
    "Bangladesh",
    "Turkey",
    "Pakistan",
  ];
  if (!allowedCountries.includes(country as ProductOriginCountry)) {
    throw new Error(`Country must be one of: ${allowedCountries.join(", ")}`);
  }
  return {
    name: String(data.get("name") ?? "").trim(),
    country: country as ProductOriginCountry,
    region: String(data.get("region") ?? "").trim(),
    photoUrl: String(data.get("photoUrl") ?? "").trim(),
    story: String(data.get("story") ?? "").trim(),
    quote: String(data.get("quote") ?? "").trim() || null,
    isActive: data.get("isActive") === "on",
  };
}

export async function createMakerAction(data: FormData): Promise<void> {
  await requireAdminSession();
  const input = parseMakerForm(data);
  const newId = await createMaker(input);
  await audit("create_bazaar_maker", {
    targetId: newId,
    metadata: { name: input.name, country: input.country, region: input.region },
  });
  revalidatePath("/admin/bazaar/makers");
  revalidatePath("/bazaar/about-our-makers");
  redirect(`/admin/bazaar/makers/${newId}`);
}

export async function updateMakerAction(
  id: string,
  data: FormData
): Promise<void> {
  await requireAdminSession();
  const input = parseMakerForm(data);
  await updateMaker(id, input);
  await audit("update_bazaar_maker", {
    targetId: id,
    metadata: {
      name: input.name,
      country: input.country,
      region: input.region,
      isActive: input.isActive,
    },
  });
  revalidatePath("/admin/bazaar/makers");
  revalidatePath(`/admin/bazaar/makers/${id}`);
  revalidatePath("/bazaar/about-our-makers");
  // Re-render the form with the updated values.
  redirect(`/admin/bazaar/makers/${id}?saved=1`);
}

/**
 * Hard-delete a maker and their portrait photo.
 *
 * The DB-level FK from bazaar_products.maker_id is ON DELETE
 * RESTRICT, so this throws if any product still references the
 * maker. The danger-zone UI pre-checks the product count and
 * refuses to even show the delete button when products exist —
 * but this server-side check is the actual authority.
 *
 * Order history is unaffected: bazaar_order_items.maker_name_snapshot
 * is a plain string captured at purchase time, with no FK to the
 * maker, so customer receipts and admin order pages keep
 * rendering correctly.
 */
export async function deleteMakerAction(id: string): Promise<void> {
  await requireAdminSession();
  const result = await deleteMakerAndPhoto(id);
  await audit("delete_bazaar_maker", {
    targetId: id,
    metadata: {
      name: result.name,
      imageDeleted: result.imageDeleted,
    },
  });
  revalidatePath("/admin/bazaar/makers");
  revalidatePath("/admin/bazaar/catalog");
  revalidatePath("/bazaar/about-our-makers");
  redirect("/admin/bazaar/makers?deleted=1");
}

// ─────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────

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

function parsePencePositive(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Value must be a non-negative number (in pence)");
  }
  return Math.round(n);
}

function parseProductForm(data: FormData): ProductInput {
  const category = String(data.get("category") ?? "");
  if (!ALLOWED_CATEGORIES.includes(category as ProductCategory)) {
    throw new Error(`Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }
  // gallery_images + care_instructions are textarea-input as one-per-
  // line. Trim + drop empty lines.
  const splitLines = (raw: string): string[] =>
    raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    slug: String(data.get("slug") ?? "").trim(),
    name: String(data.get("name") ?? "").trim(),
    tagline: String(data.get("tagline") ?? "").trim(),
    description: String(data.get("description") ?? ""),
    category: category as ProductCategory,
    sku: String(data.get("sku") ?? "").trim(),
    pricePence: parsePencePositive(data.get("pricePence")),
    weightGrams: parsePencePositive(data.get("weightGrams")),
    primaryImage: String(data.get("primaryImage") ?? "").trim(),
    galleryImages: splitLines(String(data.get("galleryImages") ?? "")),
    materials: String(data.get("materials") ?? "").trim(),
    careInstructions: splitLines(String(data.get("careInstructions") ?? "")),
    sizingGuideHtml: String(data.get("sizingGuideHtml") ?? "").trim() || null,
    makerId: String(data.get("makerId") ?? "").trim(),
    stockCount: parsePencePositive(data.get("stockCount")),
    lowStockThreshold: parsePencePositive(data.get("lowStockThreshold")),
    isActive: data.get("isActive") === "on",
  };
}

export async function createProductAction(data: FormData): Promise<void> {
  await requireAdminSession();
  const input = parseProductForm(data);
  const newId = await createProduct(input);
  await audit("create_bazaar_product", {
    targetId: newId,
    metadata: { slug: input.slug, name: input.name, sku: input.sku },
  });
  revalidatePath("/admin/bazaar/products");
  revalidatePath("/bazaar");
  redirect(`/admin/bazaar/products/${newId}`);
}

export async function updateProductAction(
  id: string,
  data: FormData
): Promise<void> {
  await requireAdminSession();
  const input = parseProductForm(data);
  await updateProduct(id, input);
  await audit("update_bazaar_product", {
    targetId: id,
    metadata: {
      slug: input.slug,
      name: input.name,
      sku: input.sku,
      pricePence: input.pricePence,
      stockCount: input.stockCount,
      isActive: input.isActive,
    },
  });
  revalidatePath("/admin/bazaar/products");
  revalidatePath(`/admin/bazaar/products/${id}`);
  revalidatePath("/bazaar");
  revalidatePath(`/bazaar/${input.slug}`);
  redirect(`/admin/bazaar/products/${id}?saved=1`);
}

/**
 * Hard-delete a product, its variants (via FK cascade), and its
 * uploaded images. Order history is preserved automatically — the
 * bazaar_order_items rows lose their pointer (ON DELETE SET NULL)
 * but keep every snapshot field, so the admin order page and
 * customer receipts continue rendering correctly.
 *
 * Irreversible from the admin UI; we audit-log the product
 * identity (name, slug, sku) so a trustee can prove the delete
 * happened and against which row.
 *
 * After delete: redirect to the products list (the row's edit
 * page no longer exists).
 */
export async function deleteProductAction(id: string): Promise<void> {
  await requireAdminSession();
  const result = await deleteProductAndImages(id);
  await audit("delete_bazaar_product", {
    targetId: id,
    metadata: {
      name: result.name,
      slug: result.slug,
      sku: result.sku,
      imagesDeleted: result.imagesDeleted,
    },
  });
  revalidatePath("/admin/bazaar/products");
  revalidatePath("/admin/bazaar/catalog");
  revalidatePath("/bazaar");
  revalidatePath(`/bazaar/${result.slug}`);
  redirect("/admin/bazaar/products?deleted=1");
}

// ─────────────────────────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────────────────────────

function parseVariantForm(data: FormData): VariantInput {
  const overrideRaw = String(data.get("pricePenceOverride") ?? "").trim();
  return {
    size: String(data.get("size") ?? "").trim() || null,
    colour: String(data.get("colour") ?? "").trim() || null,
    sku: String(data.get("sku") ?? "").trim(),
    stockCount: parsePencePositive(data.get("stockCount")),
    pricePenceOverride: overrideRaw === "" ? null : parsePencePositive(overrideRaw),
  };
}

export async function createVariantAction(
  productId: string,
  data: FormData
): Promise<void> {
  await requireAdminSession();
  const input = parseVariantForm(data);
  const newId = await createVariant(productId, input);
  await audit("create_bazaar_variant", {
    targetId: newId,
    metadata: {
      productId,
      sku: input.sku,
      size: input.size,
      colour: input.colour,
      stockCount: input.stockCount,
    },
  });
  revalidatePath(`/admin/bazaar/products/${productId}`);
  revalidatePath("/bazaar");
}

export async function updateVariantAction(
  variantId: string,
  productId: string,
  data: FormData
): Promise<void> {
  await requireAdminSession();
  const input = parseVariantForm(data);
  await updateVariant(variantId, input);
  await audit("update_bazaar_variant", {
    targetId: variantId,
    metadata: {
      productId,
      sku: input.sku,
      stockCount: input.stockCount,
    },
  });
  revalidatePath(`/admin/bazaar/products/${productId}`);
  revalidatePath("/bazaar");
}

export async function deleteVariantAction(
  variantId: string,
  productId: string
): Promise<void> {
  await requireAdminSession();
  await deleteVariant(variantId);
  await audit("delete_bazaar_variant", {
    targetId: variantId,
    metadata: { productId },
  });
  revalidatePath(`/admin/bazaar/products/${productId}`);
  revalidatePath("/bazaar");
}

// ─────────────────────────────────────────────────────────────────
// Stock adjustment (separate audit action — explicit and auditable
// rather than buried in an edit)
// ─────────────────────────────────────────────────────────────────

export async function adjustStockAction(
  productId: string,
  data: FormData
): Promise<void> {
  await requireAdminSession();
  const variantId = String(data.get("variantId") ?? "").trim() || null;
  const deltaRaw = String(data.get("delta") ?? "");
  const delta = Number(deltaRaw);
  const reason = String(data.get("reason") ?? "").trim() || null;
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Delta must be a non-zero number");
  }
  await adjustStock({ productId, variantId }, delta);
  await audit("adjust_bazaar_stock", {
    targetId: variantId ?? productId,
    metadata: { productId, variantId, delta, reason },
  });
  revalidatePath(`/admin/bazaar/products/${productId}`);
  revalidatePath("/bazaar");
}
