-- 0023_profile_identity.sql
-- MoM item 6: volunteer identity details belong on the PROFILE, captured once,
-- not re-typed into every case they file. The case form reads these and freezes
-- the corresponding reporter_* fields.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eid      text;

COMMENT ON COLUMN public.profiles.passport IS
  'Volunteer passport number — auto-populates reporter_passport on new cases.';
COMMENT ON COLUMN public.profiles.eid IS
  'Volunteer Emirates ID — auto-populates reporter_eid on new cases.';
