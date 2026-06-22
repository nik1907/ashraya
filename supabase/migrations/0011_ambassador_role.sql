-- 0011_ambassador_role.sql
-- Add ambassador role: full read access across both emirates, no write access.

-- Add to the role enum
alter type public.user_role add value 'ambassador';

-- Expand cases SELECT policy to include ambassador (sees all cases, both emirates)
drop policy cases_select on public.cases;

create policy cases_select on public.cases
  for select using (
    created_by = auth.uid()
    or public.is_admin()
    or public.current_user_role() = 'embassy_abu_dhabi'
    or (public.current_user_role() = 'embassy_dubai' and assigned_emirate = 'Dubai')
    or public.current_user_role() = 'ambassador'
  );

-- Expand can_access_case() so attachments + case_events follow the same rule
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
    )
  )
$$;
