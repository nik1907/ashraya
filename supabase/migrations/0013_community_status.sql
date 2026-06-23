-- 0013_community_status.sql
-- Adds a status column to organizations so new communities submitted via
-- the "Others" signup flow can wait for admin approval before appearing
-- in the dropdown.

alter table public.organizations
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending'));

-- Only active orgs are visible in the public signup dropdown.
-- Admins can see all (for the approval queue).
drop policy if exists organizations_select on public.organizations;

create policy organizations_select on public.organizations
  for select using (status = 'active' or public.is_admin());

-- Admins can insert new orgs (when approving) and update status.
create policy organizations_insert on public.organizations
  for insert with check (public.is_admin());

create policy organizations_update on public.organizations
  for update using (public.is_admin()) with check (public.is_admin());
