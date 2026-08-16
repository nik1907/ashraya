# AI-Assisted Case Review Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a GPT-4o pre-screening + admin review gate between volunteer case submission and Embassy notification, while letting admin-submitted cases bypass the queue entirely.

**Architecture:** `submitCase` checks the submitter's role — admins go straight to `finalizeCase` (existing path), volunteers set status `pending_review` and trigger `runPrescreening` via `after()`. The admin Review Queue tab shows all `pending_review` cases with the AI notes inline. Admin approves (calls `finalizeCase`) or returns the case to the volunteer (emails them, sets `needs_attention`). The volunteer can edit and resubmit, which re-runs pre-screening.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), GPT-4o via OpenAI REST API (same pattern as `lib/ai/polish.ts`), nodemailer for email, TypeScript.

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/0016_pending_review.sql` | NEW — add status enum values + two columns |
| `lib/types.ts` | MODIFY — add new statuses to labels + options |
| `lib/ai/prescreening.ts` | NEW — GPT-4o pre-screening function |
| `lib/email/send.ts` | MODIFY — add `sendCaseReturnedEmail` |
| `app/cases/actions.ts` | MODIFY — route volunteers to pending_review; add `resubmitCase` |
| `app/admin/actions.ts` | MODIFY — add `approveCase`, `returnCase` |
| `components/admin/ReviewQueue.tsx` | NEW — queue UI component |
| `app/admin/page.tsx` | MODIFY — add Review Queue tab + data fetch |
| `app/cases/[id]/page.tsx` | MODIFY — show return note + Edit & Resubmit button |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0016_pending_review.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 0016_pending_review.sql
-- Adds volunteer case review queue: two new statuses, AI prescreening result,
-- and the admin return note shown to volunteers.

alter type public.case_status add value if not exists 'pending_review';
alter type public.case_status add value if not exists 'needs_attention';

alter table public.cases add column if not exists prescreening_result jsonb;
alter table public.cases add column if not exists admin_return_note text;
```

- [ ] **Step 2: Apply the migration**

In the Supabase dashboard → SQL editor, paste and run the migration. Or via CLI:
```bash
npx supabase db push
```

Expected: no errors. `cases` table now has two new status values and two new nullable columns.

- [ ] **Step 3: Verify in Supabase**

Run in SQL editor:
```sql
select enum_range(null::public.case_status);
```
Expected output includes `pending_review` and `needs_attention`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0016_pending_review.sql
git commit -m "feat(db): add pending_review/needs_attention statuses and prescreening columns"
```

---

## Task 2: Update types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the new statuses to `CASE_STATUS_LABELS`**

In `lib/types.ts`, find `CASE_STATUS_LABELS` and add two entries:

```ts
export const CASE_STATUS_LABELS: Record<string, string> = {
  submitted:       'Processing',
  pending_review:  'Awaiting Admin Review',   // ← add
  needs_attention: 'Needs Attention',          // ← add
  sent:            'Received',
  acknowledged:    'Acknowledged',
  need_more_info:  'Awaiting Reporter Response',
  in_progress:     'Under Embassy Action',
  resolved:        'Resolved/Closed',
  closed:          'Resolved/Closed',
}
```

- [ ] **Step 2: Add to `ADMIN_STATUS_OPTIONS`**

```ts
export const ADMIN_STATUS_OPTIONS = [
  'submitted',
  'pending_review',    // ← add
  'needs_attention',   // ← add
  'sent',
  'acknowledged',
  'need_more_info',
  'in_progress',
  'resolved',
] as const
```

- [ ] **Step 3: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add pending_review and needs_attention case statuses"
```

---

## Task 3: GPT-4o pre-screening function

**Files:**
- Create: `lib/ai/prescreening.ts`

- [ ] **Step 1: Create the file**

