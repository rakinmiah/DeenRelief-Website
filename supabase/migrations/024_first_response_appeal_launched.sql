-- Migration 024: track when an emergency event's appeal was launched.
--
-- Phase 4b (Task #14). When the SMM clicks "Launch appeal" on an
-- emergency, the orchestrator stamps this column. Used for:
--   • Visual cue on the dashboard ("Launched 14 min ago")
--   • Auditing speed-to-market per event (a key First Response metric)
--   • Idempotency — the button refuses to re-fire if already launched
--   • Wave-2 retention (Phase 6) — schedules follow-ups N days after this
--
-- Idempotent. emergency_events.status moves to 'launched' at the same time;
-- this timestamp is the precise launch moment (status alone doesn't tell us
-- when).

alter table emergency_events
  add column if not exists appeal_launched_at timestamptz,
  add column if not exists appeal_launched_by_email text;

comment on column emergency_events.appeal_launched_at is
  'When the SMM clicked "Launch appeal" — banner + featured campaign + /now spotlight + push were fired in one shot. Pairs with status=''launched''.';
