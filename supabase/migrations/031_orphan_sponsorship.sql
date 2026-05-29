-- Migration 031: Orphan Sponsorship account system.
--
-- Adds a PUBLIC account system (a first for this codebase — until now the
-- only logins were the custom HMAC admin session and the signed-token donor
-- /manage link). Donors who fund an orphan via a recurring donation get an
-- invite-only account at /sponsor where they see, per child they sponsor, a
-- feed of text updates plus photos/videos the charity uploads.
--
-- ─────────────────────────────────────────────────────────────────────────
-- WHY THIS MIGRATION LOOKS DIFFERENT FROM THE OTHERS
-- ─────────────────────────────────────────────────────────────────────────
-- Every prior table in this project follows the deny-by-default RLS pattern:
-- enable RLS, write NO policies, and reach the rows only through the
-- service-role client (getSupabaseAdmin) which bypasses RLS. That works when
-- the only reader is trusted server code.
--
-- Here the readers are SPONSORS — untrusted public users authenticated by
-- Supabase Auth. Their browser-side client carries the anon key plus a
-- sponsor JWT, and it reaches these tables directly. So this is the FIRST
-- migration that writes real auth.uid()-keyed RLS policies. Get them wrong
-- and one sponsor can read another child's data. They are the security
-- boundary, not app code — review them carefully.
--
-- ─────────────────────────────────────────────────────────────────────────
-- SAFEGUARDING + UK GDPR / DPA 2018 (this is media of CHILDREN)
-- ─────────────────────────────────────────────────────────────────────────
-- Data minimisation is enforced in the SCHEMA, not just policy:
--   * orphans.display_name holds a FIRST NAME or PSEUDONYM — never a full
--     legal name.
--   * Location is country + broad region only — NEVER town, address, or GPS.
--   * Age is stored as a band (and optional birth YEAR) — never a full DOB.
--   * Child photos/videos live ONLY in the PRIVATE `orphan-media` bucket and
--     are served exclusively through short-lived signed URLs minted server
--     side after an RLS-backed authorisation check (see orphan-media.ts).
-- Consent, lawful basis, subject-access export, and erasure are first-class
-- (sponsor_consents, sponsor_data_requests). Every sponsor view of a child's
-- media is recorded (child_media_access_log) for safeguarding accountability.
--
-- Idempotent: safe to run more than once.

-- ═════════════════════════════════════════════════════════════════════════
-- 0. updated_at trigger helper (shared by the new tables)
-- ═════════════════════════════════════════════════════════════════════════
-- Mirrors set_blog_posts_updated_at from migration 030 but generic so all the
-- sponsorship tables can share one function.
create or replace function set_sponsorship_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═════════════════════════════════════════════════════════════════════════
-- 1. Extend the admin_users role check with 'sponsorship'
-- ═════════════════════════════════════════════════════════════════════════
-- A new least-privilege staff role: the sponsorship coordinator who manages
-- orphan profiles, posts updates, uploads child media, and links sponsors.
-- Kept SEPARATE from 'admin' on purpose — child media is the most
-- safeguarding-sensitive surface in the app, and the coordinator should not
-- automatically gain donor financials. 'admin' (trustees) still get
-- everything, including this area.
--
-- Migration 030 last set this constraint to ('admin','social','writer').
alter table admin_users
  drop constraint if exists admin_users_role_check;

alter table admin_users
  add constraint admin_users_role_check
  check (role in ('admin', 'social', 'writer', 'sponsorship'));

comment on column admin_users.role is
  'One of ''admin'' (full DR Admin), ''social'' (social/marketing tools only), ''writer'' (blog drafts, cannot publish), or ''sponsorship'' (orphan profiles, updates, child media, sponsor links in /admin/sponsorship — no donor financials).';

