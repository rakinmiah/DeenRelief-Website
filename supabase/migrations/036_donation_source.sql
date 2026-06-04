-- Migration 036: donation source (web vs offline).
--
-- Distinguishes donations that came through the website checkout
-- ('web', the default + existing behaviour) from donations logged via
-- the offline Gift Aid declaration form ('offline') — e.g. a donor who
-- paid by bank transfer / cash and submitted a Gift Aid declaration so
-- the charity can reclaim the 25%.
--
-- Offline donations are created with status='pending' and only become
-- claimable/counted once an admin confirms the money actually arrived
-- (status → 'succeeded'). This column lets the admin UI flag them and
-- keeps them out of Stripe reconciliation (they have no Stripe object).
--
-- Idempotent.

alter table donations
  add column if not exists source text not null default 'web';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'donations_source_check'
  ) then
    alter table donations
      add constraint donations_source_check check (source in ('web', 'offline'));
  end if;
end $$;

comment on column donations.source is
  'Where the donation originated: ''web'' (website checkout, default) or ''offline'' (logged via the /gift-aid declaration form for bank-transfer/cash gifts; created pending until an admin confirms).';