```ts
import 'server-only'

export type PrescreeningInput = {
  caseType: string
  narrative: string
  hasAttachments: boolean
  attachmentLabels: string[]
  affectedName: string | null
  affectedGender: string | null
  affectedAge: number | null
  companyName: string | null
  dateOfIncident: string | null
  reporterName: string | null
  reporterPhone: string | null
  emirate: string
}

export type PrescreeningResult = {
  completeness: { pass: boolean; issues: string[] }
  consistency:  { pass: boolean; issues: string[] }
  documents:    { pass: boolean; issues: string[] }
  redFlags:     { pass: boolean; issues: string[] }
  summary:      string
  confidence:   'high' | 'medium' | 'low'
}

const SYSTEM_PROMPT = `You are a welfare case quality reviewer for the Telangana Friends Association (TFA), UAE. A volunteer has just submitted a welfare case that will be forwarded to the Indian Embassy. Your job is to check four things and return a JSON object — nothing else.

Return this exact JSON shape:
{
  "completeness": { "pass": true/false, "issues": ["..."] },
  "consistency":  { "pass": true/false, "issues": ["..."] },
  "documents":    { "pass": true/false, "issues": ["..."] },
  "redFlags":     { "pass": true/false, "issues": ["..."] },
  "summary":      "1-2 sentence plain-English note for the admin",
  "confidence":   "high" | "medium" | "low"
}

Rules:
- completeness: Are key fields present for this case type? (e.g. employer name for labour cases, location for missing persons, date of incident where relevant)
- consistency: Does the narrative match the declared case type? Does the timeline make sense? Flag obvious mismatches only.
- documents: Were attachments provided? For death/medical/police cases, flag if none are present.
- redFlags: Future dates, contradictory details, implausible facts, generic filler text. This is NOT a fraud verdict — it is a note for a human admin to look closer.
- confidence: "high" if all checks pass or issues are minor; "medium" if 1–2 issues; "low" if multiple concerns.
- Keep issues concise — one short sentence each. If a check passes, issues array is empty.
- NEVER invent facts. Only assess what is provided.`

function buildUserMessage(input: PrescreeningInput): string {
  const lines = [
    `Case type: ${input.caseType}`,
    `Emirate: ${input.emirate}`,
    `Affected person: ${input.affectedName ?? 'Not provided'}, ${input.affectedGender ?? 'gender unknown'}, age ${input.affectedAge ?? 'unknown'}`,
    `Employer / company: ${input.companyName ?? 'Not provided'}`,
    `Date of incident: ${input.dateOfIncident ?? 'Not provided'}`,
    `Reporter: ${input.reporterName ?? 'Not provided'} · ${input.reporterPhone ?? 'no phone'}`,
    `Attachments: ${input.hasAttachments ? input.attachmentLabels.join(', ') : 'None'}`,
    '',
    'Case narrative:',
    input.narrative || '(no narrative provided)',
  ]
  return lines.join('\n')
}

/**
 * Run GPT-4o pre-screening on a newly submitted case.
 * Returns null if OPENAI_API_KEY is not set or the call fails — non-fatal.
 * Never receives passport numbers or Emirates IDs (not in PrescreeningInput).
 */
export async function prescreenCase(
  input: PrescreeningInput,
): Promise<PrescreeningResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserMessage(input) },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content) as PrescreeningResult
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/prescreening.ts
git commit -m "feat(ai): add GPT-4o case pre-screening function"
```

---

## Task 4: Add `sendCaseReturnedEmail` to email/send.ts

**Files:**
- Modify: `lib/email/send.ts`

- [ ] **Step 1: Add the function** — append before the final export of `sendEmail`:

Find the end of `sendReporterFollowUpNotification` (around line 162) and add after it:

```ts
export async function sendCaseReturnedEmail({
  to,
  reporterName,
  caseId,
  caseRowId,
  caseType,
  adminNote,
}: {
  to: string
  reporterName: string | null
  caseId: string | null
  caseRowId: string
  caseType: string
  adminNote: string
}): Promise<void> {
  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const caseLink = appUrl
    ? `<p style="margin-top:16px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">Open case ${caseId ?? caseRowId} in Ashraya →</a></p>`
    : ''

  await sendEmail({
    to,
    cc: [],
    subject: `Action needed: your welfare case ${caseId ?? caseRowId} needs attention`,
    html: `<p>${greeting},</p>
<p>Your welfare case <strong>${caseId ?? caseRowId}</strong> (${caseType}) has been reviewed by the TFA admin team and requires the following before it can be forwarded to the Embassy:</p>
<div style="background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;margin:12px 0;border-radius:4px;">
  <p style="margin:0;font-size:14px;color:#333;">${adminNote.replace(/\n/g, '<br>')}</p>
