import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backfill-livemode
 *
 * One-time backfill of the `livemode` column on existing donation rows.
 *
 * Run AFTER applying migration 005_donations_livemode.sql.
 *
 * Workflow:
 *   1. Select donations where livemode IS NULL (the unbackfilled set)
 *   2. For each, retrieve the corresponding PaymentIntent or
 *      SetupIntent from Stripe — the live API will return BOTH live
 *      and test resources (Stripe's API is environment-aware via the
 *      key, and the PI/SI ID itself uniquely identifies the resource).
 *   3. The retrieved object's `livemode` field is the authoritative
 *      value (NEVER infer from key prefix; use Stripe's own field).
 *   4. UPDATE the donations row with the authoritative livemode.
 *
 * Idempotency: re-running the backfill is safe. Already-backfilled rows
 * are skipped via the IS NULL filter. Stripe API errors on individual
 * rows are logged and skipped — re-run later to retry.
 *
 * Auth: requires the same admin auth gate as the Gift Aid export route
 * (signed cookie session OR ADMIN_API_TOKEN bearer). Should only ever
 * be hit by a trustee one time post-deploy.
 *
 * Returns a summary of backfill results.
 */
export async function POST(request: Request) {
  const auth = requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();

  // Pull all unbackfilled rows. We need the PI/SI IDs to look up
  // livemode on the Stripe side. Pulled in batches to avoid blowing
  // the lambda memory limit if the donations table is huge — at
  // current charity scale this is irrelevant, but it's defensive.
  const { data: rows, error: fetchErr } = await supabase
    .from("donations")
    .select(
      "id, stripe_payment_intent_id, stripe_setup_intent_id, frequency"
    )
    .is("livemode", null)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (fetchErr) {
    console.error("[backfill-livemode] fetch failed:", fetchErr);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: "No rows to backfill — every donation already has livemode set.",
    });
  }

  let updated = 0;
  let skipped = 0;
  const failures: { id: string; reason: string }[] = [];

  // Sequential rather than parallel — Stripe rate-limits at 100 rps
  // for the live API, and we'd rather take a few extra seconds than
  // get throttled. At charity scale the total number of unbackfilled
  // rows is small, so this is fast in practice.
  for (const row of rows) {
    try {
      let livemode: boolean | null = null;
      if (row.frequency === "one-time" && row.stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(
          row.stripe_payment_intent_id as string
        );
        livemode = pi.livemode;
      } else if (
        row.frequency === "monthly" &&
        row.stripe_setup_intent_id
      ) {
        const si = await stripe.setupIntents.retrieve(
          row.stripe_setup_intent_id as string
        );
        livemode = si.livemode;
      } else {
        skipped++;
        failures.push({
          id: row.id as string,
          reason: "no Stripe ID on row",
        });
        continue;
      }

      const { error: updateErr } = await supabase
        .from("donations")
        .update({ livemode })
        .eq("id", row.id as string);

      if (updateErr) {
        failures.push({
          id: row.id as string,
          reason: `update failed: ${updateErr.message}`,
        });
        continue;
      }

      updated++;
    } catch (err) {
      // Stripe will return "No such payment_intent" / 404 for IDs
      // that don't exist in the current key's environment. This
      // happens when a test-mode row's PI is queried via the live
      // key. We treat that as test-mode (livemode=false) — the
      // donation existed, just not in live Stripe.
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("no such") ||
        msg.toLowerCase().includes("not found")
      ) {
        const { error: updateErr } = await supabase
          .from("donations")
          .update({ livemode: false })
          .eq("id", row.id as string);
        if (updateErr) {
          failures.push({
            id: row.id as string,
            reason: `inferred test-mode but update failed: ${updateErr.message}`,
          });
        } else {
          updated++;
        }
        continue;
      }
      failures.push({ id: row.id as string, reason: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    updated,
    skipped,
    failures,
    note:
      "Re-run if any failures — already-backfilled rows are skipped automatically.",
  });
}
