-- 0001_profiles.sql
-- Roles, the profiles table, a recursion-safe role helper, RLS, and an
-- auto-provision trigger so every auth user gets a profile row.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'volunteer',
  'tfa_admin',
  'embassy_abu_dhabi',
  'embassy_dubai'
);

create type public.profile_status as enum ('pending', 'active', 'suspended');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role     not null default 'volunteer',
  phone       text,
  status      public.profile_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER bypasses RLS, so policies that call these do NOT
-- recurse back into the profiles policies).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'tfa_admin', false)
$$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision a profile when a new auth user is created.
-- New users default to volunteer + pending; an admin activates them.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'volunteer',
    'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- A user can read their own profile; admins can read all.
create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

-- A user can update their own non-privileged fields; admins can update anyone.
-- (Role/status changes are funnelled through admin server actions using the
--  service-role client, so they are not granted to self here.)
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());
