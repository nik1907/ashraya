-- 0004_organizations.sql
-- Multi-NGO foundation. Each organization has a name and an abbreviation that
-- drives its case IDs ({ABBR}-ddmmyy-XX-NNN). TFA first; others added later.
-- Strict cross-NGO RLS isolation is deferred until a second NGO is onboarded.

create table public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  abbreviation text not null unique,
  created_at   timestamptz not null default now()
);

insert into public.organizations (name, abbreviation)
values ('Telangana Friends Association', 'TFA');

-- Everyone (including logged-out visitors on the sign-up page) may read the
-- NGO list to populate the sign-up dropdown.
alter table public.organizations enable row level security;
create policy organizations_select on public.organizations
  for select using (true);

-- Link profiles and cases to an organization.
alter table public.profiles add column org_id uuid references public.organizations (id);
alter table public.cases    add column org_id uuid references public.organizations (id);

-- Backfill existing rows to TFA.
update public.profiles
  set org_id = (select id from public.organizations where abbreviation = 'TFA')
  where org_id is null;
update public.cases
  set org_id = (select id from public.organizations where abbreviation = 'TFA')
  where org_id is null;

create index cases_org_id_idx on public.cases (org_id);

-- New sign-ups carry their chosen org through user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, status, org_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'volunteer',
    'pending',
    (new.raw_user_meta_data ->> 'org_id')::uuid
  );
  return new;
end;
$$;
