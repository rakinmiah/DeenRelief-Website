-- 035_smm_preferences.sql
-- The SMM "taste profile" — a zero-cost self-learning loop.
--
-- When the SMM finishes a deck, we diff her choices in plain code (no AI call)
-- and merge the signals into one aggregated JSONB profile: which template she
-- picks per slide type, her typical headline length, etc. The auto-draft then
-- biases its DETERMINISTIC decisions (default template per role, copy ranking)
-- toward the profile, so it drifts toward her taste over time — without ever
-- spending a token. Single row keyed 'global' (one ops account).

create table if not exists smm_preferences (
  id text primary key default 'global',
  profile jsonb not null default '{}'::jsonb,
  samples int not null default 0,
  updated_at timestamptz not null default now()
);

insert into smm_preferences (id) values ('global') on conflict (id) do nothing;

alter table smm_preferences enable row level security;
