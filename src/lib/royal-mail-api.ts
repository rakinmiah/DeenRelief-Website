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
 * ─── Spec ───────────────────────────────────────────────────────
 *
 * Implementation is verified against the public OpenAPI/Swagger
 * v1 spec for "ChannelShipper & Royal Mail Public API":
 *
 *   - Endpoint:   POST /api/v1/orders
 *   - Auth:       Authorization: Bearer <token>
 *   - Body:       CreateOrdersRequest = { items: CreateOrderRequest[] }
 *   - Response:   CreateOrdersResponse = {
 *                   successCount, errorsCount,
 *                   createdOrders[], failedOrders[]
 *                 }
 *
 * Key shape rules:
 *   - Product items go inside `packages[].contents[]`
 *     (ProductItemRequest), NOT a top-level orderLines field
 *   - `packageFormatIdentifier` is required per package; enum
 *     includes letter / largeLetter / smallParcel / mediumParcel /
 *     largeParcel / parcel / documents
 *   - Service code lives in `postageDetails.serviceCode`, not at
 *     top level
 *   - `sender` carries only tradingName / phoneNumber /
 *     emailAddress; the return address comes from the C&D
 *     account, not the API call
 *
 * ─── Sandbox vs production ──────────────────────────────────────
 *
 * Spec doesn't document a separate sandbox endpoint. Test mode is
 * determined by which API key you use — generate a sandbox key in
 * C&D for testing, swap to a production key for live. Set
 * ROYAL_MAIL_API_KEY accordingly per environment.
 */

import type { BazaarOrderRow, BazaarOrderItemRow } from "@/lib/bazaar-db";
import { bazaarReceiptNumber } from "@/lib/bazaar-order-email";
import { fromPence } from "@/lib/stripe";

/**
 * Base URL of the Royal Mail Click & Drop Order API. The v1 spec
 * doesn't document a separate sandbox host — sandbox testing is
 * done by using a sandbox API key against the same base URL.
 * Override via ROYAL_MAIL_API_BASE_URL only if Royal Mail rotates
 * their host (they have historically).
 */
const DEFAULT_BASE_URL = "https://api.parcel.royalmail.com";

