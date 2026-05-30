-- Migration 033: deck_drafts — SMM-composed deck drafts per event/platform.
-- (Renumbered from 031 → 033 to deconflict with main's 031_orphan_sponsorship.
--  Already applied by content in Supabase as "031"; re-running is a no-op
--  thanks to "create table if not exists".)
--
-- Phase 6e of the Social Operations Platform. The Compose page lets the
-- SMM drag content cards into template slides, building up a deck of
-- composed slides without ever invoking the legacy Claude auto-draft
-- pipeline. This table holds the WIP composition state so the SMM can
-- close the tab, walk away, and resume.
--
-- One draft per (event, platform). The Compose page upserts on a 1s
-- debounce whenever the deck mutates. "Create post" (export) reads the
-- same row.
--
-- The slides JSONB column holds a SlideDraft[] in the shape:
--
--   [
--     {
--       slideId: "<client uuid>",          -- stable across reorders
--       templateId: "ig-hero-magazine-cover",
--       slotValues: {                      -- SlotValues from social-templates/types
--         eyebrow: { type: "text", text: "FROM THE FIELD · 25 MAY 2026" },
--         title:   { type: "text", text: "Children carry water before dawn" },
--         photo:   { type: "image", mediaId: "dr:<uuid>" }
--       },
--       imageMediaIds: {                   -- mirrors image slot values for render API
--         photo: "dr:<uuid>"
--       }
--     },
--     ...
--   ]
--
-- Shape is enforced at the application layer (the PUT endpoint validates
-- with zod) — we keep it as plain JSONB here so the schema can evolve
-- without migrations as new slot types are added.
--
-- Idempotent.

create table if not exists deck_drafts (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references emergency_events(id)
    on delete cascade,

  platform text not null check (platform in ('instagram','facebook','x')),

  slides jsonb not null default '[]'::jsonb,

  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (event_id, platform)
);

create index if not exists idx_deck_drafts_event on deck_drafts(event_id);

alter table deck_drafts enable row level security;

comment on table deck_drafts is
  'SMM-composed deck drafts (Phase 6e). One row per (event, platform). The Compose page upserts on a 1s debounce; slides JSONB holds the SlideDraft[] in the deck-builder client shape.';
