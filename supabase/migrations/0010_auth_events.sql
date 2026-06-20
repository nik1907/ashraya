-- Allow login/logout events in case_events (no case associated)
alter table public.case_events alter column case_id drop not null;

-- Admins can see auth events (where case_id is null); everyone else keeps existing access
drop policy if exists case_events_select on public.case_events;
create policy case_events_select on public.case_events
  for select using (
    (case_id is null and public.is_admin())
    or (case_id is not null and public.can_access_case(case_id))
  );
