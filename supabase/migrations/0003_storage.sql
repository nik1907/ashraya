-- 0003_storage.sql
-- Private bucket for case document uploads, with access rules that mirror case
-- access. Files are stored under `{case_id}/...`, so the first path segment is
-- the case id and we can reuse can_access_case().

insert into storage.buckets (id, name, public)
values ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

drop policy if exists "case attachments read" on storage.objects;
create policy "case attachments read" on storage.objects
  for select using (
    bucket_id = 'case-attachments'
    and public.can_access_case(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "case attachments insert" on storage.objects;
create policy "case attachments insert" on storage.objects
  for insert with check (
    bucket_id = 'case-attachments'
    and public.can_access_case(((storage.foldername(name))[1])::uuid)
  );
