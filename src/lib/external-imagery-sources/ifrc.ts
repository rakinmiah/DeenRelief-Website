/**
 * IFRC GO external imagery source.
 *
 * For events ingested from IFRC GO (event.source === 'ifrc'), the
 * IFRC API exposes attached files per emergency event. These
 * frequently include situation report photographs from national
 * Red Crescent societies — field imagery from active operations.
 *
 * License: IFRC content is generally CC-BY-NC, with non-commercial
 * use permitted — DR's use for fundraising is non-commercial under
 * UK charity definitions.
 *
 * STUB: the IFRC GO file-listing endpoint exists but rate-limits
 * aggressively; the v2 'situation_reports' and 'figures' endpoints
 * are the cleaner path. Wiring deferred until the primary IFRC GO
 * integration (signal source) is bedded in — keeping the stub here
 * makes the call-site uniform across sources.
 */

import type { EmergencyEvent } from "../first-response";
import type { CreateImageryInput } from "../external-imagery";

export async function fetchIfrcImagery(
  event: EmergencyEvent
): Promise<CreateImageryInput[]> {
  if (event.source !== "ifrc") return [];
  // TODO: query https://goadmin.ifrc.org/api/v2/situation_report/?event=<id>
  //       and extract document attachments with image MIME types.
  return [];
}
