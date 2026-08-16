# AI-Assisted Case Review Queue — Design Spec
**Date:** 2026-08-16
**Status:** Approved for implementation

---

## Overview

Currently, when a volunteer submits a case it is immediately sent to the Embassy. This design inserts a review gate between submission and Embassy notification:

1. Volunteer submits → case holds in **Pending Review** status
2. GPT-4o runs a pre-screening check and stores a structured note
3. TFA Admin sees the case in a **Review Queue** tab with the AI notes inline
4. Admin either **approves** (fires Embassy email) or **returns to volunteer** (with a specific note)

**Admin bypass rule:** If the submitter's role is `tfa_admin`, skip the queue entirely — the case goes straight to the Embassy as before. No one reviews the reviewer.

**Phase 2 path:** Every admin decision is logged alongside the AI's pre-screening output. After 1–2 years of data, the AI can take over the approve/return decision directly, with admin as fallback for low-confidence cases.

---

## New Case Submission Flow

```
Volunteer submits
  └─ role === 'tfa_admin'? ──Yes──▶ finalize() as today (Embassy email fires)
                            │
                           No
                            │
                            ▼
              status = 'pending_review'
                            │
                            ▼
              GPT-4o pre-screening (server-side, non-blocking)
              result stored in case_events
                            │
                            ▼
              Admin Review Queue (new tab in admin dashboard)
                  │                          │
                  ▼                          ▼
           Admin approves           Admin returns to volunteer
                  │                          │
                  ▼                          ▼
          finalize() fires          status = 'needs_attention'
          Embassy email             Volunteer email with admin note
          status = 'sent'           Volunteer fixes → resubmits → queue again
```

---

## GPT-4o Pre-Screening

### What it checks
- **Completeness** — for this case type, are all expected fields present? (e.g. employer name for labour cases, location for missing persons, date of incident)
- **Narrative consistency** — does the story match the declared case type? Flags obvious mismatches.
- **Documents** — were attachments uploaded? For high-severity types, flags if none present.
- **Red flags** — future dates, contradictory details, generic filler text. Not a fraud verdict — a note for the admin to look closer.

### What it never sees
Passport numbers and Emirates IDs are excluded at the call site — enforced by the existing `PolishInput` type pattern.

### Input (passed to GPT-4o)
```ts
{
  caseType: string
  narrative: string          // polished summary
  hasAttachments: boolean
  attachmentLabels: string[] // file names only, not content
  reporterName: string
  reporterPhone: string
  affectedName: string
  affectedGender: string
  affectedAge: string
  companyName: string | null
  dateOfIncident: string | null
  emirate: string
}
```

### Output (structured JSON stored in case_events)
```ts
{
  completeness: { pass: boolean; issues: string[] }
  consistency:  { pass: boolean; issues: string[] }
  documents:    { pass: boolean; issues: string[] }
  redFlags:     { pass: boolean; issues: string[] }
  summary:      string   // 1–2 sentence plain-English note for admin
  confidence:   'high' | 'medium' | 'low'
}
```

### Storage
Stored as a `case_events` row:
```ts
{
  event_type: 'ai_prescreening',
  note:        JSON.stringify(result),
  actor:       null,
  to_status:   'pending_review'
}
```

---

## Admin Review Queue UI

### New status values
| Status | Meaning |
|---|---|
| `pending_review` | Submitted by volunteer, awaiting admin review |
| `needs_attention` | Returned to volunteer with admin note |

Existing statuses (`submitted`, `sent`, etc.) are unchanged — admin-submitted cases still use them.

### New "Review Queue" tab in admin dashboard
- Badge count showing pending cases
- Each row shows: case ID, case type, affected name, time since submission, AI flag summary (`2 items flagged` / `All checks passed`)
- Inline AI note in monospace (completeness, consistency, documents, red flags)
- Two action buttons: **Approve & Send to Embassy** | **Return to Volunteer**
- **Return** requires a free-text note (what the volunteer needs to fix) — sent to them by email
- Link to full case detail page

### Volunteer experience on return
- Email: "Your case [ID] needs attention before it can be forwarded. [Admin note]"
- Case detail page shows status `Needs Attention` with the admin's note highlighted
- An **Edit & Resubmit** button appears on the case detail page (only when status is `needs_attention`)
- Clicking it opens the case form pre-populated with existing data — volunteer edits and resubmits
- On resubmit the existing case row is updated in place (no new row created), status returns to `pending_review`, and a new GPT-4o pre-screening runs

---

## Data Model Changes

### New case statuses (add to `cases.status` enum)
- `pending_review`
- `needs_attention`

### New case_events types
- `ai_prescreening` — GPT-4o output JSON in `note`
- `admin_approved` — admin approved, Embassy email fired
- `admin_returned` — admin returned to volunteer, return note in `note`
- `volunteer_resubmitted` — volunteer fixed and resubmitted

### New server actions
- `approveCase(caseId)` — admin approves; calls `finalize()`, logs event
- `returnCase(caseId, note)` — admin returns; emails volunteer, logs event
- `resubmitCase(caseId)` — volunteer resubmits; puts back in queue, triggers new pre-screening

---

## Files to Create / Modify

| File | Change |
|---|---|
| `lib/ai/prescreening.ts` | New — GPT-4o pre-screening function |
| `lib/cases/finalize.ts` | Add admin bypass check; change default status to `pending_review` |
| `app/admin/page.tsx` | Add Review Queue tab |
| `app/admin/page.tsx` | Add Review Queue as a new tab in the existing tab-based admin UI |
| `app/admin/actions.ts` | Add `approveCase`, `returnCase` server actions |
| `app/cases/actions.ts` | Add `resubmitCase` server action |
| `lib/email/send.ts` | Add `sendReturnToVolunteerEmail` |
| `lib/types.ts` | Add new statuses to `CaseStatus` type and labels |
| `supabase/migrations/` | New migration adding status values |

---

## Phase 2 Upgrade Path

After 1–2 years of admin decisions logged in `case_events`:

1. Query all `ai_prescreening` + `admin_approved`/`admin_returned` pairs
2. Calculate AI flag accuracy per flag type
3. Where accuracy is high (>90%), AI can auto-approve without admin
4. Where accuracy is low, still route to admin
5. Admin queue shrinks over time; AI handles the clear cases

No architectural changes needed — just change the routing logic in `finalize.ts`.

---

## Presentation Integration

This feature is the **third act** of the Ambassador demo:

1. Volunteer submits the Repatriation case → lands in Pending Review
2. Admin opens Review Queue → sees AI note: "Employer name missing"
3. Admin approves anyway → Embassy email fires
4. Ambassador sees: volunteer → AI quality check → human admin → Embassy

Demonstrates sophistication without claiming full automation. The message: *"We verify before we escalate."*