</div>
<p>Please log in to Ashraya, update the case with the information above, and resubmit. The case will then be reviewed again before being sent to the Embassy.</p>
${caseLink}
<p>For any queries, please contact the TFA admin team at <a href="mailto:tfa.abudhabi@gmail.com">tfa.abudhabi@gmail.com</a>.</p>
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email/send.ts
git commit -m "feat(email): add sendCaseReturnedEmail for admin review queue"
```

---

## Task 5: Create `runPrescreening` helper and update `submitCase`

**Files:**
- Create: `lib/cases/prescreening-runner.ts`
- Modify: `app/cases/actions.ts`

- [ ] **Step 1: Create `lib/cases/prescreening-runner.ts`**

```ts
import 'server-only'

import { prescreenCase } from '@/lib/ai/prescreening'
import { createAdminClient } from '@/lib/supabase/admin'
import { ATTACHMENT_BUCKET } from '@/lib/storage'

/**
 * Fetch case data, run GPT-4o pre-screening, and store the result in
 * cases.prescreening_result and as a case_events row.
 * Called via after() — non-blocking, non-fatal.
 */
export async function runPrescreening(caseRowId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_type, polished_summary, raw_description, name, gender, age, company_name, date_of_incident, reporter_name, reporter_phone, reporting_emirate, visa_emirate')
    .eq('id', caseRowId)
    .single()
  if (!c) return

  const { data: attachmentRows } = await admin
    .from('attachments')
    .select('label')
    .eq('case_id', caseRowId)
  const attachmentLabels = (attachmentRows ?? []).map((a) => a.label)

  const result = await prescreenCase({
    caseType:        c.case_type,
    narrative:       c.polished_summary ?? c.raw_description ?? '',
    hasAttachments:  attachmentLabels.length > 0,
    attachmentLabels,
    affectedName:    c.name ?? null,
    affectedGender:  c.gender ?? null,
    affectedAge:     c.age ?? null,
    companyName:     c.company_name ?? null,
    dateOfIncident:  c.date_of_incident ?? null,
    reporterName:    c.reporter_name ?? null,
    reporterPhone:   c.reporter_phone ?? null,
    emirate:         c.reporting_emirate ?? 'Abu Dhabi',
  })

  if (!result) return

  await admin
    .from('cases')
    .update({ prescreening_result: result })
    .eq('id', caseRowId)

  await admin.from('case_events').insert({
    case_id:    caseRowId,
    actor:      null,
    event_type: 'ai_prescreening',
    to_status:  'pending_review',
    note:       JSON.stringify(result),
  })
}
```

- [ ] **Step 2: Update `submitCase` in `app/cases/actions.ts`**

Find the insert block (around line 175) and change `status: 'submitted'` to be conditional:

```ts
  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_type: caseType.value,
      status: profile.role === 'tfa_admin' ? 'submitted' : 'pending_review',  // ← change
      // ... rest unchanged
    })
```

Then find the `after()` block at the end of `submitCase` (around line 249) and replace it:

```ts
  // Admin submissions bypass the review queue — finalize immediately.
  // Volunteer submissions hold for admin review with AI pre-screening.
  if (profile.role === 'tfa_admin') {
    after(async () => {
      await finalizeCase(data.id)
    })
  } else {
    after(async () => {
      await runPrescreening(data.id)
    })
  }
```

Add the import at the top of `app/cases/actions.ts`:

```ts
import { runPrescreening } from '@/lib/cases/prescreening-runner'
```

- [ ] **Step 3: Add `resubmitCase` server action** — append to `app/cases/actions.ts`:

```ts
/**
 * Volunteer resubmits a case that was returned by admin (needs_attention).
 * Resets to pending_review and triggers a fresh pre-screening run.
 */
