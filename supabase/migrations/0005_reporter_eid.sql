-- 0005_reporter_eid.sql
-- Reporter may provide a Passport OR an Emirates ID; add the EID column.

alter table public.cases add column reporter_eid text;
