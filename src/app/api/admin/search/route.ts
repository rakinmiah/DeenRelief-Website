/**
 * GET /api/admin/search?q=...
 *
 * Backend for the DR Admin command palette (⌘K). Deterministic, £0 — a
 * fan-out of cheap `ilike` lookups across the admin's record tables, run
 * in parallel and returned as grouped, deep-linkable results.
 *
 * SECURITY: this endpoint is the trust boundary. It re-derives the role
 * from the signed session cookie (never trusts the client) and only
 * queries the tables that role is allowed to see — mirroring the page
 * guards in admin-session.ts and the nav gating in admin-nav.tsx:
 *
 *   - admin        → every record table
 *   - writer       → blog posts (their OWN drafts only)
 *   - sponsorship  → orphans + sponsors
 *   - social access (email allow-list) → emergencies + short links
 *
 * No AI, no caching needed — each query hits an existing index and the
 * whole fan-out is a handful of indexed `ilike`s.
 */

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { canAccessSocial } from "@/lib/admin-social-access";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { id: string; title: string; subtitle?: string; href: string };
type Group = { key: string; label: string; items: Item[] };

/** Per-table result cap — keeps the palette tight and the queries cheap. */
const PER_GROUP = 6;

/**
 * Strip the characters that are structural inside a PostgREST `.or()`
 * filter (commas separate conditions, parens group them, `*`/`%` are
 * wildcards) so a user's raw query can't break or inject into the
 * filter. Keep the characters that appear in real names / emails /
 * slugs: letters, digits, space, @ . - _.
 */