export async function resubmitCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['volunteer'])
  const caseRowId = String(formData.get('case_id') ?? '').trim()
  if (!caseRowId) return

  const supabase = await createClient()
  const { data: c } = await supabase
    .from('cases')
    .select('status, created_by, case_id, case_type')
    .eq('id', caseRowId)
    .single()

  if (!c || c.status !== 'needs_attention') return
  if (c.created_by !== profile.id) return

  await supabase
    .from('cases')
    .update({ status: 'pending_review', admin_return_note: null, prescreening_result: null })
    .eq('id', caseRowId)

  await supabase.from('case_events').insert({
    case_id:    caseRowId,
    actor:      profile.id,
    event_type: 'volunteer_resubmitted',
    to_status:  'pending_review',
  })

  after(async () => {
    await runPrescreening(caseRowId)
  })

  redirect(`/cases/${caseRowId}`)
}
```

- [ ] **Step 4: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/cases/prescreening-runner.ts app/cases/actions.ts
git commit -m "feat(cases): route volunteer submissions to review queue with GPT-4o pre-screening"
```

---

## Task 6: Admin approve and return actions

**Files:**
- Modify: `app/admin/actions.ts`

- [ ] **Step 1: Add imports** at the top of `app/admin/actions.ts`:

```ts
import { finalizeCase } from '@/lib/cases/finalize'
import { sendCaseReturnedEmail } from '@/lib/email/send'
```

- [ ] **Step 2: Add `approveCase` server action** — append to `app/admin/actions.ts`:

```ts
/**
 * Admin approves a case in the review queue — assigns case ID, runs AI summary,
 * and sends the Embassy email. Identical to the path admin submissions take.
 */
export async function approveCase(formData: FormData): Promise<void> {
  await requireProfile(['tfa_admin'])
  const caseRowId = String(formData.get('case_id') ?? '').trim()
  if (!caseRowId) return

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('status')
    .eq('id', caseRowId)
    .single()
  if (!c || c.status !== 'pending_review') return

  // Log the decision before finalizing so the audit trail is always complete.
  const profile = await requireProfile(['tfa_admin'])
  await admin.from('case_events').insert({
    case_id:    caseRowId,
    actor:      profile.id,
    event_type: 'admin_approved',
    from_status:'pending_review',
    to_status:  'sent',
  })

  await finalizeCase(caseRowId)
  revalidatePath('/admin')
}
```

- [ ] **Step 3: Add `returnCase` server action** — append after `approveCase`:

```ts
/**
 * Admin returns a case to the volunteer with a specific note about what to fix.
 */
export async function returnCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const caseRowId = String(formData.get('case_id') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  if (!caseRowId || !note) return

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('status, case_id, case_type, reporter_email, reporter_name')
    .eq('id', caseRowId)
    .single()
  if (!c || c.status !== 'pending_review') return

  await admin
    .from('cases')
    .update({ status: 'needs_attention', admin_return_note: note })
    .eq('id', caseRowId)

  await admin.from('case_events').insert({
    case_id:    caseRowId,
    actor:      profile.id,
    event_type: 'admin_returned',
    from_status:'pending_review',
    to_status:  'needs_attention',
    note,
  })

  if (c.reporter_email) {
    after(async () => {
      try {
        await sendCaseReturnedEmail({
          to:           c.reporter_email!,
          reporterName: c.reporter_name ?? null,
          caseId:       c.case_id ?? null,
          caseRowId,
          caseType:     c.case_type,
          adminNote:    note,
        })
      } catch { /* non-fatal */ }
    })
  }

  revalidatePath('/admin')
}
```

