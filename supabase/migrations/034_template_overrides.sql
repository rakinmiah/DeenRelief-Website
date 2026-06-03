-- 034_template_overrides.sql
-- Saved "official template" edits.
--
-- The 95 slide templates are defined in code (presetForTemplate). When the
-- SMM fixes a template in the editor and saves it, the edited EditorSlide is
-- stored here keyed by the template id (e.g. "stat-a", "hero-c"). Content-
-- bearing layers carry a `bind` so the event's real copy/photo re-inject when
-- the template is used; the design edits stick. One row per template id;
-- deleting the row reverts that template to its code default.
--
-- Accessed only via the service-role API (requireAdminSession), so RLS is on
-- with no policies (deny by default for anon/auth clients).

create table if not exists template_overrides (
  template_id text primary key,
  slide jsonb not null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table template_overrides enable row level security;
