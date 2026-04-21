/**
 * GET /api/cron/swiftaid-submit
 *
 * Scheduled job (Vercel Cron) that submits unsubmitted Gift-Aid-claimed
 * donations to Swiftaid. Runs daily — see vercel.json for the schedule.
 *
 * Authentication: Vercel Cron attaches `Authorization: Bearer $CRON_SECRET`.
 * Any request without that header is rejected (prevents external callers
 * from triggering submissions).
 *
 * Query:
 *   donations WHERE gift_aid_claimed = true
 *     AND status = 'succeeded'
 *     AND swiftaid_submission_id IS NULL
 *     AND gift_aid_declaration.revoked_at IS NULL
 *
 * For each row:
 *   1. Build SwiftaidSubmissionInput from donation + donor + declaration
 *   2. POST to Swiftaid API
 *   3. On success: update donations.swiftaid_submission_id + submitted_at
 *   4. On failure: log, move on (next cron tick will retry)
 *
 * Swiftaid is SKELETON-ONLY right now — see src/lib/swiftaid.ts. Without
 * SWIFTAID_API_KEY set, this route logs and returns without attempting
 * any submissions.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireCronAuth } from "@/lib/admin-auth";
import { submitDonationToSwiftaid } from "@/lib/swiftaid";

export const dynamic = "force-dynamic";

/** Cap per run so a huge backlog doesn't blow Vercel's function timeout. */
const BATCH_SIZE = 50;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.SWIFTAID_API_KEY;
  if (!apiKey) {
    console.log("[cron/swiftaid] SWIFTAID_API_KEY not set — nothing to do yet.");
    return NextResponse.json({ skipped: true, reason: "No API key configured." });
  }

  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, completed_at,
       donors(first_name, last_name, address_line1, postcode),
       gift_aid_declarations(declaration_text, declared_at, scope, revoked_at)`
    )
    .eq("gift_aid_claimed", true)
    .eq("status", "succeeded")
    .is("swiftaid_submission_id", null)
    .order("completed_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[cron/swiftaid] query failed:", error);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  const results = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped_revoked: 0,
    skipped_missing_data: 0,
    errors: [] as string[],
  };

  for (const row of rows ?? []) {
    const donor = (Array.isArray(row.donors) ? row.donors[0] : row.donors) as
      | { first_name: string; last_name: string; address_line1: string; postcode: string }
      | null;
    const decl = (Array.isArray(row.gift_aid_declarations)
      ? row.gift_aid_declarations[0]
      : row.gift_aid_declarations) as
      | { declaration_text: string; declared_at: string; scope: "this-donation-only" | "this-and-past-4-years-and-future"; revoked_at: string | null }
      | null;

    if (!donor || !decl) {
      results.skipped_missing_data++;
      continue;
    }
    if (decl.revoked_at) {
      results.skipped_revoked++;
      continue;
    }

    results.attempted++;

    const houseNumber = donor.address_line1.trim().split(/\s+/)[0] ?? donor.address_line1;

    const submission = await submitDonationToSwiftaid({
      donationId: row.id as unknown as string,
      donorFirstName: donor.first_name,
      donorLastName: donor.last_name,
      donorHouseNumber: houseNumber,
      donorPostcode: donor.postcode,
      amountPence: row.amount_pence as unknown as number,
      donatedAt: new Date(row.completed_at as unknown as string),
      declarationText: decl.declaration_text,
      declaredAt: new Date(decl.declared_at),
      declarationScope: decl.scope,
    });

    if (submission.ok && submission.submissionId) {
      const { error: updErr } = await supabase
        .from("donations")
        .update({
          swiftaid_submission_id: submission.submissionId,
          swiftaid_submitted_at: new Date().toISOString(),
          swiftaid_hmrc_claim_status: "pending",
        })
        .eq("id", row.id);

      if (updErr) {
        results.failed++;
        results.errors.push(`Update failed for ${row.id}: ${updErr.message}`);
      } else {
        results.succeeded++;
      }
    } else {
      results.failed++;
      results.errors.push(`Submit failed for ${row.id}: ${submission.error}`);
    }
  }

  console.log("[cron/swiftaid] batch complete:", results);
  return NextResponse.json(results);
}
