/**
 * GET  /api/admin/social-deck-drafts/[eventId]?platform=instagram
 * PUT  /api/admin/social-deck-drafts/[eventId]
 *
 * Deck-draft persistence for the Phase 6e Compose page. One draft per
 * (event, platform); the Compose page upserts on a 1s debounce and
 * reads on initial mount to resume composition.
 *
 * Shape stored in deck_drafts.slides JSONB:
 *
 *   SlideDraft[] = [{
 *     slideId: string,                  // client uuid, stable across reorders
 *     templateId: string,               // social-templates registry id
 *     slotValues: SlotValues,           // see social-templates/types
 *     imageMediaIds: Record<string,string>  // mirrors image:* slot values
 *   }]
 *
 * The schema is validated at the application layer (zod) — flexible
 * enough to evolve with new slot types without a migration.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PLATFORMS = ["instagram", "facebook", "x"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

const SlideDraftSchema = z.object({
  slideId: z.string().min(1),
  templateId: z.string().min(1),
  slotValues: z.record(z.string(), z.unknown()).default({}),
  imageMediaIds: z.record(z.string(), z.string()).default({}),
});

const PutBodySchema = z.object({
  platform: z.enum(VALID_PLATFORMS),
  slides: z.array(SlideDraftSchema),
});

export async function GET(
  request: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAdminSession();
  const { eventId } = await ctx.params;

  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform");
  const supabase = getSupabaseAdmin();

  // LIST MODE — no platform → return a lightweight summary of every saved draft
  // for this event (used by the deck-builder resume screen to offer "continue
  // editing" before any extraction runs).
  if (!platformParam) {
    void session;
    const { data, error } = await supabase
      .from("deck_drafts")
      .select("platform, slides, updated_at")
      .eq("event_id", eventId)
      .order("updated_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 });
    }
    const drafts = (data ?? [])
      .map((d) => ({
        platform: d.platform as Platform,
        slideCount: Array.isArray(d.slides) ? d.slides.length : 0,
        updatedAt: d.updated_at as string,
      }))
      // Only drafts that actually hold slides are worth resuming.
      .filter((d) => d.slideCount > 0);
    return NextResponse.json({ eventId, drafts });
  }

  if (!VALID_PLATFORMS.includes(platformParam as Platform)) {
    return NextResponse.json(
      { error: "Invalid platform query param." },
      { status: 400 }
    );
  }
  const platform = platformParam as Platform;

  const { data, error } = await supabase
    .from("deck_drafts")
    .select("id, event_id, platform, slides, created_by_email, created_at, updated_at")
    .eq("event_id", eventId)
    .eq("platform", platform)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `DB error: ${error.message}` },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        eventId,
        platform,
        slides: [],
        exists: false,
      },
      { status: 200 }
    );
  }

  void session; // session is only needed for the auth gate
  return NextResponse.json({
    eventId: data.event_id,
    platform: data.platform,
    slides: data.slides ?? [],
    createdByEmail: data.created_by_email,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    exists: true,
  });
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const session = await requireAdminSession();
  const { eventId } = await ctx.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = PutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body shape.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { platform, slides } = parsed.data;

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Upsert on (event_id, platform). If a row exists we keep its
  // created_at / created_by_email and only bump updated_at + slides.
  const { data: existing } = await supabase
    .from("deck_drafts")
    .select("id, created_by_email, created_at")
    .eq("event_id", eventId)
    .eq("platform", platform)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("deck_drafts")
      .update({
        slides,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json(
        { error: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      eventId,
      platform,
      slides,
      updatedAt: now,
      created: false,
    });
  }

  const { error: insertErr } = await supabase.from("deck_drafts").insert({
    event_id: eventId,
    platform,
    slides,
    created_by_email: session.email ?? null,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    return NextResponse.json(
      { error: `Insert failed: ${insertErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    eventId,
    platform,
    slides,
    updatedAt: now,
    created: true,
  });
}
