/**
 * Media library — data layer.
 *
 * Backs migration 026. The SMM uploads DR's photo inventory once
 * (field coverage, programme imagery, daily-ops shots), tags it, and
 * the launch-packet generator queries here for relevant candidates
 * per event. Claude picks which image suits each slide by metadata
 * (we never send image bytes to Claude — that'd cost ~£0.05 per
 * image; metadata-only selection is essentially free).
 *
 * Storage: image bytes live in the 'dr-media' Supabase Storage
 * bucket, which is public-read. The full public URL is constructed
 * from NEXT_PUBLIC_SUPABASE_URL + the bucket path so the slide
 * renderer can fetch the photo with no auth dance.
 */

import { getSupabaseAdmin } from "./supabase";

// Bucket name set during DR's Supabase project setup. Case-sensitive
// — Supabase treats 'DR-MEDIA' and 'dr-media' as distinct buckets.
export const MEDIA_BUCKET = "dr-media";

export const MEDIA_TONES = [
  "dignified",
  "emergency",
  "hopeful",
  "gratitude",
  "festival",
  "documentary",
] as const;

export type MediaTone = (typeof MEDIA_TONES)[number];

export const MEDIA_USE_CASES = [
  "emergency-hero",
  "response-illustration",
  "tier-illustration",
  "gratitude",
  "festival",
  "team-coverage",
  "beneficiary-portrait",
  "consent-on-file",
] as const;

export type MediaUseCase = (typeof MEDIA_USE_CASES)[number];

export interface MediaItem {
  id: string;
  storagePath: string;
  publicUrl: string;
  caption: string | null;
  tags: string[];
  campaignSlugs: string[];
  countryIso: string | null;
  eventTypes: string[];
  tone: string | null;
  useCases: string[];
  peopleVisible: boolean;
  identifiableMinors: boolean;
  takenAt: Date | null;
  uploadedByEmail: string | null;
  uploadedAt: Date;
  archivedAt: Date | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mimeType: string | null;
  dominantColor: string | null;
}

interface MediaRow {
  id: string;
  storage_path: string;
  caption: string | null;
  tags: string[];
  campaign_slugs: string[];
  country_iso: string | null;
  event_types: string[];
  tone: string | null;
  use_cases: string[];
  people_visible: boolean;
  identifiable_minors: boolean;
  taken_at: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
  archived_at: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime_type: string | null;
  dominant_color: string | null;
}

/**
 * Public URL helper. Supabase Storage public buckets have URLs of the
 * form: {projectUrl}/storage/v1/object/public/{bucket}/{path}.
 *
 * Constructed in code rather than stored in the table so changing
 * project URL (e.g. migrating Supabase project) doesn't require
 * back-filling rows.
 */
