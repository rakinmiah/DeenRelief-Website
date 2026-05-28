/**
 * External imagery — data layer.
 *
 * Backs migration 029. Third-party verified imagery (CC-licensed
 * Wikimedia, ReliefWeb files, NASA EONET, IFRC GO files) fetched per
 * event and offered to Claude as candidates alongside DR's own media
 * library when drafting a packet.
 *
 * Each row carries source URL + attribution text + license — so the
 * slide renderer can compose a proper credit line bottom-right of any
 * slide that uses third-party imagery.
 */

import { getSupabaseAdmin } from "./supabase";

export const EXTERNAL_SOURCES = [
  "wikimedia",
  "nasa_eonet",
  "reliefweb",
  "ifrc",
  "un_photo",
] as const;

export type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

/** Display label per source — used in admin views + credit lines. */
export function externalSourceLabel(source: string): string {
  switch (source) {
    case "wikimedia":
      return "Wikimedia Commons";
    case "nasa_eonet":
      return "NASA EONET";
    case "reliefweb":
      return "ReliefWeb / OCHA";
    case "ifrc":
      return "IFRC";
    case "un_photo":
      return "UN Photo";
    default:
      return source;
  }
}

export interface ExternalImagery {
  id: string;
  emergencyEventId: string;
  source: ExternalSource;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  creditText: string;
  license: string;
  licenseUrl: string | null;
  width: number | null;
  height: number | null;
  uploadedAtSource: Date | null;
  fetchedAt: Date;
  selected: boolean;
  archivedAt: Date | null;
}

interface ExternalImageryRow {
  id: string;
  emergency_event_id: string;
  source: string;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  credit_text: string;
  license: string;
  license_url: string | null;
  width: number | null;
  height: number | null;
  uploaded_at_source: string | null;
  fetched_at: string;
  selected: boolean;
  archived_at: string | null;
}

function rowToImagery(row: ExternalImageryRow): ExternalImagery {
  return {
    id: row.id,
    emergencyEventId: row.emergency_event_id,
    source: row.source as ExternalSource,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    description: row.description,
    creditText: row.credit_text,
    license: row.license,
    licenseUrl: row.license_url,
    width: row.width,
    height: row.height,
    uploadedAtSource: row.uploaded_at_source
      ? new Date(row.uploaded_at_source)
      : null,
    fetchedAt: new Date(row.fetched_at),
    selected: row.selected,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  };
}

const SELECT_COLS =
  "id, emergency_event_id, source, url, thumbnail_url, title, description, credit_text, license, license_url, width, height, uploaded_at_source, fetched_at, selected, archived_at";

/* ─── Reads ──────────────────────────────────────────────────────── */

export async function getImageryById(
  id: string
): Promise<ExternalImagery | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_imagery")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle<ExternalImageryRow>();
  if (error) {
    console.error("[external-imagery] get failed:", error);
    return null;
  }
  return data ? rowToImagery(data) : null;
}

export async function listImageryForEvent(
  emergencyEventId: string
): Promise<ExternalImagery[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_imagery")
    .select(SELECT_COLS)
    .eq("emergency_event_id", emergencyEventId)
    .is("archived_at", null)
    .order("fetched_at", { ascending: false })
    .returns<ExternalImageryRow[]>();
  if (error) {
    console.error("[external-imagery] list failed:", error);
    return [];
  }
  return (data ?? []).map(rowToImagery);
}

/* ─── Writes ─────────────────────────────────────────────────────── */

export interface CreateImageryInput {
  emergencyEventId: string;
  source: ExternalSource;
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  description?: string | null;
  creditText: string;
  license: string;
  licenseUrl?: string | null;
  width?: number | null;
  height?: number | null;
  uploadedAtSource?: Date | null;
}

/**
 * Insert a new external imagery row. Idempotent — the unique
 * constraint on (emergency_event_id, url) makes re-inserts a no-op
 * via onConflict, which is what we want when re-running fetches.
 */
export async function upsertExternalImagery(
  input: CreateImageryInput
): Promise<ExternalImagery | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("external_imagery")
    .upsert(
      {
        emergency_event_id: input.emergencyEventId,
        source: input.source,
        url: input.url,
        thumbnail_url: input.thumbnailUrl ?? null,
        title: input.title ?? null,
        description: input.description ?? null,
        credit_text: input.creditText,
        license: input.license,
        license_url: input.licenseUrl ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        uploaded_at_source: input.uploadedAtSource?.toISOString() ?? null,
      },
      { onConflict: "emergency_event_id,url", ignoreDuplicates: false }
    )
    .select(SELECT_COLS)
    .maybeSingle<ExternalImageryRow>();
  if (error || !data) {
    console.error("[external-imagery] upsert failed:", error);
    return null;
  }
  return rowToImagery(data);
}

/** Mark an imagery row as actively selected by a draft packet. */
export async function markImagerySelected(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("external_imagery")
    .update({ selected: true })
    .eq("id", id);
}

/* ─── Renderer helper: fetch + inline image ─────────────────────── */

/**
 * Fetch external imagery bytes and inline as a data URI for the slide
 * renderer. Same pattern as the media library + brand assets — avoids
 * Satori fetch quirks at composition time.
 */
export async function getExternalImageryDataUri(
  id: string
): Promise<{
  dataUri: string;
  creditText: string;
  license: string;
} | null> {
  const item = await getImageryById(id);
  if (!item || item.archivedAt) return null;
  try {
    const res = await fetch(item.url);
    if (!res.ok) {
      console.warn(
        `[external-imagery] fetch failed (${res.status}) for ${item.url}`
      );
      return null;
    }
    const buf = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(buf).toString("base64");
    return {
      dataUri: `data:${mimeType};base64,${base64}`,
      creditText: item.creditText,
      license: item.license,
    };
  } catch (err) {
    console.error(
      `[external-imagery] fetch exception for ${item.url}:`,
      err
    );
    return null;
  }
}
