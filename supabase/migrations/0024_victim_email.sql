-- Add optional email address for the affected individual so case status
-- notifications can be sent directly to them (not only to the reporter).
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS email text;
