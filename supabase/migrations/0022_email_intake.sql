-- 0022_email_intake.sql
-- Email intake pipeline: staging table for emails arriving at the intake inbox,
-- plus a source column on cases so we know how each case was created.

-- How a case arrived: 'form' (web form, default), 'email', 'voice'
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'form';

-- Staging table — one row per email received at the intake inbox.
-- Cases are NOT created until an officer confirms, or AI confidence >= 0.85.
CREATE TABLE public.email_intakes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id     text UNIQUE NOT NULL,         -- RFC 2822 Message-ID header (dedup key)
  received_at    timestamptz NOT NULL,
  from_email     text NOT NULL,
  from_name      text,
  subject        text,
  body_text      text,                          -- plain-text body (no HTML)
  thread_id      text,                          -- Gmail thread ID (for reply threading)
  in_reply_to    text,                          -- In-Reply-To header
  references_hdr text,                          -- References header

  -- AI extraction results
  ai_confidence  numeric,                       -- 0.0–1.0
  ai_extracted   jsonb NOT NULL DEFAULT '{}',  -- { name, phone, emirate, issue_type, urgency, summary }
  ai_notes       text,

  -- workflow state
  status         text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | auto_created
  reviewed_by    uuid REFERENCES public.profiles(id),
  reviewed_at    timestamptz,
  case_id        uuid REFERENCES public.cases(id), -- populated when a case is created

  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_intakes_status_idx      ON public.email_intakes (status);
CREATE INDEX email_intakes_received_at_idx ON public.email_intakes (received_at DESC);
CREATE INDEX email_intakes_case_id_idx     ON public.email_intakes (case_id);

-- RLS: embassy officers and admins can see/manage; inserts go via service-role key only.
ALTER TABLE public.email_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_intakes_select ON public.email_intakes
  FOR SELECT USING (
    public.is_admin()
    OR public.current_user_role() IN ('embassy_abu_dhabi', 'embassy_dubai', 'ifs_officer', 'ambassador')
  );

CREATE POLICY email_intakes_update ON public.email_intakes
  FOR UPDATE USING (
    public.is_admin()
    OR public.current_user_role() IN ('embassy_abu_dhabi', 'embassy_dubai', 'ifs_officer')
  );
