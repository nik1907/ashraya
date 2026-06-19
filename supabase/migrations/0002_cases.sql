-- 0002_cases.sql
-- Core case data model: cases (with case-type answers as JSONB), attachments,
-- and an append-only audit log. Plus emirate/access helpers and RLS so each
-- role only sees what it should.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.case_status as enum (
  'submitted',
  'sent',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed'
);

-- ---------------------------------------------------------------------------
-- cases
-- `details` holds the case-type-specific answers (keyed by the field keys in
-- lib/caseConfig.ts). Kept as a JSONB column rather than a 1:1 side table to
-- avoid a pointless join — same data, simpler reads.
-- ---------------------------------------------------------------------------
create table public.cases (
  id                 uuid primary key default gen_random_uuid(),
  case_id            text unique,                       -- TFA-ddmmyy-XX-NNN
  case_type          text not null,
  status             public.case_status not null default 'submitted',

  reporting_emirate  text not null default 'Abu Dhabi', -- as chosen on the form
  assigned_emirate   text not null default 'Abu Dhabi', -- 'Abu Dhabi' | 'Dubai' (routing target)

  date_of_incident   date,

  -- affected individual
  name      text,
  gender    text,
  age       integer,
  passport  text,
  eid       text,
  phone     text,

  -- employer / agent
  company_name        text,
  company_phone       text,
  company_email       text,
  company_location    text,
  visa_under_company  boolean,

  -- reporter (person filing the case)
  reporter_name      text,
  reporter_passport  text,
  reporter_phone     text,
  reporter_email     text,

  raw_description  text,
  polished_summary text,

  details   jsonb not null default '{}'::jsonb,

  email_sent_at timestamptz,
  created_by    uuid not null references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index cases_created_by_idx on public.cases (created_by);
create index cases_assigned_emirate_idx on public.cases (assigned_emirate);
create index cases_status_idx on public.cases (status);
create index cases_case_type_idx on public.cases (case_type);

create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- attachments (files live in Supabase Storage; we store the path + label)
-- ---------------------------------------------------------------------------
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases (id) on delete cascade,
  slot_key     text not null,
  label        text not null,
  storage_path text not null,
  uploaded_at  timestamptz not null default now()
);

create index attachments_case_id_idx on public.attachments (case_id);

-- ---------------------------------------------------------------------------
-- case_events: append-only audit trail (submissions, status changes, emails)
-- ---------------------------------------------------------------------------
create table public.case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  actor       uuid references public.profiles (id),
  event_type  text not null, -- 'submitted' | 'status_changed' | 'email_sent' | 'acknowledged' | 'edited'
  from_status public.case_status,
  to_status   public.case_status,
  note        text,
  created_at  timestamptz not null default now()
);

create index case_events_case_id_idx on public.case_events (case_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER → bypass RLS, no recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_emirate()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_user_role()
    when 'embassy_abu_dhabi' then 'Abu Dhabi'
    when 'embassy_dubai'     then 'Dubai'
    else null
  end
$$;

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  )
$$;

-- Central visibility rule for a single case, reused by every related table.
-- Abu Dhabi is the head mission and sees ALL cases; Dubai sees only Dubai's.
create or replace function public.can_access_case(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cases c
    where c.id = cid and (
      c.created_by = auth.uid()
      or public.is_admin()
      or public.current_user_role() = 'embassy_abu_dhabi'
      or (public.current_user_role() = 'embassy_dubai' and c.assigned_emirate = 'Dubai')
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.cases enable row level security;
alter table public.attachments enable row level security;
alter table public.case_events enable row level security;

-- cases: see your own (volunteer), all (admin), all (Abu Dhabi head mission),
-- or only Dubai's (Dubai consulate). Reference the row's columns directly (NOT
-- can_access_case, which re-queries this table and fails mid-INSERT...RETURNING).
create policy cases_select on public.cases
  for select using (
    created_by = auth.uid()
    or public.is_admin()
    or public.current_user_role() = 'embassy_abu_dhabi'
    or (public.current_user_role() = 'embassy_dubai' and assigned_emirate = 'Dubai')
  );

-- only an active user may create a case, and only as themselves
create policy cases_insert on public.cases
  for insert with check (created_by = auth.uid() and public.is_active());

-- admins update anything; Abu Dhabi updates any case; Dubai only Dubai's
create policy cases_update on public.cases
  for update
  using (
    public.is_admin()
    or public.current_user_role() = 'embassy_abu_dhabi'
    or (public.current_user_role() = 'embassy_dubai' and assigned_emirate = 'Dubai')
  )
  with check (
    public.is_admin()
    or public.current_user_role() = 'embassy_abu_dhabi'
    or (public.current_user_role() = 'embassy_dubai' and assigned_emirate = 'Dubai')
  );

-- attachments follow case visibility
create policy attachments_select on public.attachments
  for select using (public.can_access_case(case_id));

create policy attachments_insert on public.attachments
  for insert with check (public.can_access_case(case_id));

-- audit log: readable to anyone who can see the case; insertable by the actor
create policy case_events_select on public.case_events
  for select using (public.can_access_case(case_id));

create policy case_events_insert on public.case_events
  for insert with check (actor = auth.uid() and public.can_access_case(case_id));
