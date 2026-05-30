import "server-only";
import sanitizeHtml from "sanitize-html";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Admin data layer for the orphan sponsorship programme (migration 031).
 *
 * Only imported from /admin/sponsorship server components + server actions.
 * Every write uses the service-role client (bypasses RLS); role enforcement
 * happens at the action/page layer via requireSponsorshipAccess(). `bio` and
 * update `body_html` are sanitised here on the way IN so the sponsor render
 * can trust the stored HTML.
 *
 * SAFEGUARDING: this module handles children's data. Orphan profiles are
 * data-minimised by schema (first name/pseudonym, country+region, age band),
 * and media lives in the private orphan-media bucket — see orphan-media.ts.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type OrphanStatus =
  | "available"
  | "sponsored"
  | "paused"
  | "graduated"
  | "withdrawn";

export type AgeBand = "0-2" | "3-5" | "6-8" | "9-11" | "12-14" | "15-17";
export type Gender = "male" | "female" | "undisclosed";

export interface Orphan {
  id: string;
  slug: string;
  displayName: string;
  pseudonym: boolean;
  country: string;
  region: string | null;
  ageBand: AgeBand | null;
  dobYear: number | null;
  gender: Gender;
  status: OrphanStatus;
  bio: string;
  profilePhotoPath: string | null;
  internalRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrphanUpdate {
  id: string;
  orphanId: string;
  title: string;
  bodyHtml: string;
  periodLabel: string | null;
  published: boolean;
  publishedAt: string | null;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrphanUpdateMediaRow {
  id: string;
  updateId: string;
  orphanId: string;
  kind: "photo" | "video";
  storagePath: string;
  mimeType: string;
  sizeBytes: number | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export type SponsorStatus = "invited" | "active" | "suspended" | "closed";

export interface SponsorProfile {
  id: string;
  fullName: string;
  contactEmail: string;
  phone: string | null;
  marketingConsent: boolean;
  notifyNewUpdate: boolean;
  status: SponsorStatus;
  stripeCustomerId: string | null;
  invitedByEmail: string | null;
  activatedAt: string | null;
  createdAt: string;
}

export type SponsorshipStatus = "active" | "paused" | "ended";

export interface Sponsorship {
  id: string;
  sponsorId: string;
  orphanId: string;
  status: SponsorshipStatus;
  startedOn: string;
  endedOn: string | null;
  stripeSubscriptionId: string | null;
  createdByEmail: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
// Sanitisation + slug helpers
// ─────────────────────────────────────────────────────────────────

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote",
    "strong", "em", "s", "u", "code",
    "a",
  ],
  // No <img>: child imagery must come through orphan_update_media + signed
  // URLs, never inline in HTML where it could leak a public src.
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => {
      const rel =
        attribs.target === "_blank" ? "noopener noreferrer" : attribs.rel;
      return { tagName, attribs: { ...attribs, ...(rel ? { rel } : {}) } };
    },
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? "", SANITIZE_OPTIONS);
}

export function slugify(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Slug unique across orphans. Appends -2, -3, … on collision. */
export async function orphanUniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const root = slugify(base) || "child";
  let candidate = root;
  let n = 1;
  while (n < 200) {
    let query = supabase
      .from("orphans")
      .select("id")
      .ilike("slug", candidate)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("[sponsorship-admin] orphanUniqueSlug failed:", error.message);
      return `${root}-${n}`;
    }
    if (!data) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${n}`;
}

// ─────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function mapOrphan(r: Row): Orphan {
  return {
    id: r.id as string,
    slug: (r.slug as string) ?? "",
    displayName: (r.display_name as string) ?? "",
    pseudonym: Boolean(r.pseudonym),
    country: (r.country as string) ?? "",
    region: (r.region as string) ?? null,
    ageBand: (r.age_band as AgeBand) ?? null,
    dobYear: (r.dob_year as number) ?? null,
    gender: (r.gender as Gender) ?? "undisclosed",
    status: (r.status as OrphanStatus) ?? "available",
    bio: (r.bio as string) ?? "",
    profilePhotoPath: (r.profile_photo_path as string) ?? null,
    internalRef: (r.internal_ref as string) ?? null,
    createdAt: (r.created_at as string) ?? "",
    updatedAt: (r.updated_at as string) ?? "",
  };
}

function mapUpdate(r: Row): OrphanUpdate {
  return {
    id: r.id as string,
    orphanId: r.orphan_id as string,
    title: (r.title as string) ?? "",
    bodyHtml: (r.body_html as string) ?? "",
    periodLabel: (r.period_label as string) ?? null,
    published: Boolean(r.published),
    publishedAt: (r.published_at as string) ?? null,
    authorEmail: (r.author_email as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    updatedAt: (r.updated_at as string) ?? "",
  };
}

function mapMedia(r: Row): OrphanUpdateMediaRow {
  return {
    id: r.id as string,
    updateId: r.update_id as string,
    orphanId: r.orphan_id as string,
    kind: r.kind as "photo" | "video",
    storagePath: r.storage_path as string,
    mimeType: r.mime_type as string,
    sizeBytes: (r.size_bytes as number) ?? null,
    caption: (r.caption as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: (r.created_at as string) ?? "",
  };
}

function mapSponsor(r: Row): SponsorProfile {
  return {
    id: r.id as string,
    fullName: (r.full_name as string) ?? "",
    contactEmail: (r.contact_email as string) ?? "",
    phone: (r.phone as string) ?? null,
    marketingConsent: Boolean(r.marketing_consent),
    notifyNewUpdate: r.notify_new_update !== false,
    status: (r.status as SponsorStatus) ?? "invited",
    stripeCustomerId: (r.stripe_customer_id as string) ?? null,
    invitedByEmail: (r.invited_by_email as string) ?? null,
    activatedAt: (r.activated_at as string) ?? null,
    createdAt: (r.created_at as string) ?? "",
  };
}

function mapSponsorship(r: Row): Sponsorship {
  return {
    id: r.id as string,
    sponsorId: r.sponsor_id as string,
    orphanId: r.orphan_id as string,
    status: (r.status as SponsorshipStatus) ?? "active",
    startedOn: (r.started_on as string) ?? "",
    endedOn: (r.ended_on as string) ?? null,
    stripeSubscriptionId: (r.stripe_subscription_id as string) ?? null,
    createdByEmail: (r.created_by_email as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
  };
}

const ORPHAN_COLUMNS =
  "id, slug, display_name, pseudonym, country, region, age_band, dob_year, gender, status, bio, profile_photo_path, internal_ref, created_at, updated_at";
const UPDATE_COLUMNS =
  "id, orphan_id, title, body_html, period_label, published, published_at, author_email, created_at, updated_at";
const MEDIA_COLUMNS =
  "id, update_id, orphan_id, kind, storage_path, mime_type, size_bytes, caption, sort_order, created_at";
const SPONSOR_COLUMNS =
  "id, full_name, contact_email, phone, marketing_consent, notify_new_update, status, stripe_customer_id, invited_by_email, activated_at, created_at";
const SPONSORSHIP_COLUMNS =
  "id, sponsor_id, orphan_id, status, started_on, ended_on, stripe_subscription_id, created_by_email, created_at";

// ─────────────────────────────────────────────────────────────────
// Orphans
// ─────────────────────────────────────────────────────────────────

export async function listOrphans(): Promise<Orphan[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphans")
    .select(ORPHAN_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listOrphans failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapOrphan);
}

export async function getOrphanById(id: string): Promise<Orphan | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphans")
    .select(ORPHAN_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[sponsorship-admin] getOrphanById(${id}) failed:`, error.message);
    return null;
  }
  return data ? mapOrphan(data) : null;
}

