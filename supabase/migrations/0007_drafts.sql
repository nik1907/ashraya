-- Case drafts: volunteers can save form progress and resume later.
create table public.case_drafts (
  id         uuid        primary key default gen_random_uuid(),
  created_by uuid        not null references public.profiles(id) on delete cascade,
  org_id     uuid        references public.organizations(id),
  label      text,
  form_data  jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_drafts enable row level security;

create policy "Volunteers manage own drafts"
  on public.case_drafts
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());
