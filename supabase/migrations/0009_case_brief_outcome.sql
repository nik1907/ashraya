-- AI-generated ambassador briefing (3 bullet points, one per line)
alter table public.cases add column if not exists case_brief text;

-- Structured outcome when a case is resolved or closed
alter table public.cases add column if not exists outcome text;
