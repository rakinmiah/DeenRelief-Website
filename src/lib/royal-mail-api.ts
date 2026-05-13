/**
 * Royal Mail Click & Drop Order API integration.
 *
 * Pushes a bazaar order into the trustee's Click & Drop dashboard
 * so they don't have to retype the shipping address + line items.
 * The free-tier Order API supports order-push only — programmatic
 * label generation is a paid Shipping API V4 feature we don't use.
 *
 * The trustee's flow becomes:
 *   1. Click "Push to Click & Drop" in DR Admin
 *   2. Log into C&D, find the pre-populated order, generate label
 *   3. Paste tracking number into DR Admin → mark shipped
 *
 * vs. before:
 *   1. Log into C&D, type address + line items by hand from DR Admin
 *   2. Generate label
 *   3. Paste tracking number into DR Admin → mark shipped
 *
 * ─── Authentication ─────────────────────────────────────────────
 *
 * Single API token (UUID format), passed as a header on every
 * request. NO OAuth dance — that's the paid Shipping API V4. The
 * free Order API just bears the token.
 *
 * Token comes from ROYAL_MAIL_API_KEY env var. Never logged or
 * surfaced in errors.
 *
 * ─── Spec uncertainty ───────────────────────────────────────────
 *
 * Royal Mail's API surface has shifted over the years and their
 * docs are gated behind a C&D account login. The endpoint and
 * body shape below are my best understanding as of 2026; before
 * the first live push, the trustee should:
 *
 *   1. Log into C&D → Settings → Integrations
 *   2. Pull the latest Order API doc PDF
 *   3. Verify the POST URL + request body match what's below
 *   4. Run a sandbox test before pointing at production
 *
 * Anything I'm uncertain about is flagged with `// VERIFY:` so the
 * trustee can grep for them and double-check against current docs.
 *
 * ─── Sandbox vs production ──────────────────────────────────────
 *
 * Royal Mail uses the same domain for both — sandbox keys produce
 * test orders that never get fulfilled. Set `ROYAL_MAIL_API_KEY` to
 * the sandbox key on Vercel Preview, the production key on
 * Production. Setup-wise that's just two different env values.
 */

import type { BazaarOrderRow, BazaarOrderItemRow } from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { fromPence } from "@/lib/stripe";

/**
 * Base URL of the Royal Mail Click & Drop Order API.
 *
 * VERIFY: the base URL is from Royal Mail's published docs but
 * has been known to change. Override via ROYAL_MAIL_API_BASE_URL if
 * the trustee's docs show a different host.
 */
const DEFAULT_BASE_URL = "https://api.parcel.royalmail.com";

