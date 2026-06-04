-- Migration 032: sponsor notification preferences.
--
-- Adds a granular notification preference to the sponsor portal so donors can
-- choose whether to be emailed when there's a new update about the child they
-- sponsor. Separate from marketing_consent (newsletters/appeals) — this is
-- transactional/relationship comms about their own sponsorship.
--
-- Default ON: a sponsor opting in to monthly updates expects to hear when one
-- lands. They can turn it off in the account preference centre.
--
-- Idempotent: safe to run more than once.

alter table sponsor_profiles
  add column if not exists notify_new_update boolean not null default true;

comment on column sponsor_profiles.notify_new_update is
  'When true, the sponsor is emailed when a new update is published about a child they actively sponsor. Relationship comms (not marketing) — defaults on.';
