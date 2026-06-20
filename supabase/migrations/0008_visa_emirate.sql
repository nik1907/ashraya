-- Track which emirate the affected person's visa / residence belongs to.
-- This drives email routing: Abu Dhabi visa → TO Abu Dhabi, CC Dubai (and vice versa).
alter table public.cases add column if not exists visa_emirate text;