- [ ] **Step 4: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/admin/actions.ts
git commit -m "feat(admin): add approveCase and returnCase server actions"
```

---

## Task 7: Review Queue UI component + admin tab

**Files:**
- Create: `components/admin/ReviewQueue.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Create `components/admin/ReviewQueue.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { approveCase, returnCase } from '@/app/admin/actions'

type PrescreeningResult = {
  completeness: { pass: boolean; issues: string[] }
  consistency:  { pass: boolean; issues: string[] }
  documents:    { pass: boolean; issues: string[] }
  redFlags:     { pass: boolean; issues: string[] }
  summary:      string
  confidence:   'high' | 'medium' | 'low'
}

export type QueueCase = {
  id: string
  case_id: string | null
  case_type: string
  name: string | null
  reporter_name: string | null
  created_at: string
  prescreening_result: PrescreeningResult | null
}

function AiNotes({ result }: { result: PrescreeningResult }) {
  const checks = [
    { key: 'completeness', label: 'Completeness', data: result.completeness },
    { key: 'consistency',  label: 'Consistency',  data: result.consistency  },
    { key: 'documents',    label: 'Documents',    data: result.documents    },
    { key: 'redFlags',     label: 'Red flags',    data: result.redFlags     },
  ] as const

  return (
    <div className="mt-3 rounded-md border border-brand-border bg-brand-surface p-3 text-xs font-mono leading-relaxed text-brand-fg">
      {checks.map(({ key, label, data }) => (
        <div key={key}>
          <span className={data.pass ? 'text-green-700' : 'text-amber-700'}>
            {data.pass ? '✓' : '⚠'} {label}
          </span>
          {data.issues.length > 0 && (
            <span className="text-brand-muted"> — {data.issues.join('; ')}</span>
          )}
        </div>
      ))}
      <p className="mt-2 text-brand-muted not-italic font-sans">{result.summary}</p>
    </div>
  )
}

function QueueRow({ c }: { c: QueueCase }) {
  const [showReturn, setShowReturn] = useState(false)
  const flagCount = c.prescreening_result
    ? [
        c.prescreening_result.completeness,
        c.prescreening_result.consistency,
        c.prescreening_result.documents,
        c.prescreening_result.redFlags,
      ].filter((x) => !x.pass).length
    : 0

  const ago = (() => {
    const mins = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  })()

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-brand-muted">{c.case_id ?? 'ID pending'}</p>
          <p className="mt-0.5 font-semibold text-brand-navy">
            {c.case_type}{c.name ? ` — ${c.name}` : ''}
          </p>
          <p className="text-xs text-brand-muted">
            Submitted by {c.reporter_name ?? 'volunteer'} · {ago}
          </p>
        </div>
        {c.prescreening_result ? (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
            flagCount === 0
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {flagCount === 0 ? 'All checks passed' : `${flagCount} item${flagCount > 1 ? 's' : ''} flagged`}
          </span>
        ) : (
          <span className="text-xs text-brand-muted italic">AI review pending…</span>
        )}
      </div>

      {c.prescreening_result && <AiNotes result={c.prescreening_result} />}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={approveCase}>
          <input type="hidden" name="case_id" value={c.id} />
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-navy-hover"
          >
            Approve &amp; Send to Embassy
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReturn((v) => !v)}
          className="rounded-lg border border-amber-600 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
        >
          Return to Volunteer
        </button>

        <a
          href={`/cases/${c.id}`}
          className="rounded-lg border border-brand-border px-4 py-2 text-xs text-brand-muted transition-colors hover:text-brand-navy"
        >
          View full case →
        </a>
      </div>

      {showReturn && (
        <form action={returnCase} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="case_id" value={c.id} />
          <textarea
            name="note"
            required
            rows={3}
            placeholder="Tell the volunteer exactly what needs to be added or corrected before this case can be forwarded…"
            className="rounded border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Send back to volunteer
            </button>
            <button
              type="button"
              onClick={() => setShowReturn(false)}
              className="text-xs text-brand-muted underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export function ReviewQueue({ cases }: { cases: QueueCase[] }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card p-8 text-center text-sm text-brand-muted">
        No cases awaiting review.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <QueueRow key={c.id} c={c} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add the Review Queue tab to `app/admin/page.tsx`**

Find the `TABS` constant and add the new tab:

```ts
const TABS = [
  { key: 'overview', label: 'Overview'      },
  { key: 'review',   label: 'Review Queue'  },  // ← add (second position)
  { key: 'cases',    label: 'Cases'         },
  { key: 'access',   label: 'Access control'},
] as const
```

Add the import at the top:

```ts
import { ReviewQueue, type QueueCase } from '@/components/admin/ReviewQueue'
```

In the parallel query block, add a queue fetch:

```ts
  const [
    { activity },
    { data: pending },
    { data: pendingOrgs },
    { data: team },
    listUsersRes,
    { data: queueCases },                                        // ← add
  ] = await Promise.all([
    getDashboardData(supabase),
    supabase.from('profiles').select('id, full_name, role').eq('status', 'pending'),
    supabase
      .from('organizations')
      .select('id, name, abbreviation, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, role, status, suspension_reason, phone, designation')
      .order('created_at', { ascending: true }),
    createAdminClient().auth.admin.listUsers({ perPage: 200 }),
    supabase                                                      // ← add
      .from('cases')
      .select('id, case_id, case_type, name, reporter_name, created_at, prescreening_result')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true }),
  ])
