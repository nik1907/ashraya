-- 0021_volunteer_validity.sql
-- Add 1-year validity period to volunteer profiles (MoM requirement).
-- After expiry, volunteer is flagged for verification/renewal.

alter table public.profiles
  add column if not exists valid_until timestamptz;

-- Backfill existing volunteers: validity starts from their created_at
update public.profiles
  set valid_until = created_at + interval '1 year'
  where role = 'volunteer' and valid_until is null;

-- Non-volunteer roles (embassy, admin, ambassador, ifs_officer) have no expiry
-- valid_until remains null for them — interpreted as "no expiry"
