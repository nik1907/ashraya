# Ashraya — Change Set Design (2026-06-20)

## Context

Ashraya is live at `https://ashraya-sage.vercel.app` (Next.js 16 + Supabase, hosted on Vercel; emails sent from `tfa.abudhabi@gmail.com` via Gmail SMTP). After first real-world use by a community leader, nine changes are requested — one is a production bug, the rest are usability and feature improvements. This document is the agreed design; an implementation plan follows.

## Confirmed decisions (from brainstorming)

- Broken submit happened on the **live site** → root cause is a hosting **timeout** on the slow AI+email step. Fix by **instant submit + background email**.
- Email-verify → approval flow applies to **self-signup volunteers only** (admin/embassy accounts are created directly and skip it).
- Validation level: **moderate** (required + format checks; Emirates ID strict, passports loose).
- Gender: **Male / Female / Other**, optional.
- "At least one ID" requirement: **reporter only**.
- Clickable dashboard: **stat cards and chart segments** both clickable, full mapping.
- Recent activity: **top 5**, collapsible, **expanded by default**.
- Type bar chart: **top 5** case types.
- Drafts: **account-based with a "My drafts" list**; typed answers saved, files re-added at submit (v1).

---

## The nine changes

### ① Fix the broken submit (priority) — instant submit + background email
**Problem.** `submitCase` awaits `finalizeCase` (GPT-4o ~3–8s + email send) inside the request, exceeding Vercel's function time limit → broken page; a retry can create a duplicate.
**Design.**
- `submitCase` saves the case + attachments + a `submitted` audit event, then **schedules finalize via `after()` (from `next/server`)** and redirects immediately to the case page.
- Set `export const maxDuration = 60` on `app/cases/new/page.tsx` so the background finalize has time.
- `finalizeCase` already no-ops if `case_id` is set (idempotent) — prevents double-send.
- Case detail page shows "being processed" when `case_id` is null / status `submitted`, with a light auto-refresh so the ID + status appear once the background job finishes.
- One-off: check the DB for a stray/duplicate case from the original failed attempt and remove it.
**Acceptance.** Submit returns in ~1–2s; case page appears instantly; email arrives within ~30s; a single submit never creates two cases.

### ② Gender dropdown
`BASE_FIELDS.gender` in `lib/caseConfig.ts` becomes `type: 'select'`, options `['Male','Female','Other']`, optional. The form already renders selects; the DB column is unchanged (stores the chosen text).
**Acceptance.** Gender shows a 3-option dropdown.

### ③ Reporter — Passport or Emirates ID
- **Migration 0005:** `alter table cases add column reporter_eid text`.
- Add `reporter_eid` to `REPORTER_FIELDS`; render it in the reporter section.
- Validation: **at least one** of `reporter_passport` / `reporter_eid` required (client + server).
- Show reporter EID in the embassy email ("Reported by") and the case detail card.
**Acceptance.** Reporter shows Passport + Emirates ID; submitting with neither is blocked; one suffices.

### ④ Moderate validation (whole form)
Enforced in the browser (HTML attributes) **and** re-checked on the server in `submitCase`, returning a clear message for the first failure.

| Field | Rule |
|---|---|
| Case type, Reporting emirate | required, must be a known value |
| Affected: Name | required |
| Description | required, ≥ 10 characters |
| Affected: Age | number 0–120 (if given) |
| Emirates ID (affected & reporter) | format `784-####-#######-#` (15 digits) if given |
| Passport (affected & reporter) | optional, loose (5–20 alphanumeric) |
| Emails (company, reporter) | valid email if given |
| Phones (affected, company, reporter) | digits/`+`/spaces, length 7–20 if given |
| Date of incident | not in the future |
| Case-type number fields (amounts, days) | number ≥ 0 |
| Reporter: Name, Phone | required |
| Reporter: Passport or EID | at least one (see ③) |

Case-type **date** fields (e.g. visa expiry) are left unconstrained (they can legitimately be future). Implementation uses a small validation module driven by `FieldDef` plus explicit rules above; `zod` is available.
**Acceptance.** Each rule blocks bad input with a clear message; valid forms pass.

