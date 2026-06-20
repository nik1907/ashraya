-- 0006_status_resolution.sql
-- A "need more info" status, plus who-handled-it + an optional note captured
-- when a case is resolved or closed.

alter type public.case_status add value if not exists 'need_more_info';

alter table public.cases add column resolved_by text;
alter table public.cases add column resolution_note text;