function sanitize(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}@.\-_ ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const term = sanitize(url.searchParams.get("q") ?? "");
  if (term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const role = session.role ?? "admin";
  const email = session.email ?? null;
  const isAdmin = role === "admin";
  const social = canAccessSocial(email);

  const supabase = getSupabaseAdmin();
  const like = `*${term}*`; // PostgREST `.or()` wildcard is `*`, not `%`

  // Each searcher returns a populated Group (or null if not enabled /
  // empty). They run concurrently; one failing query degrades to null
  // rather than failing the whole palette.
  const searchers: Array<Promise<Group | null>> = [];

  const push = (enabled: boolean, run: () => Promise<Group | null>) => {
    if (enabled) searchers.push(run().catch(() => null));
  };

  push(isAdmin, async () => {
    const { data } = await supabase
      .from("donors")
      .select("id, full_name, email")
      .or(`full_name.ilike.${like},email.ilike.${like}`)
      .limit(PER_GROUP);
    return groupOf("donors", "Donors", (data ?? []).map((d) => ({
      id: d.id,
      title: d.full_name || d.email,
      subtitle: d.email,
      href: `/admin/donors/${d.id}`,
    })));
  });

  push(isAdmin, async () => {
    const { data } = await supabase
      .from("bazaar_orders")
      .select("id, contact_email, status, total_pence, tracking_number")
      .or(`contact_email.ilike.${like},tracking_number.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(PER_GROUP);
    return groupOf("orders", "Bazaar orders", (data ?? []).map((o) => ({
      id: o.id,
      title: o.contact_email,
      subtitle: `${prettyStatus(o.status)} · £${((o.total_pence ?? 0) / 100).toFixed(2)}`,
      href: `/admin/bazaar/orders/${o.id}`,
    })));
  });

  push(isAdmin, async () => {
    const { data } = await supabase
      .from("bazaar_products")
      .select("id, name, category, sku")
      .or(`name.ilike.${like},sku.ilike.${like},slug.ilike.${like}`)
      .limit(PER_GROUP);
    return groupOf("products", "Products", (data ?? []).map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.category,
      href: `/admin/bazaar/products/${p.id}`,
    })));
  });

  push(isAdmin, async () => {
    const { data } = await supabase
      .from("bazaar_inquiries")
      .select("id, customer_name, customer_email, subject, status")
      .or(`customer_name.ilike.${like},customer_email.ilike.${like},subject.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(PER_GROUP);
    return groupOf("inquiries", "Inquiries", (data ?? []).map((q) => ({
      id: q.id,
      title: q.customer_name || q.customer_email,
      subtitle: `${q.subject ?? ""} · ${prettyStatus(q.status)}`.replace(/^ · /, ""),
      href: `/admin/bazaar/inquiries/${q.id}`,
    })));
  });

  push(isAdmin || role === "writer", async () => {
    let qb = supabase
      .from("blog_posts")
      .select("id, title, status, category, author_email")
      .or(`title.ilike.${like},category.ilike.${like},slug.ilike.${like}`)
      .order("updated_at", { ascending: false })
      .limit(PER_GROUP);
    // A writer only ever searches their own drafts (matches requireBlogAccess).
    if (role === "writer" && email) qb = qb.eq("author_email", email);
    const { data } = await qb;
    return groupOf("blog", "Blog posts", (data ?? []).map((b) => ({
      id: b.id,
      title: b.title || "(untitled)",
      subtitle: prettyStatus(b.status),
      href: `/admin/blog/${b.id}`,
    })));
  });

  push(isAdmin || role === "sponsorship", async () => {
    const { data } = await supabase
      .from("orphans")
      .select("id, display_name, country, region, status, internal_ref")
      .or(`display_name.ilike.${like},internal_ref.ilike.${like},country.ilike.${like},region.ilike.${like},slug.ilike.${like}`)
      .limit(PER_GROUP);
    return groupOf("orphans", "Orphans", (data ?? []).map((o) => ({
      id: o.id,
      title: o.display_name || "(unnamed)",
      subtitle: [prettyStatus(o.status), o.country].filter(Boolean).join(" · "),
      href: `/admin/sponsorship/orphans/${o.id}`,
    })));
  });

  push(isAdmin || role === "sponsorship", async () => {
    const { data } = await supabase
      .from("sponsor_profiles")
      .select("id, full_name, contact_email, status")
      .or(`full_name.ilike.${like},contact_email.ilike.${like}`)
      .limit(PER_GROUP);
    return groupOf("sponsors", "Sponsors", (data ?? []).map((s) => ({
      id: s.id,
      title: s.full_name || s.contact_email,
      subtitle: [prettyStatus(s.status), s.contact_email].filter(Boolean).join(" · "),
      href: `/admin/sponsorship/sponsors/${s.id}`,
    })));
  });

  push(social, async () => {
    const { data } = await supabase
      .from("emergency_events")
      .select("id, title, region, country_iso, status")
      .or(`title.ilike.${like},region.ilike.${like},country_iso.ilike.${like}`)
      .order("detected_at", { ascending: false })
      .limit(PER_GROUP);
    return groupOf("events", "Emergencies", (data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: [prettyStatus(e.status), e.region].filter(Boolean).join(" · "),
      href: `/admin/social/first-response/${e.id}`,
    })));
  });

  push(social, async () => {
    const { data } = await supabase
      .from("short_links")
      .select("id, slug, campaign_slug, platform")
      .is("archived_at", null)
      .or(`slug.ilike.${like},campaign_slug.ilike.${like},notes.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(PER_GROUP);
    return groupOf("links", "Short links", (data ?? []).map((l) => ({
      id: l.id,
      title: `/r/${l.slug}`,
      subtitle: [l.campaign_slug, l.platform].filter(Boolean).join(" · ") || undefined,
      href: `/admin/social/links`,
    })));
  });

  push(isAdmin, async () => {
    const { data } = await supabase
      .from("dr_media")
      .select("id, filename, mime_type, description")
      .or(`filename.ilike.${like},description.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(PER_GROUP);
    return groupOf("media", "Media", (data ?? []).map((m) => ({
      id: m.id,
      title: m.filename,
      subtitle: m.mime_type,
      href: `/admin/media/${m.id}`,
    })));
  });

  const settled = await Promise.all(searchers);
  const results = settled.filter((g): g is Group => g !== null && g.items.length > 0);

  return NextResponse.json({ results });
}

function groupOf(key: string, label: string, items: Item[]): Group | null {
  if (!items.length) return null;
  return { key, label, items };
}

/** "pending_payment" → "Pending payment". */
function prettyStatus(s: string | null | undefined): string {
  if (!s) return "";
  const spaced = s.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