### ⑤ Email-verify → approval flow (self-signup volunteers)
- Turn **on** Supabase "Confirm email."
- Signup (volunteer): `signUp` with `emailRedirectTo = <origin>/auth/verified`; the login page shows **"Check your email to verify your account."** (no redirect, since there's no session until confirmed).
- A confirmation handler (Supabase's recommended App-Router pattern) verifies the emailed token and lands the user on **`/auth/verified`**, which shows **"✓ Email verified — please wait for a TFA admin to approve your account."**
- When an admin activates a pending account (`setProfileStatus` → `active`), the action looks up the user's email (service-role) and **sends an approval email via Gmail**: "Your Ashraya account is approved — you can now sign in," with a link to the login page.
- Admin/embassy accounts created directly are unaffected.
**Note / risk.** The exact token mechanism (`verifyOtp` with `token_hash` vs PKCE `exchangeCodeForSession`) is the fiddliest part and will be finalized and tested against live Supabase during implementation.
**Acceptance.** Volunteer signs up → verify email → "verified, pending approval" page → admin approves → volunteer gets "approved" email → can log in.

### ⑥ Clickable dashboard
- `DashboardOverview` and `CaseCharts` receive a `basePath` (`/admin`, `/dashboard`, or `/embassy`) so links/clicks target the right role's list.
- Stat cards become links; chart `Cell`s get `onClick` (CaseCharts is a client component → `useRouter`).
- Mapping: Total→`?` (all), Open→`?status=open`, Resolved→`?status=resolved`, This month→`?range=month`, Pending volunteers→approvals view, donut slice→`?status=<that>`, type bar→`?type=<that>`.
- Each role's list query learns to apply: `status` (exact), `open` (not resolved/closed), `resolved` (resolved or closed), `range=month` (created this month), `type` (case_type), plus existing `q` search.
**Acceptance.** Clicking any card/segment opens the correctly filtered list.

### ⑦ Recent activity — top 5, collapsible
- `getDashboardData` limits activity to **5**.
- Activity panel extracted into a small **client** component with expand/collapse (header toggles; **expanded by default**).
**Acceptance.** ≤5 items; header click collapses/expands.

### ⑧ Type bar chart — top 5
`CaseCharts` shows `byType.slice(0, 5)`.
**Acceptance.** ≤5 type bars.

### ⑨ Draft saving (My drafts)
- **Migration 0006:** add `draft` to the `case_status` enum. A draft = `status 'draft'`, no `case_id`, no email.
- **Auto-save:** once a case type + (name or description) is entered, the form debounced-saves via a `saveDraft` server action (insert first time, update after), tracking the draft id client-side; shows "Draft saved ✓".
- **Resume:** `/cases/new?draft=<id>` loads the draft; `CaseForm` accepts initial values to pre-fill.
- **My drafts:** a section on the volunteer dashboard lists their `draft` cases → each links to resume; a **Discard** action deletes one.
- **Submit from draft:** `submitCase` detects the draft id and converts that row to `submitted` → finalize (instead of inserting new).
- **Hidden until submitted:** add `status != 'draft'` to admin/embassy/volunteer case lists, dashboard stats, and counts. (Drafts are visible to their owner via existing RLS; admin/embassy simply don't query them.)
- **Files (v1):** typed answers are saved; uploaded files are attached at final Submit (browsers can't restore a file into a draft).
**Acceptance.** Filling a form creates a resumable draft; returning pre-fills it; submit converts it; discard removes it; drafts never appear in others' lists, stats, or counts.

---

## Infrastructure / settings changes
- **Migrations:** `0005_reporter_eid.sql` (add column), `0006_case_draft_status.sql` (`alter type case_status add value 'draft'` — run as its own statement).
- **Supabase Auth:** enable **Confirm email**; redirect allow-list already covers `/**` for localhost + Vercel (includes `/auth/verified`).
- **Vercel:** `maxDuration = 60` on the case-intake route for the background email.

## Build order (phased, each verified before the next)
1. **① Bug fix** — instant submit + background email; remove any stray duplicate case.
2. **Quick wins** — ② gender, ⑦ activity top-5 collapsible, ⑧ type top-5, ⑥ clickable dashboard.
3. **③ + ④** — reporter EID + moderate validation (migration 0005).
4. **⑤** — email-verify → approval flow.
5. **⑨** — draft saving (migration 0006).

## Verification (end to end, after all phases)
- Submit on the live site returns instantly; email arrives shortly after; no duplicates.
- Validation blocks: empty required fields, bad email, future incident date, malformed Emirates ID, reporter with no ID.
- New volunteer: verify-email page → admin approval → approval email → login.
- Each dashboard card/chart segment opens the right filtered list; activity ≤5 collapsible; ≤5 type bars.
- Draft: auto-saves, resumes pre-filled on another device, converts on submit, hidden from admin/stats; discard works.
- Re-deploy to Vercel; smoke-test the full flow live.

## Out of scope (for now)
- Storing uploaded files inside drafts (re-attach at submit for v1).
- Urgency/triage, aging, needs-attention queues (deferred earlier).
- Rotating the chat-exposed keys (separate housekeeping task).