export async function createOrphan(
  displayName: string
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const slug = await orphanUniqueSlug(displayName || "child");
  const { data, error } = await supabase
    .from("orphans")
    .insert({ slug, display_name: displayName.trim(), status: "available" })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[sponsorship-admin] createOrphan failed:", error?.message);
    return { error: "Couldn't create the profile." };
  }
  return { id: data.id as string };
}

export interface UpdateOrphanInput {
  slug: string;
  displayName: string;
  pseudonym: boolean;
  country: string;
  region: string | null;
  ageBand: AgeBand | null;
  dobYear: number | null;
  gender: Gender;
  status: OrphanStatus;
  bio: string;
  internalRef: string | null;
}

export async function updateOrphan(
  id: string,
  input: UpdateOrphanInput
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const slug = await orphanUniqueSlug(input.slug || input.displayName || "child", id);
  const { error } = await supabase
    .from("orphans")
    .update({
      slug,
      display_name: input.displayName.trim(),
      pseudonym: input.pseudonym,
      country: input.country.trim(),
      region: input.region?.trim() || null,
      age_band: input.ageBand,
      dob_year: input.dobYear,
      gender: input.gender,
      status: input.status,
      bio: sanitizeRichText(input.bio),
      internal_ref: input.internalRef?.trim() || null,
    })
    .eq("id", id);
  if (error) {
    console.error(`[sponsorship-admin] updateOrphan(${id}) failed:`, error.message);
    return { ok: false, error: "Couldn't save changes." };
  }
  return { ok: true, slug };
}

