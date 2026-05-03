/**
 * GET /api/google-ads-csv-export
 *
 * Parallel pathway to /api/cron/google-ads-oci. Where OCI pushes via the
 * Google Ads API (which needs an approved developer token + MCC), this
 * endpoint *serves* a CSV that Google Ads polls on a schedule. Same Smart
 * Bidding signal, no developer token required.
 *
 * Two-phase commit:
 *   ?phase=fetch  (default) — Google's fetcher hits this. We return a CSV
 *                              of unsent succeeded donations and stamp
 *                              csv_served_at on every row included so they
 *                              don't re-appear in subsequent polls.
 *   ?phase=commit            — Hourly internal cron. Promotes rows whose
 *                              csv_served_at is older than 6h (Google's
 *                              processing window) to csv_uploaded_at, and
 *                              resets rows stuck > 24h back to the queue.
 *
 * Auth: token in query string only. Returns 404 (not 401) on mismatch so
 *       the endpoint can't be enumerated. No Bearer header check — Google's
 *       fetcher can't send custom headers.
 *
 * The route is intentionally NOT under /api/cron/* because Vercel cron's
 * Bearer header would conflict with the public-poll model. The internal
 * commit cron in vercel.json calls this endpoint with the same query-string
 * token (Vercel's auto Authorization header is ignored here).
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashForEnhancedConversion } from "@/lib/google-ads-hash";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Conversion Action name configured in the Google Ads UI. Must match exactly. */
const CONVERSION_NAME = "Donation Completed - Server";

/** GCLIDs older than 90 days are rejected by Google. 85 leaves a safety buffer. */
const MAX_AGE_DAYS = 85;

/** Window Google needs to ingest a fetched CSV before we trust it landed. */
const COMMIT_AFTER_HOURS = 6;

/** If a row has been in "served" state this long without commit, retry it. */
const RESET_AFTER_HOURS = 24;

/**
 * Defensive cap. Google Ads accepts much larger files but a runaway query
 * (e.g. commit cron failing for weeks) shouldn't OOM the lambda.
 */
const MAX_ROWS_PER_FETCH = 10000;

/**
 * Applied to EVERY response from this route. Vercel's edge will otherwise
 * cache 404s aggressively — and a cached 404 from a transient mis-token or
 * cold-start failure breaks the endpoint until cache eviction. Both
 * directives together are what's needed to defeat edge + browser caches.
 */
const NO_CACHE_HEADER = "no-store, max-age=0";

interface DonationRow {
  id: string;
  amount_pence: number;
  currency: string | null;
  completed_at: string | null;
  created_at: string;
  gclid: string;
  ad_user_data_consent: boolean | null;
  donors: { email: string | null } | { email: string | null }[] | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providedToken = url.searchParams.get("token") ?? "";
  const phase = url.searchParams.get("phase") ?? "fetch";

  if (!verifyToken(providedToken)) {
    // 404, not 401 — don't advertise that this endpoint exists.
    return notFound();
  }

  if (phase === "commit") return handleCommit();
  if (phase === "fetch") return handleFetch();

  return notFound();
}

function notFound(): Response {
  // no-store on the 404 too — otherwise Vercel's edge can cache a stale
  // 404 from a transient mis-token request and shadow real ones.
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": NO_CACHE_HEADER },
  });
}

// ─── Token verification ────────────────────────────────────────────────────

function verifyToken(provided: string): boolean {
  const expected = process.env.GOOGLE_ADS_CSV_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on length mismatch — short-circuit with a
  // constant-time-irrelevant length check first (the attacker already
  // knows the length is wrong if they sent the wrong-length token).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── Phase: fetch ──────────────────────────────────────────────────────────

async function handleFetch(): Promise<Response> {
  const supabase = getSupabaseAdmin();

  // Filter conditions per spec, plus csv_served_at IS NULL — rows already
  // served are excluded until either committed (csv_uploaded_at set, stays
  // out forever) or stuck-reset (csv_served_at restored to NULL by the
  // commit phase, re-enters the queue). Without this, the same rows would
  // appear on every poll and the 6-hour commit timer would never elapse.
  const cutoffIso = new Date(
    Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("donations")
    .select(
      `id, amount_pence, currency, completed_at, created_at, gclid,
       ad_user_data_consent,
       donors(email)`
    )
    .eq("status", "succeeded")
    .eq("ad_storage_consent", true)
    .not("gclid", "is", null)
    .is("csv_uploaded_at", null)
    .is("csv_served_at", null)
    .gt("created_at", cutoffIso)
    .gt("amount_pence", 0)
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS_PER_FETCH);

  if (error) {
    console.error("[google-ads-csv-export] fetch query failed:", error);
    return errorResponse();
  }

  const rows = (data ?? []) as unknown as DonationRow[];
  const csv = buildCsv(rows);

  // Stamp csv_served_at on every row we just emitted. This is one batched
  // UPDATE — if it fails we'd rather not have served the data, so we error
  // out and rely on the next poll to retry.
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { error: updateError } = await supabase
      .from("donations")
      .update({ csv_served_at: new Date().toISOString() })
      .in("id", ids);
    if (updateError) {
      console.error(
        "[google-ads-csv-export] failed to stamp csv_served_at:",
        updateError
      );
      return errorResponse();
    }
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": NO_CACHE_HEADER,
    },
  });
}

