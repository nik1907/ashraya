-- 0012_admin_features.sql
-- Adds schema for: case assignment, internal notes, case tags,
-- suspension reason, email log, and app settings.

-- ---------------------------------------------------------------------------
-- 1. cases: case assignment + tags
-- ---------------------------------------------------------------------------
alter table public.cases
  add column if not exists assigned_to  uuid references public.profiles (id) on delete set null,
  add column if not exists tags         text[] not null default '{}';

create index if not exists cases_assigned_to_idx on public.cases (assigned_to);

-- ---------------------------------------------------------------------------
-- 2. profiles: suspension reason
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists suspension_reason text;

-- ---------------------------------------------------------------------------
-- 3. case_notes — staff-only notes, never visible to volunteers
-- ---------------------------------------------------------------------------
create table if not exists public.case_notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists case_notes_case_id_idx on public.case_notes (case_id);

create trigger case_notes_touch_updated_at
  before update on public.case_notes
  for each row execute function public.touch_updated_at();

alter table public.case_notes enable row level security;

-- Admins, embassy, and ambassadors can read all notes; volunteers cannot.
create policy case_notes_select on public.case_notes
  for select
  using (public.current_user_role() in ('tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai', 'ambassador'));

-- Only admins and embassy staff can insert / update / delete.
create policy case_notes_insert on public.case_notes
  for insert
  with check (public.current_user_role() in ('tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai'));

create policy case_notes_update on public.case_notes
  for update
  using  (public.current_user_role() in ('tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai') and author_id = auth.uid())
  with check (public.current_user_role() in ('tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai'));

create policy case_notes_delete on public.case_notes
  for delete
  using (public.is_admin() or author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. email_log — record of every manually composed or auto-sent email
-- ---------------------------------------------------------------------------
create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid references public.cases (id) on delete set null,
  sent_by      uuid references public.profiles (id) on delete set null,
  to_email     text not null,
  subject      text not null,
  body_snippet text,          -- first 500 chars of body for preview
  sent_at      timestamptz not null default now(),
  ok           boolean not null default true,
  error_msg    text
);

create index if not exists email_log_case_id_idx on public.email_log (case_id);
create index if not exists email_log_sent_at_idx  on public.email_log (sent_at desc);

alter table public.email_log enable row level security;

create policy email_log_select on public.email_log
  for select using (public.is_admin());

create policy email_log_insert on public.email_log
  for insert with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. app_settings — key/value config editable by admin without a deploy
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  label       text not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Everyone authenticated can read settings (needed for email routing, SLA, etc.)
create policy app_settings_select on public.app_settings
  for select using (auth.uid() is not null);

-- Only admins can write.
create policy app_settings_upsert on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Seed default settings
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, label, description) values
  ('sla_crisis_hours',    '48',                             'Crisis SLA (hours)',        'Maximum hours to resolve police, detention, trafficking, medical, missing cases'),
  ('sla_standard_hours',  '168',                            'Standard SLA (hours)',      'Maximum hours to resolve all other case types (7 days)'),
  ('email_abu_dhabi',     'welfare.abudhabi@example.com',   'Abu Dhabi embassy email',  'Email address for Abu Dhabi consular section'),
  ('email_dubai',         'welfare.dubai@example.com',      'Dubai embassy email',      'Email address for Dubai consular section'),
  ('org_name',            'TFA Community Welfare',          'Organisation name',        'Shown in email headers and reports'),
  ('org_address',         'Abu Dhabi, UAE',                 'Organisation address',     'Shown in formal email footer'),
  ('stale_threshold_days','7',                              'Stale case threshold (days)','Cases with no activity beyond this many days appear in the stale queue')
on conflict (key) do nothing;
