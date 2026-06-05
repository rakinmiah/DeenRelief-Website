-- 041_deck_draft_title.sql
-- Give a deck draft an editable HEADER / name.
--
-- The deck-builder editor's top bar shows the draft's header (it defaults
-- to the emergency event's title and also feeds the export filename + the
-- default "Mark as posted" title). This lets the SMM rename a draft to
-- something meaningful — "Gaza — winter appeal carousel", "Sudan reel v2"
-- — so multiple drafts off the same report stay distinguishable on the
-- resume screen and in exports.
--
-- Additive, nullable, idempotent: existing rows keep title = null (the UI
-- falls back to the event title), and the API write is resilient to this
-- column being absent (it retries without `title`) so the editor keeps
-- saving even before this migration is applied.

alter table deck_drafts
  add column if not exists title text;

comment on column deck_drafts.title is
  'Optional SMM-set draft header/name. null → the UI falls back to the emergency event title. Surfaced in the editor top bar, the resume screen, the export filename and the default posted-title.';
