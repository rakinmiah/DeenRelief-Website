/**
 * External imagery fetch orchestrator.
 *
 * Called by the launch-packet generator when drafting a packet for an
 * event. Fans out to each source in parallel, dedupes by URL, persists
 * via upsert (idempotent on re-run), and returns the populated set
 * ready to pass to Claude as candidates.
 *
 * Lazy by design — we only fetch when a packet is actually drafted,
 * so events that never get a packet don't burn bandwidth on imagery
 * the SMM will never see.
 */

import type { EmergencyEvent } from "./first-response";
import {
  listImageryForEvent,
  upsertExternalImagery,
  type ExternalImagery,
} from "./external-imagery";
import { fetchWikimediaImagery } from "./external-imagery-sources/wikimedia";
import { fetchNasaEonetImagery } from "./external-imagery-sources/nasa-eonet";
import { fetchReliefWebImagery } from "./external-imagery-sources/reliefweb";
import { fetchIfrcImagery } from "./external-imagery-sources/ifrc";

const SOURCE_FETCHERS = [
  { name: "wikimedia", fn: fetchWikimediaImagery },
  { name: "nasa_eonet", fn: fetchNasaEonetImagery },
  { name: "reliefweb", fn: fetchReliefWebImagery },
  { name: "ifrc", fn: fetchIfrcImagery },
] as const;

/**
 * Returns the full external imagery candidate set for an event —
 * fetches fresh from sources + merges with any previously stored
 * candidates from earlier drafts.
 *
 * Failure isolation: each source runs in its own try/catch, so a
 * single source going down (e.g. Wikimedia rate-limit) doesn't kill
 * the rest. The orchestrator logs but never throws.
 */
export async function fetchExternalImageryForEvent(
  event: EmergencyEvent
): Promise<ExternalImagery[]> {
  // Fan out — each fetcher returns CreateImageryInput[].
  const settled = await Promise.allSettled(
    SOURCE_FETCHERS.map(async ({ name, fn }) => {
      try {
        const result = await fn(event);
        return { name, result, error: null as string | null };
      } catch (err) {
        return {
          name,
          result: [],
          error: err instanceof Error ? err.message : "unknown",
        };
      }
    })
  );

  // Collect successes, log failures.
  const all: Array<{
    name: string;
    result: Awaited<ReturnType<(typeof SOURCE_FETCHERS)[number]["fn"]>>;
  }> = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      if (s.value.error) {
        console.warn(
          `[external-imagery] ${s.value.name} fetch failed: ${s.value.error}`
        );
      }
      all.push(s.value);
    } else {
      console.warn("[external-imagery] orchestrator branch rejected:", s.reason);
    }
  }

  // Persist each candidate via upsert (idempotent on
  // (emergency_event_id, url) — re-fetches don't duplicate).
  for (const s of all) {
    for (const candidate of s.result) {
      await upsertExternalImagery(candidate);
    }
  }

  // Return everything currently in the DB for this event — including
  // any previously-stored candidates from earlier drafts.
  return await listImageryForEvent(event.id);
}