export async function setOrphanProfilePhoto(
  id: string,
  storagePath: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orphans")
    .update({ profile_photo_path: storagePath })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Updates
// ─────────────────────────────────────────────────────────────────

export async function listUpdates(orphanId: string): Promise<OrphanUpdate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_updates")
    .select(UPDATE_COLUMNS)
    .eq("orphan_id", orphanId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listUpdates failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapUpdate);
}

export async function getUpdateById(id: string): Promise<OrphanUpdate | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_updates")
    .select(UPDATE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[sponsorship-admin] getUpdateById(${id}) failed:`, error.message);
    return null;
  }
  return data ? mapUpdate(data) : null;
}

export async function createUpdate(input: {
  orphanId: string;
  authorEmail: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_updates")
    .insert({
      orphan_id: input.orphanId,
      author_email: input.authorEmail.toLowerCase().trim(),
      published: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[sponsorship-admin] createUpdate failed:", error?.message);
    return { error: "Couldn't create the update." };
  }
  return { id: data.id as string };
}

export async function updateUpdate(
  id: string,
  input: { title: string; bodyHtml: string; periodLabel: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orphan_updates")
    .update({
      title: input.title.trim(),
      body_html: sanitizeRichText(input.bodyHtml),
      period_label: input.periodLabel?.trim() || null,
    })
    .eq("id", id);
  if (error) {
    console.error(`[sponsorship-admin] updateUpdate(${id}) failed:`, error.message);
    return { ok: false, error: "Couldn't save changes." };
  }
  return { ok: true };
}

export async function publishUpdate(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const existing = await getUpdateById(id);
  if (!existing) return { ok: false, error: "Update not found." };
  const patch: Row = { published: true };
  if (!existing.publishedAt) patch.published_at = new Date().toISOString();
  const { error } = await supabase.from("orphan_updates").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Couldn't publish." };
  return { ok: true };
}

export async function unpublishUpdate(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orphan_updates")
    .update({ published: false })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't unpublish." };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Update media (rows; binaries handled by orphan-media.ts)
// ─────────────────────────────────────────────────────────────────

export async function listUpdateMedia(
  updateId: string
): Promise<OrphanUpdateMediaRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_update_media")
    .select(MEDIA_COLUMNS)
    .eq("update_id", updateId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[sponsorship-admin] listUpdateMedia failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapMedia);
}

export async function createUpdateMediaRow(input: {
  updateId: string;
  orphanId: string;
  kind: "photo" | "video";
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_update_media")
    .insert({
      update_id: input.updateId,
      orphan_id: input.orphanId,
      kind: input.kind,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      caption: input.caption ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[sponsorship-admin] createUpdateMediaRow failed:", error?.message);
    return { error: "Couldn't record the media." };
  }
  return { id: data.id as string };
}

export async function getMediaRowById(
  id: string
): Promise<OrphanUpdateMediaRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orphan_update_media")
    .select(MEDIA_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[sponsorship-admin] getMediaRowById(${id}) failed:`, error.message);
    return null;
  }
  return data ? mapMedia(data) : null;
}

