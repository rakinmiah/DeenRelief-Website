-- Migration 019: admin_users table for role-based access in DR Admin.
--
-- Phase 0 of the Social Operations Platform build. Splits the existing
-- single-role admin model into two roles:
--
--   'admin'  — Full access to everything currently in DR Admin: donations,
--              donors, recurring, bazaar, reports, audit log, media, plus
--              all forthcoming social tools.
--
--   'social' — Restricted to social/marketing tools (Campaign Command
--              Center, /now spotlight, short links, First Response when
--              built, per-post performance). NO access to donor PII,
--              bazaar orders, financial reports, or audit log.
--
-- Bootstrap model:
--   The existing ADMIN_ALLOWED_EMAILS env var continues to act as the
--   allowlist for FIRST sign-in of new admin emails. On first successful
--   sign-in, the /api/admin/login route auto-creates an admin_users row
--   with role='admin' for that email. Existing admins are picked up the
--   next time they sign in — no manual backfill needed.
--
-- Social-role users (the SMM and future marketing staff) must be added
-- straight to this table — their email does NOT need to be in
-- ADMIN_ALLOWED_EMAILS, because the login route also accepts any email
-- already present in admin_users (with the shared passphrase).
--
-- Idempotent: safe to run more than once.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'social')),
  display_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  -- Audit: which existing admin added this user (null when self-created
  -- via the env-allowlist bootstrap path).
  created_by_email text
);

-- Case-insensitive uniqueness on email — admin@deenrelief.org and
-- Admin@DeenRelief.org should be treated as the same user.
create unique index if not exists idx_admin_users_email_lower
  on admin_users (lower(email));

comment on table admin_users is
  'Role-based access control for /admin/*. Two roles: admin (full DR Admin) and social (social/marketing tools only — no donor PII or financials). Auto-populated from ADMIN_ALLOWED_EMAILS env var on first sign-in for admin role; social users inserted manually.';

comment on column admin_users.role is
  'Either ''admin'' (full access) or ''social'' (Campaign Command Center, /now spotlight, short links, First Response, per-post performance — no donor PII, no bazaar, no financials).';
