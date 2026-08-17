-- Add embassy-side officer assignment to cases.
-- Distinct from the TFA-internal assigned_to field — records which
-- embassy/consulate officer is personally handling the case.
alter table public.cases
  add column assigned_officer uuid references public.profiles(id);
