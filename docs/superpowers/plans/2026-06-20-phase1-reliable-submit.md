# Phase 1 — Reliable Submit (instant submit + background email) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the live-site "broken page" on submit by saving the case instantly and running the slow AI-summary + embassy-email in the background.

**Architecture:** The `submitCase` server action currently `await`s `finalizeCase` (GPT-4o + email, ~3–8s) before responding, which exceeds Vercel's function time limit. We move `finalizeCase` into `after()` (runs after the response is sent) and raise the route's `maxDuration`. The case page shows a "being processed" state that auto-refreshes until the background job stamps the case ID and flips status to `sent`.

**Tech Stack:** Next.js 16 (`after` from `next/server`, route `maxDuration`), existing Supabase + Gmail pipeline.

---

### Task 1: Run `finalizeCase` in the background

**Files:**
- Modify: `app/cases/actions.ts` (the block after the `case_events` insert)
- Modify: `app/cases/new/page.tsx` (add route config)

- [ ] **Step 1: Import `after` in `app/cases/actions.ts`**

Add to the imports at the top:

```ts
import { after } from 'next/server'
```

- [ ] **Step 2: Replace the blocking finalize call**

Find:

```ts
  // Assign case ID, generate the AI summary, and email the embassy.
  // Auto-send on submit (preserves the original Apps Script behavior).
  await finalizeCase(data.id)

  redirect(`/cases/${data.id}`)
```

Replace with:

```ts
  // Assign case ID, generate the AI summary, and email the embassy — in the
  // background, so the volunteer gets an instant response instead of waiting
  // (and the request never times out on the host).
  after(async () => {
    await finalizeCase(data.id)
  })

  redirect(`/cases/${data.id}`)
```

- [ ] **Step 3: Raise the route time limit for the background work**

In `app/cases/new/page.tsx`, add near the top (after imports, before the component):

```ts
// Allow the background finalize (AI summary + email) up to 60s.
export const maxDuration = 60
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/cases/actions.ts app/cases/new/page.tsx
git commit -m "fix: send embassy email in background so submit is instant"
```

---

### Task 2: "Being processed" indicator that auto-updates

**Files:**
- Create: `components/CaseProcessing.tsx`
- Modify: `app/cases/[id]/page.tsx` (header card area)

- [ ] **Step 1: Create the auto-refresh notice component**

`components/CaseProcessing.tsx`:

```tsx
'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Shown on a freshly-submitted case until the background job finishes
 *  (stamps the case ID + flips status to "sent"). Refreshes the page itself. */
export function CaseProcessing() {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [router])

  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-border bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Loader2 size={16} className="animate-spin" />
      Your case is being processed and emailed to the mission. This page updates
      automatically.
    </div>
  )
}
```

- [ ] **Step 2: Render it on the case page while not yet finalized**

In `app/cases/[id]/page.tsx`, import it:

```tsx
import { CaseProcessing } from '@/components/CaseProcessing'
```

Then, inside the header card, immediately after the `<p>` that shows the case ID / routed line, add:

```tsx
        {!c.case_id && <CaseProcessing />}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/CaseProcessing.tsx "app/cases/[id]/page.tsx"
git commit -m "feat: show processing notice on a case until email is sent"
```

---

### Task 3: Find and remove any stray duplicate case from the original failure

**Files:**
- Temporary: `scripts/find-dupes.mjs` (deleted after use)

- [ ] **Step 1: Write a one-off inspection script**

`scripts/find-dupes.mjs`:

```js
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data } = await sb.from('cases')
  .select('id, case_id, case_type, name, status, email_sent_at, created_at')
  .order('created_at', { ascending: true })
console.log('id | case_id | type | name | status | emailed | created')
for (const c of data ?? []) {
  console.log(`${c.id} | ${c.case_id ?? 'NONE'} | ${c.case_type} | ${c.name} | ${c.status} | ${c.email_sent_at ? 'yes' : 'no'} | ${c.created_at}`)
}
```

- [ ] **Step 2: Run it and review**

Run: `node scripts/find-dupes.mjs`
Look for: two rows with the same name + case_type created seconds apart, where one has `case_id = NONE` and `emailed = no` (the failed attempt).

- [ ] **Step 3: If a stray un-finalized duplicate exists, delete it**

Only if Step 2 found one (replace `<ID>` with the stray row's id). Add to the script temporarily and re-run, or use the Supabase SQL editor:

```sql
delete from public.cases where id = '<ID>';
```

- [ ] **Step 4: Remove the temporary script**

```bash
rm scripts/find-dupes.mjs
```

(No commit needed — the script was never committed.)

---

### Task 4: Verify live

- [ ] **Step 1: Local build check**

Run: `npm run build`
Expected: exit 0, all routes compile.

- [ ] **Step 2: Push (triggers Vercel redeploy)**

```bash
git push origin main
```

- [ ] **Step 3: Live test**

On `https://ashraya-sage.vercel.app`: submit a test case. Confirm:
- The case page appears in ~1–2 seconds (no long wait, no error page).
- A "being processed" notice shows, then within ~30s the page auto-updates to show the `TFA-…` case ID and status `sent`.
- The embassy email arrives at the test inbox.
- Only **one** case row was created (re-run the inspection if unsure).

---

## Self-review (against spec change ①)
- Instant response: Task 1 (`after()` + redirect). ✓
- Background email within time limit: Task 1 (`maxDuration = 60`). ✓
- No double-send: relies on existing `finalizeCase` guard (`if (c.case_id) return`). ✓
- Processing UX: Task 2. ✓
- Duplicate cleanup: Task 3. ✓
- Live verification: Task 4. ✓