export async function deleteMediaRow(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("orphan_update_media")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Sponsors
// ─────────────────────────────────────────────────────────────────

export async function listSponsors(): Promise<SponsorProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(SPONSOR_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listSponsors failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapSponsor);
}

export async function getSponsorById(id: string): Promise<SponsorProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(SPONSOR_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(`[sponsorship-admin] getSponsorById(${id}) failed:`, error.message);
    return null;
  }
  return data ? mapSponsor(data) : null;
}

/**
 * Upsert the sponsor_profiles row for an auth user. A NEW row starts as
 * 'invited'; an EXISTING row keeps its current status (so re-sending an
 * activation link to an already-active sponsor doesn't reset them). Only
 * fills blank fields on an existing row — never blanks out data we already
 * hold (e.g. a known stripe_customer_id).
 */
export async function upsertSponsorProfile(input: {
  id: string;
  fullName: string;
  contactEmail: string;
  stripeCustomerId?: string | null;
  invitedByEmail?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const existing = await getSponsorById(input.id);

  if (existing) {
    const patch: Row = {
      // Backfill name only if we didn't have one; never overwrite with blank.
      full_name: existing.fullName || input.fullName.trim(),
      contact_email: input.contactEmail.toLowerCase().trim(),
    };
    if (input.stripeCustomerId && !existing.stripeCustomerId) {
      patch.stripe_customer_id = input.stripeCustomerId;
    }
    if (input.invitedByEmail && !existing.invitedByEmail) {
      patch.invited_by_email = input.invitedByEmail.toLowerCase().trim();
    }
    const { error } = await supabase
      .from("sponsor_profiles")
      .update(patch)
      .eq("id", input.id);
    if (error) {
      console.error("[sponsorship-admin] upsertSponsorProfile update failed:", error.message);
      return { ok: false, error: "Couldn't save the sponsor profile." };
    }
    return { ok: true };
  }

  const { error } = await supabase.from("sponsor_profiles").insert({
    id: input.id,
    full_name: input.fullName.trim(),
    contact_email: input.contactEmail.toLowerCase().trim(),
    stripe_customer_id: input.stripeCustomerId ?? null,
    invited_by_email: input.invitedByEmail?.toLowerCase().trim() ?? null,
    status: "invited",
  });
  if (error) {
    console.error("[sponsorship-admin] upsertSponsorProfile insert failed:", error.message);
    return { ok: false, error: "Couldn't save the sponsor profile." };
  }
  return { ok: true };
}

/** Look up a sponsor_profiles row by email (case-insensitive). */
export async function getSponsorByEmail(
  email: string
): Promise<SponsorProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(SPONSOR_COLUMNS)
    .ilike("contact_email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    console.error("[sponsorship-admin] getSponsorByEmail failed:", error.message);
    return null;
  }
  return data ? mapSponsor(data) : null;
}

export async function setSponsorStatus(
  id: string,
  status: SponsorStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sponsor_profiles")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Sponsorships (the sponsor↔orphan links)
// ─────────────────────────────────────────────────────────────────

export async function listSponsorshipsForSponsor(
  sponsorId: string
): Promise<Sponsorship[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsorships")
    .select(SPONSORSHIP_COLUMNS)
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listSponsorshipsForSponsor failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapSponsorship);
}

export async function listSponsorshipsForOrphan(
  orphanId: string
): Promise<Sponsorship[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsorships")
    .select(SPONSORSHIP_COLUMNS)
    .eq("orphan_id", orphanId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listSponsorshipsForOrphan failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapSponsorship);
}

/**
 * Active, opted-in recipients to email when a new update is published for an
 * orphan: sponsors with a non-ended link to the child, an active account, and
 * notify_new_update on. Two-step (links → profiles) to keep it simple and
 * dependable across PostgREST embed quirks.
 */
