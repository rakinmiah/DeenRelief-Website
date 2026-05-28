-- Migration 029: external_imagery — third-party verified imagery
-- discovered automatically per event and offered to Claude alongside
-- DR's media library when drafting the launch packet.
--
-- Phase 4l of the Social Operations Platform. The launch packet
-- generator picks imagery either from DR's own media library
-- (best for brand authenticity) OR from this external pool (best
-- when DR has no field photos for a specific event yet).
--
-- Sources currently wired or planned:
--   wikimedia    — Wikimedia Commons (CC-BY / CC0 photos)
--   nasa_eonet   — NASA Earth Observatory imagery linked to events
--   reliefweb    — ReliefWeb media library (blocked on appname approval)
--   ifrc         — IFRC GO Files attached to operations
--   un_photo     — UN Multimedia (reserved — scraping risk)
--
-- Every row carries: source URL, attribution text, license name +
-- URL, so the slide renderer can compose a proper credit line.
--
-- Idempotent.

create table if not exists external_imagery (
  id uuid primary key default gen_random_uuid(),

  -- Link back to the event this imagery was fetched for. We refetch
  -- per event rather than caching globally because relevance is
  -- event-specific.
  emergency_event_id uuid not null
    references emergency_events(id)
    on delete cascade,

  -- Which third-party source provided this image.
  source text not null check (source in (
    'wikimedia',
    'nasa_eonet',
    'reliefweb',
    'ifrc',
    'un_photo'
  )),

  -- Full-resolution image URL — what the renderer fetches at slide
  -- composition time (inlined as data URI to avoid Satori quirks).
  url text not null,
  -- Thumbnail URL when available — for admin browse views.
  thumbnail_url text,

  -- Editorial metadata pulled from the source's API.
  title text,
  description text,

  -- Attribution + licensing — DRIVES the credit line on slides.
  -- Format: "Photo: <author> · <source>" rendered bottom-right.
  credit_text text not null,
  -- e.g. 'CC-BY-SA-4.0', 'CC0', 'Public Domain', 'CC-BY-4.0'.
  license text not null,
  license_url text,

  -- Source-side dimensions, where available — used for quality
  -- filtering in the candidate selector (skip tiny images).
  width int,
  height int,

  -- When the source itself published / uploaded the image — used for
  -- recency filtering (we strongly prefer imagery uploaded in the
  -- N weeks around the event detection time).
  uploaded_at_source timestamptz,

  -- Bookkeeping.
  fetched_at timestamptz not null default now(),
  -- Set true when Claude actually selects this image for a slide
  -- in a draft. Lets us downstream-track which sources produce
  -- the most-used imagery vs noise.
  selected boolean not null default false,
  archived_at timestamptz,

  -- Deduplication: same URL fetched twice for the same event = no-op.
  unique (emergency_event_id, url)
);

create index if not exists idx_external_imagery_event
  on external_imagery (emergency_event_id)
  where archived_at is null;

create index if not exists idx_external_imagery_source
  on external_imagery (source)
  where archived_at is null;

alter table external_imagery enable row level security;

comment on table external_imagery is
  'Verified, free-to-use, attributed third-party imagery fetched per event from Wikimedia Commons, ReliefWeb, NASA EONET, IFRC etc. Offered to the launch-packet generator as candidates alongside DR media library; credit line auto-rendered on slides that use this source.';