function getBaseUrl(): string {
  return process.env.ROYAL_MAIL_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function getApiKey(): string | null {
  const key = process.env.ROYAL_MAIL_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

// ─────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────

export interface PushClickAndDropInput {
  order: BazaarOrderRow;
  items: BazaarOrderItemRow[];
}

export interface PushClickAndDropResult {
  /** C&D's order reference for this push. Stored on
   *  bazaar_orders.click_and_drop_order_id. */
  clickAndDropOrderId: string | null;
  /** Human-readable error if the push failed. */
  error: string | null;
}

/**
 * Push a single bazaar order into Click & Drop.
 *
 * Returns `{ clickAndDropOrderId, error }` — never throws. Callers
 * (the server action on the order detail page) decide whether to
 * surface failure to the trustee inline.
 */
export async function pushOrderToClickAndDrop(
  input: PushClickAndDropInput
): Promise<PushClickAndDropResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      clickAndDropOrderId: null,
      error:
        "ROYAL_MAIL_API_KEY not configured. Add it to Vercel env vars before pushing.",
    };
  }

  if (!input.order.shippingAddress) {
    return {
      clickAndDropOrderId: null,
      error: "Order has no shipping address — can't push.",
    };
  }

  const body = buildOrderPushBody(input);

  // VERIFY: endpoint path. Royal Mail's free Order API documents
  // POST /api/v1/orders for creating one or many orders in a single
  // call. If the docs show a different path (e.g. /v2/orders or
  // /api/v1/orders/import), update here.
  const url = `${getBaseUrl()}/api/v1/orders`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // VERIFY: auth header. Royal Mail uses one of:
        //   Authorization: Bearer <token>
        //   X-RMG-Auth: <token>
        //   api-key: <token>
        // depending on which API doc you're looking at. Bearer is
        // the most common for new C&D integrations. If the trustee's
        // docs show a different scheme, swap the header here.
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // Read body once — even on failure we want the raw response for
    // error diagnostics.
    const rawText = await response.text();
    let parsed: unknown;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText;
    }

    if (!response.ok) {
      const message =
        extractErrorMessage(parsed) ??
        `Royal Mail API returned ${response.status} ${response.statusText}`;
      console.error(
        `[royal-mail-api] push failed for order ${input.order.id}: ${response.status}`,
        parsed
      );
      return { clickAndDropOrderId: null, error: message };
    }

    const cndOrderId = extractCreatedOrderId(parsed);
    if (!cndOrderId) {
      console.error(
        `[royal-mail-api] push succeeded but no order id in response for ${input.order.id}:`,
        parsed
      );
      return {
        clickAndDropOrderId: null,
        error:
          "Royal Mail accepted the order but didn't return a reference. Check C&D dashboard manually.",
      };
    }

    return { clickAndDropOrderId: cndOrderId, error: null };
  } catch (err) {
    console.error(
      `[royal-mail-api] network error pushing order ${input.order.id}:`,
      err
    );
    return {
      clickAndDropOrderId: null,
      error:
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error pushing to Royal Mail.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Body mapping — bazaar order → Click & Drop order shape
// ─────────────────────────────────────────────────────────────────

/**
 * Sender details for the C&D shipping label. Pulled from env vars
 * so the trustee can update without code changes.
 *
 * VERIFY: the exact field names in the C&D Order API spec.
 * Royal Mail historically uses `sender` / `from` / `senderDetails`
 * interchangeably across doc revisions.
 */
interface SenderDetails {
  name: string;
  companyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  countryCode: string;
  emailAddress?: string;
  phoneNumber?: string;
}

function getSenderDetails(): SenderDetails {
  // Defaults are the Brighton operations office from /contact's
  // LocalBusiness schema. Override via env vars per-environment.
  return {
    name: process.env.ROYAL_MAIL_SENDER_NAME ?? "Deen Relief Bazaar",
    companyName: process.env.ROYAL_MAIL_SENDER_COMPANY ?? "Deen Relief",
    addressLine1:
      process.env.ROYAL_MAIL_SENDER_ADDRESS_LINE1 ?? "7 Maldon Road",
    addressLine2: process.env.ROYAL_MAIL_SENDER_ADDRESS_LINE2,
    city: process.env.ROYAL_MAIL_SENDER_CITY ?? "Brighton",
    postcode: process.env.ROYAL_MAIL_SENDER_POSTCODE ?? "BN1 5BD",
    countryCode: process.env.ROYAL_MAIL_SENDER_COUNTRY_CODE ?? "GB",
    emailAddress: process.env.ROYAL_MAIL_SENDER_EMAIL ?? "info@deenrelief.org",
    phoneNumber: process.env.ROYAL_MAIL_SENDER_PHONE,
  };
}

/**
 * Map the bazaar order to Click & Drop's expected POST body. C&D
 * accepts a batch of orders per call; we send one at a time keyed
 * to the bazaar order id so retries are idempotent at the C&D side
 * (their unique `orderReference` field rejects duplicates).
 */
function buildOrderPushBody(input: PushClickAndDropInput): unknown {
  const { order, items } = input;
  const receiptNum = bazaarReceiptNumber(order.id);
  const sender = getSenderDetails();
  const address = order.shippingAddress!;

  // Service identifier — maps our internal service label to the
  // C&D service code. Royal Mail's free Order API can be told NOT
  // to pre-select a service (the trustee chooses in C&D rules
  // afterward) by omitting the field entirely. We pre-select when
  // we know the customer paid for Tracked 24, otherwise default to
  // Tracked 48.
  //
  // VERIFY: service codes. Royal Mail uses internal SKUs like
  // "TPN" (Tracked 48 untracked-signature), "TPLN" (Tracked 48 +
  // signature), "TPS24" (Tracked 24), etc. The exact code your
  // C&D account uses depends on your service contract. The
  // trustee should map the strings below to the correct codes
  // from their C&D Settings → Services page.
  const serviceCode =
    order.royalMailService === "tracked-24"
      ? process.env.ROYAL_MAIL_SERVICE_CODE_TRACKED_24 ?? "TPS24"
      : order.royalMailService === "special-delivery"
        ? process.env.ROYAL_MAIL_SERVICE_CODE_SPECIAL ?? "SDN"
        : process.env.ROYAL_MAIL_SERVICE_CODE_TRACKED_48 ?? "TPN";

  // Total weight in grams — sum of item-level weights if we know
  // them, else use a sensible default per item. Royal Mail rejects
  // orders with weight = 0 so a default beats blank.
  //
  // VERIFY: weight unit. C&D Order API accepts grams in the
  // `weightInGrams` field per docs, but some versions use a
  // `weight` field in kg.
  const DEFAULT_PER_ITEM_WEIGHT_G = 500;
  const totalWeightGrams = items.reduce(
    (sum, item) => sum + DEFAULT_PER_ITEM_WEIGHT_G * item.quantity,
    0
  );

  // Line items for the C&D order. The "SKU" field is what shows
  // on the picking list inside C&D, so we use a readable combo
  // of product name + variant.
  const orderLines = items.map((item) => ({
    SKU: item.variantSnapshot
      ? `${item.productNameSnapshot} (${item.variantSnapshot})`
      : item.productNameSnapshot,
    name: item.productNameSnapshot,
    quantity: item.quantity,
    unitValue: fromPence(item.unitPricePenceSnapshot),
    unitWeightInGrams: DEFAULT_PER_ITEM_WEIGHT_G,
  }));

  // The order envelope. Field names below follow Royal Mail's
  // most-recent (as of my training) Order API spec. The trustee
  // should diff this against their current docs and adjust.
  return {
    items: [
      {
        // Idempotency key — C&D rejects duplicate orderReferences
        // so re-pushing the same order is a safe no-op at the
        // their side. We also enforce idempotency on our side via
        // click_and_drop_pushed_at, but defense in depth.
        orderReference: receiptNum,
        orderDate: order.createdAt,
        subtotal: fromPence(order.subtotalPence),
        shippingCostCharged: fromPence(order.shippingPence),
        total: fromPence(order.totalPence),
        currencyCode: order.currency ?? "GBP",

        recipient: {
          address: {
            fullName: address.name,
            companyName: "",
            addressLine1: address.line1,
            addressLine2: address.line2 ?? "",
            addressLine3: "",
            city: address.city,
            county: "",
            postcode: address.postcode,
            countryCode: "GB",
          },
          emailAddress: order.contactEmail,
        },

        sender: {
          tradingName: sender.companyName,
          phoneNumber: sender.phoneNumber ?? "",
          emailAddress: sender.emailAddress ?? "",
          address: {
            fullName: sender.name,
            companyName: sender.companyName,
            addressLine1: sender.addressLine1,
            addressLine2: sender.addressLine2 ?? "",
            addressLine3: "",
            city: sender.city,
            county: "",
            postcode: sender.postcode,
            countryCode: sender.countryCode,
          },
        },

        // Picking list / contents of the parcel.
        orderLines,

        // Top-level totals C&D uses for label cost decisions.
        packageReference: receiptNum,
        weightInGrams: totalWeightGrams,

        // Pre-select the service. The trustee can override via C&D
        // shipping rules; this is just a hint.
        shippingServiceId: serviceCode,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// Response parsing — best-effort, tolerant of doc drift
// ─────────────────────────────────────────────────────────────────

/**
 * C&D's response shape varies between docs revisions. Try a few
 * common shapes and return the first matching order id, or null.
 *
 * Known shapes:
 *   - { createdOrders: [{ orderIdentifier: "..." }] }
 *   - { orders: [{ id: "..." }] }
 *   - { items: [{ orderIdentifier: "..." }] }
 *   - { id: "..." }   (single-item response)
 */
function extractCreatedOrderId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  // Single-id at top level
  if (typeof obj.id === "string") return obj.id;
  if (typeof obj.orderIdentifier === "string") return obj.orderIdentifier;

  // Arrays nested under common keys
  const candidates = ["createdOrders", "orders", "items"];
  for (const key of candidates) {
    const arr = obj[key];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0] as Record<string, unknown> | null;
      if (first) {
        if (typeof first.orderIdentifier === "string")
          return first.orderIdentifier;
        if (typeof first.id === "string") return first.id;
        if (typeof first.orderReference === "string")
          return first.orderReference;
      }
    }
  }

  return null;
}

/**
 * Pull a human-readable error from C&D's error response. Their
 * errors come as `{ message: "..." }` or `{ errors: [{ field,
 * message }] }` depending on the failure mode.
 */
function extractErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") {
    return typeof parsed === "string" ? parsed.slice(0, 300) : null;
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;

  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0] as Record<string, unknown> | null;
    if (first) {
      const field = typeof first.field === "string" ? `${first.field}: ` : "";
      const msg =
        typeof first.message === "string"
          ? first.message
          : JSON.stringify(first);
      return `${field}${msg}`;
    }
  }

  return null;
}
