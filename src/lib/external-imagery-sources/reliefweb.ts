/**
 * ReliefWeb (OCHA) external imagery source.
 *
 * ReliefWeb publishes situation reports with attached media. The
 * /v2/reports endpoint exposes report attachments — many are images
 * (PDF inforgraphics, photographs, maps) under CC-BY licensing.
 *
 * STUB: blocked on the same appname approval as the ReliefWeb signal
 * source itself. Once 'deenrelief.org' is registered + RELIEFWEB_APPNAME
 * set, this enriches with situation-report imagery.
 *
 * Fetcher signature mirrors the others so the orchestrator
 * (src/lib/external-imagery-fetch.ts) can call all sources uniformly.
 */

import type { EmergencyEvent } from "../first-response";
import type { CreateImageryInput } from "../external-imagery";

export async function fetchReliefWebImagery(
  _event: EmergencyEvent
): Promise<CreateImageryInput[]> {
  // TODO: when RELIEFWEB_APPNAME is set + approved:
  //   POST https://api.reliefweb.int/v2/reports?appname=<approved>
  //   filter: country.iso3 matches event.countryIso (alpha-2 → 3 lookup)
  //          + format.name in ['Situation Report', 'Flash Update']
  //          + date.created within ±2 weeks of event detection
  //   prop:   fields.file (attached media)
  //   filter results to image MIME types (jpg/png/webp), build creditText
  //   as 'OCHA / ReliefWeb · <author>' per CC-BY attribution rules.
  return [];
}
