-- Adds volunteer case review queue: two new statuses, AI prescreening result,
-- and the admin return note shown to volunteers.

alter type public.case_status add value if not exists 'pending_review';
alter type public.case_status add value if not exists 'needs_attention';

alter table public.cases add column if not exists prescreening_result jsonb;
alter table public.cases add column if not exists admin_return_note text;