```

Add a badge to the Review Queue tab link:

```tsx
            {t.key === 'review' && (queueCases?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {queueCases!.length}
              </span>
            )}
```

Add the tab content panel after the Overview tab block:

```tsx
        {/* Review Queue tab */}
        {tab === 'review' && (
          <ReviewQueue cases={(queueCases ?? []) as QueueCase[]} />
        )}
```

- [ ] **Step 3: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/ReviewQueue.tsx app/admin/page.tsx
git commit -m "feat(admin): add Review Queue tab with AI pre-screening notes and approve/return actions"
```

---

## Task 8: Volunteer case detail — needs_attention UI

**Files:**
- Modify: `app/cases/[id]/page.tsx`

- [ ] **Step 1: Import `resubmitCase`** — add to existing imports in `app/cases/[id]/page.tsx`:

```ts
import { resubmitCase } from '@/app/cases/actions'
```

- [ ] **Step 2: Fetch `admin_return_note`** — the existing query `supabase.from('cases').select('*')` already returns all columns, so `c.admin_return_note` is available automatically. No query change needed.

- [ ] **Step 3: Add the needs_attention banner** — find `{!c.case_id && <CaseProcessing />}` and add after it:

```tsx
            {/* Needs attention — shown to volunteer when admin has returned the case */}
            {!canManage && c.status === 'needs_attention' && c.admin_return_note && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Action required before Embassy notification</p>
                <p className="mt-1 text-sm text-amber-700">{c.admin_return_note}</p>
                <form action={resubmitCase} className="mt-3">
                  <input type="hidden" name="case_id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    I've updated the case — resubmit for review
                  </button>
                </form>
              </div>
            )}

            {/* Pending review — shown to volunteer while admin reviews */}
            {!canManage && c.status === 'pending_review' && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">Under review</p>
                <p className="mt-0.5 text-blue-700">
                  Your case is being reviewed by the TFA admin team before being forwarded to the Embassy.
                  You will receive an email once it has been processed.
                </p>
              </div>
            )}
```

- [ ] **Step 4: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/cases/[id]/page.tsx"
git commit -m "feat(cases): show needs_attention banner and resubmit button on case detail"
```

---

## Self-review

**Spec coverage:**
- ✓ Volunteer submits → pending_review (Task 5)
- ✓ GPT-4o pre-screens → result stored on case + case_events (Tasks 3, 5)
- ✓ Admin queue tab with AI notes (Task 7)
- ✓ Admin approves → finalizeCase fires Embassy email (Task 6)
- ✓ Admin returns → volunteer email + needs_attention status (Task 6)
- ✓ Admin bypass rule — tfa_admin submissions go straight to finalizeCase (Task 5)
- ✓ Volunteer edits + resubmit → back to pending_review + fresh prescreening (Tasks 5, 8)
- ✓ All decisions logged in case_events for Phase 2 training data (Tasks 5, 6)
- ✓ New statuses in types + DB migration (Tasks 1, 2)
- ✓ No passport/EID in prescreening input (Task 3 — PrescreeningInput type excludes them)

**Type consistency:**
- `QueueCase` defined in `ReviewQueue.tsx`, cast from supabase result in `page.tsx` ✓
- `PrescreeningResult` shape matches between `prescreening.ts` and `ReviewQueue.tsx` ✓
- `runPrescreening` imported in both `cases/actions.ts` and `prescreening-runner.ts` ✓
- `sendCaseReturnedEmail` exported from `send.ts`, imported in `admin/actions.ts` ✓
- `approveCase` / `returnCase` exported from `admin/actions.ts`, imported in `ReviewQueue.tsx` ✓
- `resubmitCase` exported from `cases/actions.ts`, imported in `cases/[id]/page.tsx` ✓
