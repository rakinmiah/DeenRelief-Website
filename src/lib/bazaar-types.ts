/**
 * Type definitions for the Deen Relief Bazaar.
 *
 * These types model the future Supabase schema 1:1 — when we wire the real
 * backend, the only changes needed are the data source (fixture file →
 * Supabase queries). The UI and business logic don't move.
 *
 * Money: stored as integer pence (avoids floating-point rounding bugs on
 * VAT, shipping, refunds). All formatting to "£X.XX" is at the display
 * boundary only.
 */

export type ProductCategory =
  | "abaya"
  | "thobe"
  | "prayer-mat"
  | "hijab"
  | "tasbih"
  | "quran-cover"
  | "kufi"
  | "kids";

export type ProductOriginCountry = "Bangladesh" | "Turkey" | "Pakistan";

export interface Maker {
  /** First name + last initial — protects identity, fits on the parcel tag. */
  name: string;
  country: ProductOriginCountry;
  /** Region/city for specificity ("Sylhet", "Adana"). */
  region: string;
  /** Photograph of the maker at work. Real shoots replace placeholders. */
  photoUrl: string;
  /** Short bio shown on product page. ~60-100 words. Real-life context. */
  story: string;
  /** Optional voice quote — direct, in-makers-words, translated. */
  quote?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** One-line marketing tagline shown under the product name. */
  tagline: string;
  /** Long-form description, supports paragraph breaks via \n\n. */
  description: string;
  category: ProductCategory;
  pricePence: number;
  /** Stripe-side SKU; we also use this in Royal Mail Click & Drop CSVs. */
  sku: string;
  /** Grams; used for shipping rate calculation if we move beyond flat rate. */
  weightGrams: number;
  /** Primary catalog image. */
  primaryImage: string;
  /** Additional product photography for the detail page gallery. */
  galleryImages: string[];
  /** Available sizes/colours, if any. Empty array = no variants. */
  variants: ProductVariant[];
  /** Sizing guide HTML for clothing items. Optional. */
  sizingGuide?: string;
  /** Care instructions (washing, storage). */
  careInstructions: string[];
  /** Materials disclosure. */
  materials: string;
  maker: Maker;
  /** Total stock count (sum of variants if variants present). */
  stockCount: number;
  /** Below this, the product card shows a "low stock" indicator. */
  lowStockThreshold: number;
  /** Hides the product from catalog but keeps order history references valid. */
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  /** Free-text size label — "S", "M", "L", "Small", or "32" (chest cm). */
  size?: string;
  /** Free-text colour label. */
  colour?: string;
  sku: string;
  stockCount: number;
  /** Override of the parent price when the variant costs more (e.g. XXL). */
  pricePence?: number;
}

export interface CartLineItem {
  productId: string;
  variantId?: string;
  quantity: number;
  /** Snapshot of unit price at add-to-cart time — protects against price
   *  changes mid-session. Reconciled against current price at checkout. */
  unitPricePenceSnapshot: number;
  /**
   * Display snapshots captured at add-to-cart time. With the catalog
   * now in Supabase rather than the placeholder file, the cart page
   * can't synchronously look up product info — so we snapshot what
   * we need for rendering into the cart row itself. These are
   * DISPLAY-ONLY; the checkout API re-fetches the current
   * authoritative product + price from the DB before charging.
   */
  productNameSnapshot: string;
  /** Slug for the "view product" link from the cart line. */
  productSlugSnapshot: string;
  /** "Size: Medium" / "Cream" / similar — pre-formatted for display. */
  variantLabelSnapshot?: string;
  /** Maker first-name-plus-initial for the "Made by X" line in cart. */
  makerNameSnapshot: string;
  /** Primary product image URL captured at add-to-cart time so the
   *  cart thumbnail renders without re-querying the catalog.
   *  Optional — legacy carts in localStorage from before this field
   *  existed render the placeholder instead. */
  productImageSnapshot?: string;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "delivered"
  | "refunded"
  | "cancelled";

export type RoyalMailService =
  | "tracked-48"
  | "tracked-24"
  | "special-delivery";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: "GB"; // UK only at launch
}

export interface Order {
  id: string;
  /** Linked donor record if the customer signed in / matched on email. */
  donorIdOptional?: string;
  contactEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  currency: "GBP";
  shippingAddress: ShippingAddress;
  /** Stripe payment intent ID — primary key for reconciliation. */
  stripePaymentIntent: string;
  stripeSessionId?: string;
  createdAt: string; // ISO timestamp
  fulfilledAt?: string;
  trackingNumber?: string;
  royalMailService?: RoyalMailService;
  /** Free-text internal notes for the fulfilment team. */
  internalNotes?: string;
}

export interface OrderItem {
  /**
   * Snapshot of product info at purchase time — keeps order history stable
   * if we later edit the catalog (rename, delete, or change makers).
   */
  productId: string;
  variantId?: string;
  productNameSnapshot: string;
  variantSnapshot?: string;
  unitPricePenceSnapshot: number;
  quantity: number;
  makerNameSnapshot: string;
}
