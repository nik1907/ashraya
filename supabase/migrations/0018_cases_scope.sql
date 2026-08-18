-- 0018_cases_scope.sql
-- Add cases_scope to profiles so admin can control whether an officer
-- sees all cases (their mission queue) or only their assigned cases.
-- Default 'all' preserves existing behaviour for every role.

alter table public.profiles
  add column if not exists cases_scope text not null default 'all'
  check (cases_scope in ('all', 'assigned'));
