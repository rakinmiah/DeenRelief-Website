/**
 * NASA EONET external imagery source.
 *
 * For events ingested from EONET (event.source === 'eonet'), the
 * original NASA EONET API entry includes 'sources' — URLs that often
 * resolve to photographs, satellite imagery, or USGS shake maps.
 * We surface those as candidate imagery alongside Wikimedia.
 *
 * NASA imagery is public domain — no license filter, attribution is
 * "NASA Earth Observatory" as a stable string.
 *
 * The raw_payload on the emergency_events row already contains the
 * EONET sources array (we pass it through unchanged in
 * src/lib/signal-sources/eonet.ts). This fetcher extracts URLs from
 * there rather than re-hitting EONET.
 */

import type { EmergencyEvent } from "../first-response";
import type { CreateImageryInput, ExternalSource } from "../external-imagery";
import { getSupabaseAdmin } from "../supabase";

const SOURCE: ExternalSource = "nasa_eonet";

interface EonetSource {
  id?: string;
  url?: string;
}
interface EonetRawPayload {
  title?: string;
  description?: string | null;
  sources?: EonetSource[];
}

export async function fetchNasaEonetImagery(
  event: EmergencyEvent
): Promise<CreateImageryInput[]> {
  // Only applicable to events we ingested from EONET.
  if (event.source !== "eonet") return [];

  // The raw_payload field isn't included on the EmergencyEvent
  // type that this function receives — we fetch it separately
  // rather than widening the interface (it's used nowhere else).
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("emergency_events")
    .select("raw_payload")
    .eq("id", event.id)
    .maybeSingle<{ raw_payload: EonetRawPayload | null }>();
  if (error || !data?.raw_payload) return [];

  const sources = data.raw_payload.sources ?? [];
  const candidates: CreateImageryInput[] = [];

  for (const s of sources) {
    if (!s.url) continue;
    // Filter to plausibly-image URLs. EONET sources can be HTML pages
    // (news articles), so we keep only URLs ending in image
    // extensions OR known-image hosts (NASA Worldview, NASA Earth
    // Observatory, USGS).
    if (
      !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s.url) &&
      !/(earthobservatory|worldview|usgs)\.gov/i.test(s.url)
    ) {
      continue;
    }
    candidates.push({
      emergencyEventId: event.id,
      source: SOURCE,
      url: s.url,
      thumbnailUrl: null,
      title: data.raw_payload.title ?? null,
      description: data.raw_payload.description ?? null,
      creditText: `${attributionFor(s.url, s.id)} · NASA`,
      license: "Public Domain (US Govt)",
      licenseUrl: "https://www.nasa.gov/multimedia/guidelines/index.html",
      width: null,
      height: null,
      uploadedAtSource: event.detectedAt,
    });
  }

  return candidates;
}

function attributionFor(url: string, id: string | undefined): string {
  if (/earthobservatory/i.test(url)) return "NASA Earth Observatory";
  if (/worldview/i.test(url)) return "NASA Worldview";
  if (/usgs/i.test(url)) return "USGS";
  if (id) return `NASA EONET (${id})`;
  return "NASA";
}
