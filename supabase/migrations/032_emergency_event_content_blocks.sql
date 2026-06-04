-- Migration 032: add draft_content_blocks columns to emergency_events.
-- (Renumbered from 030 → 032 to deconflict with main's 030_blog_posts /
--  031_orphan_sponsorship. Already applied by content in Supabase as
--  "030"; re-running this file is a no-op thanks to IF NOT EXISTS.)
--
-- Phase 6b — single-stage content extraction. The legacy 3-stage packet
-- generator (StrategyBriefSchema → LaunchPacketSchema → RevisionListSchema)
-- composed full slide decks. Phase 6 splits that concern: Claude extracts
-- CONTENT BLOCKS, the SMM composes slides in the deck-builder UI.
--
-- These columns cache the per-event extraction so the SMM can re-open the
-- compose page without re-burning Claude credits. The hash is a SHA-256 of
-- the event's raw_payload — if upstream signal ingestion later overwrites
-- raw_payload (e.g. an OCHA situation report gets a fresh dispatch), the
-- hash changes and the next extract call re-runs Claude.
--
-- Schema shape stored in draft_content_blocks (jsonb):
--   {
--     title_options: [{ text, char_count, notes }],
--     eyebrow_options: [{ text }],
--     body_options: [{ text, char_count }],
--     verified_facts: [{ text, source }],
--     quotes: [{ text, attribution }],
--     tier_lines: [{ amount_gbp, short_description, long_description }],
--     hashtags: [string],
--     captions: { instagram, facebook, x },
--     email: { subject_lines: [string], body }
--   }
--
-- Type-checked client-side via ContentBlocksSchema in
-- src/lib/social-content-extraction.ts.
--
-- Idempotent.

ALTER TABLE emergency_events
  ADD COLUMN IF NOT EXISTS draft_content_blocks jsonb,
  ADD COLUMN IF NOT EXISTS draft_content_blocks_hash text;

COMMENT ON COLUMN emergency_events.draft_content_blocks IS
  'Phase 6b — typed content blocks (titles, bodies, facts, quotes, tiers, hashtags, captions, email) extracted by Claude from raw_payload. The deck-builder UI consumes these as draggable cards.';

COMMENT ON COLUMN emergency_events.draft_content_blocks_hash IS
  'Phase 6b — SHA-256 of raw_payload at extraction time. Used as a cache key by extractContentBlocks(); re-runs Claude only when the hash drifts.';
