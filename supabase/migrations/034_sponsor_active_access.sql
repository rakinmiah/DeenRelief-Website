-- Migration 034: require an ACTIVE sponsor account to access a child.
--
-- Security fix. The access model keyed only on (auth.uid() + a non-ended
-- sponsorship link) and never checked sponsor_profiles.status. That meant
-- suspending a sponsor (e.g. after a safeguarding concern) did NOT revoke
-- their access to the child's profile, updates, or media — "suspend" was a
-- no-op against the most sensitive surface in the app.
--
-- Fix the helper that every child-facing RLS policy depends on so it also
-- requires the sponsor's profile to be 'active'. This blocks 'suspended',
-- 'closed', and (desirably) 'invited' accounts at the database boundary, so
-- no route can bypass it. SECURITY INVOKER (default) — runs as the sponsor and
-- still honours RLS on sponsorships + sponsor_profiles (both scoped to their
-- own rows), so reading own status here is permitted.
--
-- Idempotent: safe to run more than once.

create or replace function sponsor_can_access_orphan(target_orphan uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from sponsorships s
    join sponsor_profiles p on p.id = s.sponsor_id
    where s.orphan_id = target_orphan
      and s.sponsor_id = auth.uid()
      and s.status <> 'ended'
      and p.status = 'active'
  );
$$;