function getBaseUrl(): string {
  return process.env.ROYAL_MAIL_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function getApiKey(): string | null {
  const key = process.env.ROYAL_MAIL_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * Test mode.
 *
 * The Royal Mail Click & Drop Order API v1 spec (verified against
 * the YAML) has NO test-mode field on the order body — no
 * `testOrder`, `isTest`, `sandbox`, etc. There is also no
 * separate sandbox endpoint documented in the same spec.
 *
 * Royal Mail's "test mode is configured via the API" doc pointer
 * therefore appears to mean: **use a sandbox API key**. Generate
 * a sandbox key in your C&D dashboard for testing; orders pushed
 * with that key go to a sandbox account rather than the live one.
 * Swap to a production key for live shipments.
 *
 * The env var below is kept as a label/logging hint only — it
 * doesn't affect what we send to Royal Mail. If your C&D account
 * later exposes a per-request test flag, plug it into
 * buildOrderPushBody.
 */
function isTestMode(): boolean {
  const v = (process.env.ROYAL_MAIL_API_TEST_MODE ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
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

  // Log when test-mode env var is set so a trustee sees in the
  // server logs whether they're pushing to a sandbox account vs
  // production. The flag itself doesn't change the request — test
  // vs. prod is determined by which API key is configured (Royal
  // Mail's spec has no per-order test flag).
  if (isTestMode()) {
    console.log(
      `[royal-mail-api] pushing order ${input.order.id} in TEST mode ` +
        `(ROYAL_MAIL_API_TEST_MODE=true). Confirm your ROYAL_MAIL_API_KEY ` +
        `is a sandbox key, not a production one.`
    );
  }

  // Verified against the v1 spec.
  const url = `${getBaseUrl()}/api/v1/orders`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // Verified against the v1 spec — securityDefinitions.Bearer
        // is `Authorization: Bearer <token>`.
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

    // CreateOrdersResponse can return HTTP 200 with errorsCount > 0
    // and the order in failedOrders. Surface that as a failure.
    if (hasFailedOrders(parsed)) {
      const message =
        extractErrorMessage(parsed) ??
        "Royal Mail accepted the request but the order was rejected.";
      console.error(
        `[royal-mail-api] push returned 200 with failed order for ${input.order.id}:`,
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
 * Sender details that the C&D Order API actually accepts on the
 * order body.
 *
 * Verified against the v1 spec: SenderDetailsRequest only has
 * `tradingName`, `phoneNumber`, `emailAddress` — NO address
 * fields. The return address is configured per-account in the
 * C&D dashboard (Settings → Trading Addresses); it can't be set
 * per-order via the API.
 */
interface SenderDetails {
  tradingName: string;
  emailAddress?: string;
  phoneNumber?: string;
}

function getSenderDetails(): SenderDetails {
  return {
    tradingName:
      process.env.ROYAL_MAIL_SENDER_COMPANY ??
      process.env.ROYAL_MAIL_SENDER_NAME ??
      "Deen Relief Bazaar",
    emailAddress:
      process.env.ROYAL_MAIL_SENDER_EMAIL ?? "info@deenrelief.org",
    phoneNumber: process.env.ROYAL_MAIL_SENDER_PHONE,
  };
}

/**
 * Map the bazaar order to Click & Drop's CreateOrdersRequest body
 * shape, verified against the v1 OpenAPI spec.
 *
 * Key shape rules from the spec:
 *   - Product lines live inside `packages[].contents[]` as
 *     ProductItemRequest objects, NOT at top level.
 *   - `packageFormatIdentifier` is required on each package
 *     (enum: undefined / letter / largeLetter / smallParcel /
 *     mediumParcel / largeParcel / parcel / documents).
 *   - `weightInGrams` is required on each package; range 1..30000.
 *   - Service code goes in `postageDetails.serviceCode`, not top
 *     level.
 *   - `orderReference` is the idempotency key — C&D rejects
 *     duplicates so re-pushing is safe at their side.
 */
function buildOrderPushBody(input: PushClickAndDropInput): unknown {
  const { order, items } = input;
  const receiptNum = bazaarReceiptNumber(order.id);
  const sender = getSenderDetails();
  const address = order.shippingAddress!;

  // Service codes — pre-select the service the customer paid for
  // at Stripe Checkout. The trustee can override via C&D shipping
  // rules; this is a hint, not a binding choice.
  //
  // The defaults below match common Royal Mail service codes but
  // your C&D account may use different ones. Check C&D →
  // Settings → Services for the exact codes for your contract and
  // override via env vars.
  const serviceCode =
    order.royalMailService === "tracked-24"
      ? process.env.ROYAL_MAIL_SERVICE_CODE_TRACKED_24 ?? "TPS24"
      : order.royalMailService === "special-delivery"
        ? process.env.ROYAL_MAIL_SERVICE_CODE_SPECIAL ?? "SDN"
        : process.env.ROYAL_MAIL_SERVICE_CODE_TRACKED_48 ?? "TPN";

  // Package format. UK-domestic single-piece clothing/textiles
  // typically fit in 'smallParcel'. Override per-environment if
  // your typical bazaar parcels are a different shape.
  // Valid spec values: undefined, letter, largeLetter, smallParcel,
  // mediumParcel, largeParcel, parcel, documents.
  const packageFormatIdentifier =
    process.env.ROYAL_MAIL_PACKAGE_FORMAT ?? "smallParcel";

  // Total weight in grams. Royal Mail's spec caps weightInGrams at
  // 30000 per package and requires >= 1. Default to 500g per item
  // until we wire up the bazaar_products.weight_grams column.
  const DEFAULT_PER_ITEM_WEIGHT_G = 500;
  const totalWeightGrams = Math.max(
    1,
    Math.min(
      30000,
      items.reduce(
        (sum, item) => sum + DEFAULT_PER_ITEM_WEIGHT_G * item.quantity,
        0
      )
    )
  );

  // Product items inside packages[].contents[] per the
  // ProductItemRequest schema. SKU max length 100 per spec; clip
  // to be safe.
  const contents = items.map((item) => ({
    name: (item.productNameSnapshot ?? "").slice(0, 800),
    SKU: (item.variantSnapshot
      ? `${item.productNameSnapshot} (${item.variantSnapshot})`
      : item.productNameSnapshot
    ).slice(0, 100),
    quantity: item.quantity,
    unitValue: fromPence(item.unitPricePenceSnapshot),
    unitWeightInGrams: DEFAULT_PER_ITEM_WEIGHT_G,
  }));

  return {
    items: [
      {
        // Idempotency key. C&D's orderReference is unique per
        // account so re-pushing the same order is a safe no-op at
        // their side. We also guard in pushToClickAndDropAction
        // against re-push at the application layer.
        orderReference: receiptNum,

        // ISO 8601 datetime per spec.
        orderDate: order.createdAt,

        // Money fields — decimals not pence per spec
        // (multipleOf: 0.01).
        subtotal: fromPence(order.subtotalPence),
        shippingCostCharged: fromPence(order.shippingPence),
        total: fromPence(order.totalPence),
        currencyCode: order.currency ?? "GBP",

        recipient: {
          address: {
            fullName: address.name,
            addressLine1: address.line1,
            addressLine2: address.line2 ?? "",
            city: address.city,
            postcode: address.postcode,
            countryCode: "GB",
          },
          emailAddress: order.contactEmail,
        },

        // Minimal SenderDetailsRequest — no address per spec.
        sender: {
          tradingName: sender.tradingName,
          ...(sender.phoneNumber ? { phoneNumber: sender.phoneNumber } : {}),
          ...(sender.emailAddress ? { emailAddress: sender.emailAddress } : {}),
        },

        // Products live INSIDE the package, not at top level.
        packages: [
          {
            weightInGrams: totalWeightGrams,
            packageFormatIdentifier,
            contents,
          },
        ],

        // Service code lives in postageDetails, not top level.
        postageDetails: {
          serviceCode,
        },
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// Response parsing — best-effort, tolerant of doc drift
// ─────────────────────────────────────────────────────────────────

/**
 * Extract the order id from a `CreateOrdersResponse` body.
 *
 * Per spec:
 *   {
 *     successCount: int,
 *     errorsCount: int,
 *     createdOrders: [{ orderIdentifier: int, orderReference: str, ... }],
 *     failedOrders: [...]
 *   }
 *
 * orderIdentifier is an INTEGER. We stringify so it stores cleanly
 * in our text column.
 */
function extractCreatedOrderId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const createdOrders = obj.createdOrders;
  if (Array.isArray(createdOrders) && createdOrders.length > 0) {
    const first = createdOrders[0] as Record<string, unknown> | null;
    if (first) {
      const id = first.orderIdentifier;
      if (typeof id === "number" && Number.isFinite(id)) return String(id);
      if (typeof id === "string" && id.length > 0) return id;
      // Fallback: orderReference is our own receipt number echoed
      // back. Lets us avoid a "couldn't parse response" branch even
      // if Royal Mail changes the integer/string type later.
      const ref = first.orderReference;
      if (typeof ref === "string" && ref.length > 0) return ref;
    }
  }

  return null;
}

/**
 * Extract a human-readable error from a Royal Mail response.
 *
 * Two shapes per spec:
 *   - Top-level ErrorResponse: { code, message, details } — used on
 *     401/500 and validation errors that prevent any processing.
 *   - CreateOrdersResponse failedOrders[].errors[] — used when the
 *     batch was accepted (HTTP 200) but the order itself failed
 *     validation. Each error has { errorCode, errorMessage, fields[] }.
 */
function extractErrorMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") {
    return typeof parsed === "string" ? parsed.slice(0, 300) : null;
  }
  const obj = parsed as Record<string, unknown>;

  // ErrorResponse shape
  if (typeof obj.message === "string") {
    const msg = obj.message;
    const details =
      typeof obj.details === "string" ? ` (${obj.details})` : "";
    return `${msg}${details}`;
  }
  if (typeof obj.error === "string") return obj.error;

  // CreateOrdersResponse with failedOrders[]
  const failedOrders = obj.failedOrders;
  if (Array.isArray(failedOrders) && failedOrders.length > 0) {
    const firstFail = failedOrders[0] as Record<string, unknown> | null;
    if (firstFail) {
      const errors = firstFail.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const firstErr = errors[0] as Record<string, unknown> | null;
        if (firstErr) {
          const msg = firstErr.errorMessage;
          if (typeof msg === "string") return msg;
        }
      }
    }
  }

  return null;
}

/**
 * A successful HTTP 200 can still contain failed orders in the
 * `failedOrders` array (when partial submission succeeds). Check
 * the body before declaring success.
 */
function hasFailedOrders(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  const errorsCount = obj.errorsCount;
  if (typeof errorsCount === "number" && errorsCount > 0) return true;
  const failedOrders = obj.failedOrders;
  return Array.isArray(failedOrders) && failedOrders.length > 0;
}