export async function listUpdateEmailRecipients(
  orphanId: string
): Promise<{ email: string; fullName: string }[]> {
  const supabase = getSupabaseAdmin();
  const { data: links, error: linkErr } = await supabase
    .from("sponsorships")
    .select("sponsor_id")
    .eq("orphan_id", orphanId)
    .neq("status", "ended");
  if (linkErr || !links?.length) {
    if (linkErr) console.error("[sponsorship-admin] recipients links failed:", linkErr.message);
    return [];
  }
  const sponsorIds = Array.from(new Set(links.map((l) => l.sponsor_id as string)));

  const { data: profiles, error: profErr } = await supabase
    .from("sponsor_profiles")
    .select("contact_email, full_name, status, notify_new_update")
    .in("id", sponsorIds)
    .eq("status", "active")
    .eq("notify_new_update", true);
  if (profErr || !profiles) {
    if (profErr) console.error("[sponsorship-admin] recipients profiles failed:", profErr.message);
    return [];
  }
  return profiles
    .map((p) => ({
      email: (p.contact_email as string) ?? "",
      fullName: (p.full_name as string) ?? "",
    }))
    .filter((r) => r.email.includes("@"));
}

export async function createSponsorshipLink(input: {
  sponsorId: string;
  orphanId: string;
  stripeSubscriptionId?: string | null;
  createdByEmail: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsorships")
    .insert({
      sponsor_id: input.sponsorId,
      orphan_id: input.orphanId,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      created_by_email: input.createdByEmail.toLowerCase().trim(),
      status: "active",
    })
    .select("id")
    .single();
  if (error || !data) {
    // The partial unique index rejects a second active link to the same
    // child — surface that as a friendly message.
    const msg = error?.message?.includes("idx_sponsorships_unique_active")
      ? "This sponsor already has an active link to that child."
      : "Couldn't create the link.";
    console.error("[sponsorship-admin] createSponsorshipLink failed:", error?.message);
    return { error: msg };
  }
  // Reflect that the child now has a sponsor.
  await supabase.from("orphans").update({ status: "sponsored" }).eq("id", input.orphanId);
  return { id: data.id as string };
}

export async function setSponsorshipStatus(
  id: string,
  status: SponsorshipStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const patch: Row = { status };
  if (status === "ended") patch.ended_on = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("sponsorships").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Data subject requests (UK GDPR — export + erasure)
// ─────────────────────────────────────────────────────────────────

export type DataRequestType = "export" | "erasure";
export type DataRequestStatus = "pending" | "fulfilled" | "rejected";

export interface SponsorDataRequest {
  id: string;
  sponsorId: string;
  requestType: DataRequestType;
  status: DataRequestStatus;
  requestedAt: string;
  fulfilledAt: string | null;
  handledByEmail: string | null;
  notes: string | null;
  /** Joined for the admin queue display. */
  sponsorEmail: string | null;
}

export async function listDataRequests(): Promise<SponsorDataRequest[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sponsor_data_requests")
    .select(
      "id, sponsor_id, request_type, status, requested_at, fulfilled_at, handled_by_email, notes, sponsor_profiles(contact_email)"
    )
    .order("requested_at", { ascending: false });
  if (error) {
    console.error("[sponsorship-admin] listDataRequests failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: Row) => {
    const joined = r.sponsor_profiles as { contact_email?: string } | null;
    return {
      id: r.id as string,
      sponsorId: r.sponsor_id as string,
      requestType: r.request_type as DataRequestType,
      status: r.status as DataRequestStatus,
      requestedAt: (r.requested_at as string) ?? "",
      fulfilledAt: (r.fulfilled_at as string) ?? null,
      handledByEmail: (r.handled_by_email as string) ?? null,
      notes: (r.notes as string) ?? null,
      sponsorEmail: joined?.contact_email ?? null,
    };
  });
}

export async function markDataRequestFulfilled(
  id: string,
  handledByEmail: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sponsor_data_requests")
    .update({
      status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
      handled_by_email: handledByEmail.toLowerCase().trim(),
      notes: notes ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Erase a sponsor: delete the Supabase Auth user, which cascades to
 * sponsor_profiles, sponsorships, consents, data requests, and the access
 * log via `on delete cascade`. Orphan records are charity-owned and untouched.
 */
export async function eraseSponsor(
  sponsorId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(sponsorId);
  if (error) {
    console.error("[sponsorship-admin] eraseSponsor failed:", error.message);
    return { ok: false, error: "Couldn't erase the sponsor account." };
  }
  return { ok: true };
}
