-- 0015_fix_embassy_rls.sql
-- Bug: embassy_abu_dhabi users could see ALL cases (no emirate restriction).
-- embassy_dubai was correctly restricted; Abu Dhabi was not.
-- Also fixes can_access_case() which had the same bug (affects attachments + events).

drop policy cases_select on public.cases;

create policy cases_select on public.cases
  for select using (
    created_by = auth.uid()
    or public.is_admin()
    or (public.current_user_role() = 'embassy_abu_dhabi' and assigned_emirate = 'Abu Dhabi')
    or (public.current_user_role() = 'embassy_dubai'    and assigned_emirate = 'Dubai')
    or public.current_user_role() = 'ambassador'
    or public.current_user_role() = 'ifs_officer'
  );

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
      or (public.current_user_role() = 'embassy_abu_dhabi' and c.assigned_emirate = 'Abu Dhabi')
      or (public.current_user_role() = 'embassy_dubai'    and c.assigned_emirate = 'Dubai')
      or public.current_user_role() = 'ambassador'
      or public.current_user_role() = 'ifs_officer'
    )
  )
$$;
