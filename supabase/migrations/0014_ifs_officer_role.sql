-- 0014_ifs_officer_role.sql
-- Add ifs_officer role for IFS officers (DCM, Counsellor, First/Second Secretary, Attaché).
-- They get identical read + write access as ambassador; their title is stored in designation.

-- 1. New role value
alter type public.user_role add value 'ifs_officer';

-- 2. Designation column (e.g. 'First Secretary', 'Deputy Chief of Mission')
alter table public.profiles
  add column if not exists designation text;

-- 3. Expand cases SELECT policy
drop policy cases_select on public.cases;

create policy cases_select on public.cases
  for select using (
    created_by = auth.uid()
    or public.is_admin()
    or public.current_user_role() = 'embassy_abu_dhabi'
    or (public.current_user_role() = 'embassy_dubai' and assigned_emirate = 'Dubai')
    or public.current_user_role() = 'ambassador'
    or public.current_user_role() = 'ifs_officer'
  );

-- 4. Update can_access_case() so attachments + events follow the same rule
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
      or public.current_user_role() = 'ambassador'
      or public.current_user_role() = 'ifs_officer'
    )
  )
$$;