-- ═════════════════════════════════════════════════════════════════════════
-- 2. orphans — data-minimised child profiles
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists orphans (
  id uuid primary key default gen_random_uuid(),
  -- Internal URL key for /sponsor/orphan/<slug> and admin links. NOT derived
  -- from the child's real name — opaque so the URL leaks nothing.
  slug text not null,
  -- SAFEGUARDING: first name or protective pseudonym ONLY. Never a full
  -- legal name. If pseudonym=true the display_name is an alias.
  display_name text not null default '',
  pseudonym boolean not null default false,
  -- SAFEGUARDING: country + broad region only. region is a governorate /
  -- province at most — NEVER a town, address, camp name, or GPS coordinate.
  country text not null default '',
  region text,
  -- SAFEGUARDING: age stored as a BAND, never an exact date of birth.
  -- dob_year is optional and the finest birth granularity we keep.
  age_band text check (age_band in ('0-2','3-5','6-8','9-11','12-14','15-17')),
  dob_year int check (dob_year is null or (dob_year between 1990 and 2030)),
  gender text not null default 'undisclosed'
    check (gender in ('male','female','undisclosed')),
  -- Lifecycle. 'available' = not yet sponsored; 'graduated' = aged out of the
  -- programme; 'withdrawn' = removed (e.g. family reunification).
  status text not null default 'available'
    check (status in ('available','sponsored','paused','graduated','withdrawn')),
  -- Sanitised HTML (sanitize-html, server-side on every write). General
  -- wellbeing narrative — must contain NO identifying detail (school name,
  -- exact location, surname, etc.). Reviewed by the coordinator.
  bio text not null default '',
  -- Object key in the PRIVATE orphan-media bucket. Served only via signed
  -- URL — never a public URL. Nullable.
  profile_photo_path text,
  -- Field-partner reference for reconciliation. ADMIN-ONLY: never exposed to
  -- sponsors (no RLS select policy returns this to them in practice because
  -- the whole row is gated, but treat as internal regardless).
  internal_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_orphans_slug_lower
  on orphans (lower(slug));
create index if not exists idx_orphans_status
  on orphans (status);

drop trigger if exists trg_orphans_updated_at on orphans;
create trigger trg_orphans_updated_at
  before update on orphans
  for each row execute function set_sponsorship_updated_at();

comment on table orphans is
  'Data-minimised orphan profiles for the sponsorship programme. SAFEGUARDING: first name/pseudonym only, country+broad region only (never address/GPS), age band not DOB, photos only in the private orphan-media bucket. Sponsors read a row only via RLS when actively linked through sponsorships.';

-- ═════════════════════════════════════════════════════════════════════════
-- 3. sponsor_profiles — app-level sponsor record, 1:1 with auth.users
-- ═════════════════════════════════════════════════════════════════════════
-- The credential (email + hashed password) lives in Supabase's auth.users.
-- This table holds the app PII + lifecycle. on delete cascade ties erasure of
-- the auth user to removal of everything we hold about them.
create table if not exists sponsor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  -- Mirror of the auth email for admin convenience (admins use the
  -- service-role client and don't read auth.users directly in the UI).
  contact_email text not null,
  phone text,
  -- Marketing is opt-in and separate from the sponsorship relationship.
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  -- 'invited'  — auth user created, no password set yet (invite sent).
  -- 'active'   — password set, consents captured.
  -- 'suspended'— temporarily blocked by an admin.
  -- 'closed'   — sponsor closed the account (pre-erasure).
  status text not null default 'invited'
    check (status in ('invited','active','suspended','closed')),
  -- Correlate to the donor / Stripe customer that funds the sponsorship.
  stripe_customer_id text,
  invited_by_email text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sponsor_profiles_stripe
  on sponsor_profiles (stripe_customer_id);
create index if not exists idx_sponsor_profiles_email_lower
  on sponsor_profiles (lower(contact_email));

drop trigger if exists trg_sponsor_profiles_updated_at on sponsor_profiles;
create trigger trg_sponsor_profiles_updated_at
  before update on sponsor_profiles
  for each row execute function set_sponsorship_updated_at();

comment on table sponsor_profiles is
  'Sponsor account record, 1:1 with auth.users (cascade on user delete). Holds app PII + lifecycle + marketing consent. Credentials live in Supabase Auth.';

-- ═════════════════════════════════════════════════════════════════════════
-- 4. sponsorships — many-to-many link (one sponsor → many orphans)
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists sponsorships (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references auth.users(id) on delete cascade,
  -- on delete restrict: never silently lose the link history if someone
  -- tries to delete an orphan that still has sponsorships. Coordinator must
  -- end the sponsorship first.
  orphan_id uuid not null references orphans(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active','paused','ended')),
  started_on date not null default current_date,
  ended_on date,
  -- The recurring Stripe subscription funding this specific link, if known.
  stripe_subscription_id text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one NON-ended link per (sponsor, orphan); historical 'ended' rows
-- are allowed to accumulate so we keep an accurate relationship history.
create unique index if not exists idx_sponsorships_unique_active
  on sponsorships (sponsor_id, orphan_id) where status <> 'ended';
create index if not exists idx_sponsorships_sponsor
  on sponsorships (sponsor_id);
create index if not exists idx_sponsorships_orphan
  on sponsorships (orphan_id);

drop trigger if exists trg_sponsorships_updated_at on sponsorships;
create trigger trg_sponsorships_updated_at
  before update on sponsorships
  for each row execute function set_sponsorship_updated_at();

comment on table sponsorships is
  'Links a sponsor (auth.users) to an orphan. Many-to-many: one sponsor can fund several children. status<>''ended'' grants the sponsor RLS read access to that orphan and its published updates/media.';

-- ═════════════════════════════════════════════════════════════════════════
-- 5. orphan_updates — monthly text+media posts
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists orphan_updates (
  id uuid primary key default gen_random_uuid(),
  orphan_id uuid not null references orphans(id) on delete cascade,
  title text not null default '',
  -- Sanitised HTML (sanitize-html, server-side on every write).
  body_html text not null default '',
  -- Human label for the period this update covers, e.g. "May 2026".
  period_label text,
  published boolean not null default false,
  published_at timestamptz,
  author_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orphan_updates_orphan_pub
  on orphan_updates (orphan_id, published, published_at desc);

drop trigger if exists trg_orphan_updates_updated_at on orphan_updates;
create trigger trg_orphan_updates_updated_at
  before update on orphan_updates
  for each row execute function set_sponsorship_updated_at();

comment on table orphan_updates is
  'Monthly text+media updates about an orphan. Sponsors read only published=true rows for orphans they are actively linked to (RLS). Drafts are coordinator-only via service-role.';

-- ═════════════════════════════════════════════════════════════════════════
-- 6. orphan_update_media — references to objects in the PRIVATE bucket
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists orphan_update_media (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references orphan_updates(id) on delete cascade,
  -- Denormalised from the parent update so RLS can authorise on a single
  -- join to sponsorships without a second hop through orphan_updates.
  orphan_id uuid not null references orphans(id) on delete cascade,
  kind text not null check (kind in ('photo','video')),
  -- Object key in the private orphan-media bucket. This row tells the sponsor
  -- the media EXISTS; the bytes are gated behind a signed URL (see §11).
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_orphan_update_media_update
  on orphan_update_media (update_id);
create index if not exists idx_orphan_update_media_orphan
  on orphan_update_media (orphan_id);

comment on table orphan_update_media is
  'Pointers to child photos/videos in the PRIVATE orphan-media bucket, attached to an update. A matching RLS row lets a linked sponsor learn the media exists; downloading requires a server-minted short-lived signed URL.';

-- ═════════════════════════════════════════════════════════════════════════
-- 7. sponsor_consents — append-only GDPR consent / lawful-basis audit
-- ═════════════════════════════════════════════════════════════════════════
-- Never overwritten. Each consent event (grant or withdrawal) is a new row,
-- so we can prove what a sponsor agreed to, when, and against which policy
-- version.
create table if not exists sponsor_consents (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null
    check (consent_type in ('account_terms','privacy_policy','child_media_confidentiality','marketing')),
  -- UK GDPR Art. 6 lawful basis for the processing this consent covers.
  lawful_basis text not null
    check (lawful_basis in ('consent','contract','legitimate_interest')),
  granted boolean not null,
  policy_version text,
  recorded_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create index if not exists idx_sponsor_consents_sponsor
  on sponsor_consents (sponsor_id, consent_type, recorded_at desc);

comment on table sponsor_consents is
  'Append-only consent + lawful-basis audit per sponsor. child_media_confidentiality is the safeguarding agreement not to redistribute children''s media. Marketing is opt-in (default off).';

-- ═════════════════════════════════════════════════════════════════════════
-- 8. sponsor_data_requests — subject-access export + erasure queue
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists sponsor_data_requests (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export','erasure')),
  status text not null default 'pending'
    check (status in ('pending','fulfilled','rejected')),
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  handled_by_email text,
  notes text
);

create index if not exists idx_sponsor_data_requests_status
  on sponsor_data_requests (status, requested_at);

comment on table sponsor_data_requests is
  'Sponsor-raised UK GDPR requests. ''export'' is also self-serve (see /api/sponsor/export); ''erasure'' is fulfilled by an admin via auth.admin.deleteUser, which cascades all sponsor rows here. Orphan records are charity-owned and NOT erased.';

-- ═════════════════════════════════════════════════════════════════════════
-- 9. child_media_access_log — safeguarding access trail
-- ═════════════════════════════════════════════════════════════════════════
-- Distinct from admin_audit_log (which logs STAFF). This records every
-- SPONSOR view of a child's profile and every signed-URL issuance, so a
-- safeguarding lead can review who accessed which child's media and when.
-- Written ONLY by the service-role server code; no sponsor-facing policy, so
-- a sponsor cannot read or tamper with their own access trail.
create table if not exists child_media_access_log (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references auth.users(id) on delete cascade,
  orphan_id uuid not null references orphans(id) on delete cascade,
  media_id uuid references orphan_update_media(id) on delete set null,
  action text not null check (action in ('view_profile','signed_url_issued')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_child_media_access_orphan
  on child_media_access_log (orphan_id, created_at desc);
create index if not exists idx_child_media_access_sponsor
  on child_media_access_log (sponsor_id, created_at desc);

comment on table child_media_access_log is
  'Safeguarding trail of SPONSOR access to children''s profiles + media. Service-role write-only (deny-by-default RLS, no policies) so it cannot be forged or read by sponsors.';

-- ═════════════════════════════════════════════════════════════════════════
-- 10. Row Level Security — the security boundary
-- ═════════════════════════════════════════════════════════════════════════
-- Principles:
--   * Sponsors are STRICTLY READ-ONLY on app tables (one exception:
--     they may INSERT their own data-request rows).
--   * All writes go through the service-role client, which bypasses RLS.
--   * Reads are scoped to auth.uid() and an active (status<>'ended')
--     sponsorship link.
--   * Helper get_active_orphan_ids() centralises the "which orphans may this
--     sponsor see" rule so every policy stays consistent. SECURITY INVOKER
--     (default) so it runs as the calling sponsor and still honours RLS on
--     sponsorships — but sponsorships' own policy already scopes to auth.uid().

create or replace function sponsor_can_access_orphan(target_orphan uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from sponsorships s
    where s.orphan_id = target_orphan
      and s.sponsor_id = auth.uid()
      and s.status <> 'ended'
  );
$$;

-- ── sponsor_profiles: a sponsor reads only their own row. ──
alter table sponsor_profiles enable row level security;
drop policy if exists sponsor_reads_own_profile on sponsor_profiles;
create policy sponsor_reads_own_profile on sponsor_profiles
  for select to authenticated
  using (id = auth.uid());

-- ── sponsorships: a sponsor reads only their own links. ──
alter table sponsorships enable row level security;
drop policy if exists sponsor_reads_own_sponsorships on sponsorships;
create policy sponsor_reads_own_sponsorships on sponsorships
  for select to authenticated
  using (sponsor_id = auth.uid());

-- ── orphans: only those the sponsor is actively linked to. ──
alter table orphans enable row level security;
drop policy if exists sponsor_reads_linked_orphans on orphans;
create policy sponsor_reads_linked_orphans on orphans
  for select to authenticated
  using (sponsor_can_access_orphan(id));

-- ── orphan_updates: only PUBLISHED updates of a linked orphan. ──
alter table orphan_updates enable row level security;
drop policy if exists sponsor_reads_linked_published_updates on orphan_updates;
create policy sponsor_reads_linked_published_updates on orphan_updates
  for select to authenticated
  using (published = true and sponsor_can_access_orphan(orphan_id));

-- ── orphan_update_media: media of a linked orphan (existence only). ──
alter table orphan_update_media enable row level security;
drop policy if exists sponsor_reads_linked_media on orphan_update_media;
create policy sponsor_reads_linked_media on orphan_update_media
  for select to authenticated
  using (sponsor_can_access_orphan(orphan_id));

-- ── sponsor_consents: sponsor reads own. (Writes are service-role.) ──
alter table sponsor_consents enable row level security;
drop policy if exists sponsor_reads_own_consents on sponsor_consents;
create policy sponsor_reads_own_consents on sponsor_consents
  for select to authenticated
  using (sponsor_id = auth.uid());

-- ── sponsor_data_requests: sponsor reads + inserts own. ──
alter table sponsor_data_requests enable row level security;
drop policy if exists sponsor_reads_own_requests on sponsor_data_requests;
create policy sponsor_reads_own_requests on sponsor_data_requests
  for select to authenticated
  using (sponsor_id = auth.uid());
drop policy if exists sponsor_inserts_own_requests on sponsor_data_requests;
create policy sponsor_inserts_own_requests on sponsor_data_requests
  for insert to authenticated
  with check (sponsor_id = auth.uid());

-- ── child_media_access_log: deny-by-default. Service-role only. ──
alter table child_media_access_log enable row level security;
-- (No policies — sponsors can neither read nor write their access trail.)

-- NOTE: no INSERT/UPDATE/DELETE policies exist for `authenticated` on
-- orphans, sponsorships, orphan_updates, or orphan_update_media. Sponsors are
-- read-only there; all mutations run through the service-role admin client.

-- ═════════════════════════════════════════════════════════════════════════
-- 11. PRIVATE storage bucket for child media
-- ═════════════════════════════════════════════════════════════════════════
-- Unlike dr-media (public marketing assets), this bucket is PRIVATE. There is
-- deliberately NO SELECT policy on storage.objects for it — not even for
-- authenticated users. Downloads happen ONLY through short-lived signed URLs
-- minted by the service-role client AFTER an RLS-backed authorisation check
-- (see src/lib/orphan-media.ts + /api/sponsor/media/[mediaId]).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orphan-media',
  'orphan-media',
  false,        -- PRIVATE. Do not change.
  5368709120,   -- 5 GB ceiling (Pro plan; free tier still caps at 50 MB)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Defence in depth: explicitly drop any SELECT policy that might have been
-- created for this bucket. Access is signed-URL only.
drop policy if exists orphan_media_no_public_read on storage.objects;
-- (Intentionally no CREATE — the absence of a policy denies anon/authenticated.)
