-- Migration 035: per-user passwords for admin_users.
--
-- Until now every admin signed in with their email + a single SHARED
-- per-role passphrase (ADMIN_LOGIN_PASSPHRASE etc., env vars). This adds
-- OPTIONAL per-user passwords so specific admins can have their own
-- credential they set + change themselves, without disturbing the shared
-- passphrase that existing accounts (e.g. info@, socialmedia@) still use.
--
-- Model (enforced in src/app/api/admin/login/route.ts):
--   - password_hash IS NULL  → account uses the shared role passphrase
--                              (unchanged behaviour).
--   - password_hash IS SET   → account MUST sign in with its own password;
--                              the shared passphrase no longer works for it
--                              (no backdoor once a personal password exists).
--   - must_change_password   → on next successful sign-in the user is sent
--                              to /admin/change-password and gated there
--                              until they set a new password. Used to issue
--                              a one-time temporary password.
--
-- Hash format: scrypt, encoded as
--   scrypt$<N>$<r>$<p>$<salt_b64>$<hash_b64>
-- (see src/lib/admin-password.ts). The hash is safe to store; the plaintext
-- never touches the DB.
--
-- Idempotent: safe to run more than once.

alter table admin_users
  add column if not exists password_hash text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_updated_at timestamptz;

comment on column admin_users.password_hash is
  'scrypt password hash (scrypt$N$r$p$salt$hash). NULL = account uses the shared role passphrase; set = account signs in with its own password only.';
comment on column admin_users.must_change_password is
  'When true, the user is forced through /admin/change-password on next sign-in before they can use the admin app. Used to issue one-time temporary passwords.';
comment on column admin_users.password_updated_at is
  'Timestamp the per-user password was last set/changed.';
