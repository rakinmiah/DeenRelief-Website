/**
 * Swiftaid API integration — SKELETON.
 *
 * ⚠️ This is a placeholder. The payload shape, endpoint, and auth scheme
 * below are based on the 2023 integration spec and may have changed. When
 * you get Swiftaid's current API docs, update `buildPayload()` and the
 * fetch() call in `submitDonationToSwiftaid()` to match.
 *
 * How the integration works once wired:
 *   1. Cron job (/api/cron/swiftaid-submit) runs daily at 02:00 UTC
 *   2. It queries `donations WHERE gift_aid_claimed = true AND status =
 *      'succeeded' AND swiftaid_submission_id IS NULL`
 *   3. For each row, calls `submitDonationToSwiftaid()` below
 *   4. Updates the row with the returned submission_id + submitted_at
 *   5. Swiftaid batches + submits to HMRC on a weekly cycle
 *
 * Environment variables required (add to .env.local and Vercel):
 *   - SWIFTAID_API_KEY    — bearer token from Swiftaid dashboard
 *   - SWIFTAID_API_URL    — base URL, e.g. https://api.swiftaid.co.uk/v1
 *
 * On Swiftaid failure we:
 *   - Log the error
 *   - Return { ok: false } so the cron job can continue with the next row
 *   - The row's swiftaid_submission_id stays NULL so it'll retry next cron tick
 *
 * On persistent failure (>3 tries, say), alert staff — but for now we just
 * log and let the cron retry indefinitely.
 */

export const CHARITY_REFERENCE = "1158608"; // Charity Commission No.

export interface SwiftaidSubmissionInput {
  donationId: string;          // our donations.id — used as reference
  donorFirstName: string;
  donorLastName: string;
  donorHouseNumber: string;    // first token of address_line1
  donorPostcode: string;
  amountPence: number;
  donatedAt: Date;
  declarationText: string;
  declaredAt: Date;
  declarationScope: "this-donation-only" | "this-and-past-4-years-and-future";
}

export interface SwiftaidSubmissionResult {
  ok: boolean;
  submissionId?: string;
  error?: string;
}

export async function submitDonationToSwiftaid(
  input: SwiftaidSubmissionInput
): Promise<SwiftaidSubmissionResult> {
  const apiKey = process.env.SWIFTAID_API_KEY;
  const apiUrl = process.env.SWIFTAID_API_URL;

  if (!apiKey || !apiUrl) {
    return {
      ok: false,
      error: "SWIFTAID_API_KEY or SWIFTAID_API_URL not set — skipping.",
    };
  }

  const payload = buildPayload(input);

  try {
    // TODO: verify endpoint path against Swiftaid's current docs.
    // The 2023 spec suggested POST /claims; confirm this when signing up.
    const res = await fetch(`${apiUrl}/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id?: string; submission_id?: string };
    const submissionId = data.submission_id ?? data.id;
    if (!submissionId) {
      return { ok: false, error: "Response missing submission id." };
    }

    return { ok: true, submissionId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Placeholder payload shape. Replace with the actual Swiftaid schema when
 * you have their docs — keep the function signature stable so the cron
 * handler doesn't need to change.
 */
function buildPayload(input: SwiftaidSubmissionInput): Record<string, unknown> {
  return {
    charity_reference: CHARITY_REFERENCE,
    donor: {
      first_name: input.donorFirstName,
      last_name: input.donorLastName,
      house_number: input.donorHouseNumber,
      postcode: input.donorPostcode,
    },
    donation: {
      amount_pence: input.amountPence,
      donated_at: input.donatedAt.toISOString(),
      reference: input.donationId,
    },
    declaration: {
      text: input.declarationText,
      declared_at: input.declaredAt.toISOString(),
      scope: input.declarationScope,
    },
  };
}
