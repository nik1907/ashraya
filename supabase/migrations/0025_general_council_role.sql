-- 0025_general_council_role.sql
-- Add general_council role (Consul General / head of a consulate).
-- Same full-case-read access as ambassador and ifs_officer.
-- Honorific: Shri (male) / Smt. (female) — not H.E.
-- Routing: /ambassador dashboard (executive view).

alter type public.user_role add value 'general_council';

-- ── RLS: cases_select ────────────────────────────────────────────────────────
-- Drop and recreate to add general_council (enum ADD VALUE is transactional,
-- so the new value is visible within this same migration after commit).

drop policy cases_select on public.cases;

create policy cases_select on public.cases
  for select using (
    created_by = auth.uid()
    or public.is_admin()
    or (public.current_user_role() = 'embassy_abu_dhabi' and assigned_emirate = 'Abu Dhabi')
    or (public.current_user_role() = 'embassy_dubai'    and assigned_emirate = 'Dubai')
    or public.current_user_role() = 'ambassador'
    or public.current_user_role() = 'ifs_officer'
    or public.current_user_role() = 'general_council'
  );

-- ── can_access_case() ────────────────────────────────────────────────────────

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
      or public.current_user_role() = 'general_council'
    )
  )
$$;