// ─── Phase: commit ─────────────────────────────────────────────────────────

async function handleCommit(): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const commitThreshold = new Date(
    now.getTime() - COMMIT_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString();
  const resetThreshold = new Date(
    now.getTime() - RESET_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString();

  // Step 1 — promote anything served > 6h ago. Google's processing window
  // has elapsed; we treat these as ingested.
  const { data: committed, error: commitError } = await supabase
    .from("donations")
    .update({ csv_uploaded_at: now.toISOString(), csv_upload_error: null })
    .lt("csv_served_at", commitThreshold)
    .is("csv_uploaded_at", null)
    .not("csv_served_at", "is", null)
    .select("id");

  if (commitError) {
    console.error("[google-ads-csv-export] commit update failed:", commitError);
    return errorResponse();
  }

  // Step 2 — defensive: if a row has been in "served" state for > 24h and
  // somehow is still uncommitted (e.g. the commit cron was paused, a DB
  // error skipped Step 1 in a prior run), reset it so the next fetch will
  // re-include it. In normal operation this catches nothing — Step 1 will
  // have committed everything served > 6h ago.
  const { data: retried, error: resetError } = await supabase
    .from("donations")
    .update({ csv_served_at: null })
    .lt("csv_served_at", resetThreshold)
    .is("csv_uploaded_at", null)
    .select("id");

  if (resetError) {
    console.error("[google-ads-csv-export] reset update failed:", resetError);
    return errorResponse();
  }

  const result = {
    committed: committed?.length ?? 0,
    retried: retried?.length ?? 0,
  };
  console.log(
    `[google-ads-csv-export] commit phase: committed=${result.committed} retried=${result.retried}`
  );
  return NextResponse.json(result, {
    headers: { "Cache-Control": NO_CACHE_HEADER },
  });
}

// ─── CSV building ──────────────────────────────────────────────────────────

function buildCsv(rows: DonationRow[]): string {
  const lines: string[] = [
    "Parameters:TimeZone=Europe/London",
    "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Email",
  ];

  for (const r of rows) {
    // completed_at is the conversion moment — fall back to created_at on
    // the rare row where completed_at hasn't been backfilled.
    const conversionIso = r.completed_at ?? r.created_at;
    const time = formatLondonDateTime(conversionIso);
    const value = (r.amount_pence / 100).toFixed(2);
    const currency = r.currency || "GBP";

    // Email column: include hashed email only when ad_user_data consent
    // was granted. Empty cell otherwise (column count must stay constant).
    let emailCell = "";
    if (r.ad_user_data_consent === true) {
      const donor = Array.isArray(r.donors) ? r.donors[0] : r.donors;
      const hashed = hashForEnhancedConversion(donor?.email ?? null);
      if (hashed) emailCell = hashed;
    }

    lines.push(
      [
        csvEscape(r.gclid),
        csvEscape(CONVERSION_NAME),
        csvEscape(time),
        csvEscape(value),
        csvEscape(currency),
        csvEscape(emailCell),
      ].join(",")
    );
  }

  // Trailing newline keeps tools (and Google's parser) happy.
  return lines.join("\n") + "\n";
}

function csvEscape(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Format an ISO timestamp into Google's expected CSV shape:
 *   "YYYY-MM-DD HH:MM:SS+ZZZZ"
 * - All components rendered in Europe/London (BST or GMT, auto-detected
 *   from the input's wall-clock instant).
 * - Offset has NO colon. "+0100" is correct; "+01:00" is rejected.
 */
function formatLondonDateTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const lookup = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  let hh = lookup("hour");
  if (hh === "24") hh = "00"; // Some Node versions emit "24" for midnight.
  return `${lookup("year")}-${lookup("month")}-${lookup("day")} ${hh}:${lookup("minute")}:${lookup("second")}${londonOffset(d)}`;
}

function londonOffset(d: Date): string {
  // Render the same instant in Europe/London via `sv-SE` (which formats
  // close to ISO), parse it back as if it were UTC, and the difference vs.
  // the original instant is the offset. Works correctly across DST changes.
  const tzString = d.toLocaleString("sv-SE", {
    timeZone: "Europe/London",
    hour12: false,
  });
  const asIfUtc = new Date(tzString.replace(" ", "T") + "Z").getTime();
  const diffMin = Math.round((asIfUtc - d.getTime()) / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}${m}`;
}

// ─── Errors ────────────────────────────────────────────────────────────────

function errorResponse(): Response {
  // Generic body — never echo DB errors to a public endpoint.
  return NextResponse.json(
    { error: "Internal server error." },
    {
      status: 500,
      headers: { "Cache-Control": NO_CACHE_HEADER },
    }
  );
}
