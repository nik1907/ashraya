-- 0019_dashboard_view.sql
-- Add dashboard_view to profiles so admin can control which dashboard
-- each diplomatic user sees: embassy full queue, embassy assigned-only,
-- or ambassador overview.

alter table public.profiles
  add column if not exists dashboard_view text not null default 'embassy_all'
  check (dashboard_view in ('embassy_all', 'embassy_assigned', 'ambassador'));