export function publicUrlForPath(storagePath: string): string {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  return `${projectUrl.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;
}

function rowToItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    storagePath: row.storage_path,
    publicUrl: publicUrlForPath(row.storage_path),
    caption: row.caption,
    tags: row.tags ?? [],
    campaignSlugs: row.campaign_slugs ?? [],
    countryIso: row.country_iso,
    eventTypes: row.event_types ?? [],
    tone: row.tone,
    useCases: row.use_cases ?? [],
    peopleVisible: row.people_visible,
    identifiableMinors: row.identifiable_minors,
    takenAt: row.taken_at ? new Date(row.taken_at) : null,
    uploadedByEmail: row.uploaded_by_email,
    uploadedAt: new Date(row.uploaded_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    mimeType: row.mime_type,
    dominantColor: row.dominant_color,
  };
}

const MEDIA_SELECT_COLS =
  "id, storage_path, caption, tags, campaign_slugs, country_iso, event_types, tone, use_cases, people_visible, identifiable_minors, taken_at, uploaded_by_email, uploaded_at, archived_at, width, height, bytes, mime_type, dominant_color";

/* ─── Reads ───────────────────────────────────────────────────────── */

export interface ListMediaOptions {
  campaignSlug?: string;
  countryIso?: string;
  eventType?: string;
  tone?: string;
  query?: string;
  /** Set true to include archived items. Defaults false. */
  includeArchived?: boolean;
  limit?: number;
}

export async function listMedia(
  options: ListMediaOptions = {}
): Promise<MediaItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("media_library")
    .select(MEDIA_SELECT_COLS)
    .order("uploaded_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (!options.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (options.campaignSlug) {
    query = query.contains("campaign_slugs", [options.campaignSlug]);
  }
  if (options.countryIso) {
    query = query.eq("country_iso", options.countryIso);
  }
  if (options.eventType) {
    query = query.contains("event_types", [options.eventType]);
  }
  if (options.tone) {
    query = query.eq("tone", options.tone);
  }
  if (options.query) {
    // ILIKE on caption is a simple sufficient filter at this scale.
    // Full-text indexing can wait until the library exceeds ~5k items.
    query = query.ilike("caption", `%${options.query}%`);
  }

  const { data, error } = await query.returns<MediaRow[]>();
  if (error) {
    console.error("[media-library] list failed:", error);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media_library")
    .select(MEDIA_SELECT_COLS)
    .eq("id", id)
    .maybeSingle<MediaRow>();
  if (error) {
    console.error("[media-library] get failed:", error);
    return null;
  }
  return data ? rowToItem(data) : null;
}

/* ─── Candidate selection (for packet generator) ─────────────────── */

export interface CandidateMediaOptions {
  countryIso: string | null;
  eventType: string | null;
  campaignSlugs: string[];
  /** Max items to return — passed downstream as the candidate set Claude picks from. */
  limit?: number;
}

/**
 * Fetch a candidate set of media for an emergency event. Used by the
 * packet generator to populate the Claude prompt with a list of
 * possible images that match the event's geography / type / campaigns.
 *
 * Strategy: union-of-relevance with explicit ordering.
 *
 *   • Country match (most specific) — highest priority.
 *   • Event-type match — second.
 *   • Campaign-slug match — third (broad fit).
 *   • Otherwise: skip — irrelevant imagery dilutes the candidate set.
 *
 * Safeguarding: minors are excluded UNLESS they carry the
 * 'consent-on-file' use_case tag. Default-safe behaviour.
 *
 * We deliberately return metadata only (no image fetching here).
 * Claude picks IDs; the renderer fetches at composition time.
 */
export async function getCandidateMediaForEvent(
  options: CandidateMediaOptions
): Promise<MediaItem[]> {
  const supabase = getSupabaseAdmin();
  const limit = options.limit ?? 12;

  // Pull all candidates that match any of the three axes, then rank
  // client-side. Cheap at this scale (low-hundreds of rows in the
  // library) and avoids a complex SQL union.
  let query = supabase
    .from("media_library")
    .select(MEDIA_SELECT_COLS)
    .is("archived_at", null)
    .limit(60);

  // OR-chain: country_iso = X OR event_types && [...] OR campaign_slugs && [...]
  const orClauses: string[] = [];
  if (options.countryIso) {
    orClauses.push(`country_iso.eq.${options.countryIso}`);
  }
  if (options.eventType) {
    orClauses.push(`event_types.cs.{${options.eventType}}`);
  }
  if (options.campaignSlugs.length > 0) {
    for (const c of options.campaignSlugs) {
      orClauses.push(`campaign_slugs.cs.{${c}}`);
    }
  }
  if (orClauses.length > 0) {
    query = query.or(orClauses.join(","));
  } else {
    // No targeting hints — sample most recent uploads as a generic
    // fallback. Better than no imagery at all.
    return (await listMedia({ limit })).filter(
      (m) => !m.identifiableMinors || m.useCases.includes("consent-on-file")
    );
  }

  const { data, error } = await query.returns<MediaRow[]>();
  if (error) {
    console.error("[media-library] candidates query failed:", error);
    return [];
  }

  const items = (data ?? [])
    .map(rowToItem)
    // Safeguarding gate.
    .filter(
      (m) => !m.identifiableMinors || m.useCases.includes("consent-on-file")
    );

  // Rank by specificity. Higher = better fit.
  const rank = (m: MediaItem): number => {
    let s = 0;
    if (options.countryIso && m.countryIso === options.countryIso) s += 30;
    if (options.eventType && m.eventTypes.includes(options.eventType)) s += 20;
    for (const c of options.campaignSlugs) {
      if (m.campaignSlugs.includes(c)) s += 10;
    }
    // Use-case tags that imply slide-readiness.
    if (m.useCases.includes("emergency-hero")) s += 5;
    if (m.useCases.includes("response-illustration")) s += 3;
    // Recency tiebreak — newer wins.
    s += Math.max(0, 5 - daysSince(m.uploadedAt));
    return s;
  };

  return items
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit);
}

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

/* ─── Writes ──────────────────────────────────────────────────────── */

export interface CreateMediaInput {
  storagePath: string;
  caption?: string | null;
  tags?: string[];
  campaignSlugs?: string[];
  countryIso?: string | null;
  eventTypes?: string[];
  tone?: string | null;
  useCases?: string[];
  peopleVisible?: boolean;
  identifiableMinors?: boolean;
  takenAt?: Date | null;
  uploadedByEmail: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  mimeType?: string | null;
  dominantColor?: string | null;
  aiTagged?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}

export async function createMedia(
  input: CreateMediaInput
): Promise<MediaItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media_library")
    .insert({
      storage_path: input.storagePath,
      caption: input.caption ?? null,
      tags: input.tags ?? [],
      campaign_slugs: input.campaignSlugs ?? [],
      country_iso: input.countryIso ?? null,
      event_types: input.eventTypes ?? [],
      tone: input.tone ?? null,
      use_cases: input.useCases ?? [],
      people_visible: input.peopleVisible ?? false,
      identifiable_minors: input.identifiableMinors ?? false,
      taken_at: input.takenAt?.toISOString() ?? null,
      uploaded_by_email: input.uploadedByEmail,
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      mime_type: input.mimeType ?? null,
      dominant_color: input.dominantColor ?? null,
      ai_tagged_at: input.aiTagged ? new Date().toISOString() : null,
      ai_tag_model: input.aiTagged?.model ?? null,
      ai_tag_input_tokens: input.aiTagged?.inputTokens ?? null,
      ai_tag_output_tokens: input.aiTagged?.outputTokens ?? null,
    })
    .select(MEDIA_SELECT_COLS)
    .maybeSingle<MediaRow>();
  if (error || !data) {
    console.error("[media-library] insert failed:", error);
    return null;
  }
  return rowToItem(data);
}

export interface UpdateMediaInput {
  caption?: string | null;
  tags?: string[];
  campaignSlugs?: string[];
  countryIso?: string | null;
  eventTypes?: string[];
  tone?: string | null;
  useCases?: string[];
  peopleVisible?: boolean;
  identifiableMinors?: boolean;
  takenAt?: Date | null;
}

export async function updateMedia(
  id: string,
  input: UpdateMediaInput
): Promise<MediaItem | null> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.caption !== undefined) patch.caption = input.caption;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.campaignSlugs !== undefined)
    patch.campaign_slugs = input.campaignSlugs;
  if (input.countryIso !== undefined) patch.country_iso = input.countryIso;
  if (input.eventTypes !== undefined) patch.event_types = input.eventTypes;
  if (input.tone !== undefined) patch.tone = input.tone;
  if (input.useCases !== undefined) patch.use_cases = input.useCases;
  if (input.peopleVisible !== undefined)
    patch.people_visible = input.peopleVisible;
  if (input.identifiableMinors !== undefined)
    patch.identifiable_minors = input.identifiableMinors;
  if (input.takenAt !== undefined)
    patch.taken_at = input.takenAt?.toISOString() ?? null;

  const { data, error } = await supabase
    .from("media_library")
    .update(patch)
    .eq("id", id)
    .select(MEDIA_SELECT_COLS)
    .maybeSingle<MediaRow>();
  if (error || !data) {
    console.error("[media-library] update failed:", error);
    return null;
  }
  return rowToItem(data);
}

export async function archiveMedia(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("media_library")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);
  if (error) {
    console.error("[media-library] archive failed:", error);
    return false;
  }
  return true;
}

/* ─── Bulk operations (preselect: retag / quick delete) ──────────── */

/** Fetch several non-archived rows in one query (for bulk retag — we need
 *  each item's current arrays to union new tags/campaigns into). */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media_library")
    .select(MEDIA_SELECT_COLS)
    .in("id", ids)
    .is("archived_at", null)
    .returns<MediaRow[]>();
  if (error) {
    console.error("[media-library] getMediaByIds failed:", error);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

/** Archive (soft-delete) many rows in one query. Returns how many rows were
 *  actually archived (already-archived ids are skipped via the null guard). */
export async function archiveManyMedia(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media_library")
    .update({ archived_at: new Date().toISOString() })
    .in("id", ids)
    .is("archived_at", null)
    .select("id");
  if (error) {
    console.error("[media-library] bulk archive failed:", error);
    return 0;
  }
  return data?.length ?? 0;
}

/* ─── Storage reconciliation (bulk-upload support) ───────────────── */

export interface StorageFile {
  path: string;
  size: number;
  mimeType: string | null;
  lastModified: Date | null;
}

/**
 * Recursively list every file in the dr-media bucket. Supabase
 * Storage's list() is non-recursive — folders return as entries with
 * null metadata, files have metadata. Walk both, capped at depth 3
 * (covers our YYYY-MM/uuid.ext convention + any SMM-created subfolders).
 *
 * Used by the "Scan Storage" admin button to find files that exist on
 * disk but have no media_library row — i.e. files the SMM uploaded
 * directly via the Supabase Dashboard rather than through the in-app
 * upload form.
 */
export async function listAllStorageFiles(): Promise<StorageFile[]> {
  const supabase = getSupabaseAdmin();
  const results: StorageFile[] = [];

  async function recurse(prefix: string, depth: number) {
    if (depth > 3) return;
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) {
      console.error("[media-library] storage list failed:", error);
      return;
    }
    for (const item of data ?? []) {
      const isFolder = item.metadata == null;
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (isFolder) {
        await recurse(fullPath, depth + 1);
      } else {
        // Some Supabase versions surface .placeholder marker files when
        // a folder is empty — skip them. Real images are JPEG/PNG/WebP.
        if (item.name === ".emptyFolderPlaceholder") continue;
        const meta = item.metadata as Record<string, unknown> | null;
        results.push({
          path: fullPath,
          size: typeof meta?.size === "number" ? meta.size : 0,
          mimeType:
            typeof meta?.mimetype === "string" ? meta.mimetype : null,
          lastModified: item.updated_at
            ? new Date(item.updated_at)
            : null,
        });
      }
    }
  }

  await recurse("", 0);
  return results;
}

/**
 * Return the set of storage_path values already represented in the
 * media_library table — so the orphan scan can subtract this set
 * from the list of all storage files to find untagged uploads.
 */
export async function getAllKnownStoragePaths(): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const known = new Set<string>();
  // Pull in pages of 1000 — defensive in case the library ever grows
  // beyond Supabase's default page size.
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("media_library")
      .select("storage_path")
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error("[media-library] known-paths read failed:", error);
      break;
    }
    if (!data || data.length === 0) break;
    for (const row of data) known.add(row.storage_path);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return known;
}
