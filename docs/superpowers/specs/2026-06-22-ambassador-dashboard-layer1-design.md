# Ambassador Mission Dashboard — Layer 1 Design Spec

**Date:** 2026-06-22  
**Scope:** Layer 1 only — all data from existing `cases` + `case_events` tables, no new tables required  
**Status:** Approved for implementation

---

## 1. What this is

A strategic mission dashboard for the Indian Embassy UAE, distinct from the existing embassy officer case dashboard. The ambassador and IFS officers do not process cases — they manage mission health, crisis response, and diaspora welfare at aggregate level.

**The principle:** cases are a signal, not the subject. Individual case IDs never appear on this dashboard. Cases appear as aggregate counts, crisis summaries, and pattern alerts.

---

## 2. New role

Add `ambassador` to the `ROLES` constant in `lib/types.ts`:

```ts
export const ROLES = [
  'volunteer',
  'tfa_admin',
  'embassy_abu_dhabi',
  'embassy_dubai',
  'ambassador',          // NEW
] as const
```

**Scope:** sees all cases from both emirates (Abu Dhabi + Dubai), all organisations, all time.  
**RLS:** same as `tfa_admin` — full read access on `cases` and `case_events`. No write access to case status (ambassador does not update cases directly).  
**Landing path:** `/ambassador` (add to `landingPathForRole` in `lib/types.ts`)  
**Role label:** `'Ambassador / Mission Head'`

---

## 3. Route & file structure

```
app/ambassador/
  page.tsx                  ← server component, fetches all cases + events, renders AmbassadorDashboard
components/dashboard/
  AmbassadorDashboard.tsx   ← client component (mirrors EmbassyDashboard.tsx pattern)
  SignalQuadrant.tsx        ← new: Volume × YoY quadrant chart component
```

`app/ambassador/page.tsx` fetches using `createAdminClient()` (bypasses RLS — ambassador sees everything, same as admin). Passes `cases: PanelCase[]` to `AmbassadorDashboard`.

---

## 4. Dashboard layout — top to bottom

### 4.1 Header

Dark navy block (`bg-brand-navy`), full width.

- Left: eyebrow "MISSION COMMAND · ASHRAYA WELFARE PLATFORM", title "Embassy of India — UAE", subtitle "Abu Dhabi · Dubai · Both Emirates"
- Right: role badge "AMBASSADOR" + range selector

**Range selector:** `1D | 7D | 1W | 1M | 3M | 6M | 1Y | 5Y | ALL`  
Maps to days: `1 | 7 | 7 | 30 | 90 | 180 | 365 | 1825 | Infinity`

`1W` and `7D` are aliases (both = 7 days). Include both for UX familiarity.

---

### 4.2 Mission Brief (AI-generated)

**Component:** `EmbassyAIBrief` already exists — create a new `AmbassadorAIBrief` component with a different prompt.

**Prompt strategy (server action):**
- Input: aggregate stats computed from `cases` (open count, critical count, aging count, resolution rate, top category, trafficking flag)
- Output: 2 paragraphs + 1 CTA sentence
  - Para 1: mission welfare health (case load, critical count, resolution rate, response time)
  - Para 2: crisis + diaspora signals (trafficking patterns, employer clusters, aging criticals)
  - CTA: "N critical items need your attention today." (red, links to Active Crisis section)

**Refresh:** on page load, cached per session (do not re-call on range change — the brief is always for today).

**Display:** white card, indigo label "MISSION HEALTH · [date] · [time] GST", brief text in two paragraphs, red CTA at bottom.

---

### 4.3 Mission Vital Signs (5 cards)

Grid: `grid-cols-5` on desktop, `grid-cols-2 sm:grid-cols-3` on mobile (last card full-width on mobile).

Each card shows: metric name · big value · MoM delta · YoY delta · 14-day sparkline.

**MoM delta:** compare current period value to same-length period ending one month ago.  
**YoY delta:** compare current period value to same-length period ending one year ago.  
**Colour logic for deltas:** direction matters contextually —  
  - Open cases: ↑ = bad (red), ↓ = good (green)  
  - Crisis signals: ↑ = bad, ↓ = good  
  - Avg response time: ↑ = bad, ↓ = good  
  - Resolution rate: ↑ = good, ↓ = bad  
  - Employer pattern alerts: ↑ = bad, ↓ = good  

**Cards:**

| # | Name | Metric | Value colour |
|---|------|--------|-------------|
| 1 | Open Cases UAE-wide | `cases` where status not in (resolved, closed) and created_at within range | `#0b2545` |
| 2 | Crisis Signals (30d) | `cases` where `getPriority()` === 'critical' AND not resolved/closed AND created within last 30d (always 30d, not range-dependent) | `#E24B4A` |
| 3 | Avg Embassy Response | avg days from `created_at` to first `case_events` row where action = 'status_change' from 'sent' to anything | `#EF9F27` |
| 4 | Resolution Rate (week) | % of cases opened this week that are now resolved — rolling 7-day | `#138808` |
| 5 | Employer Pattern Alerts | count of employers with 3+ open cases in last 90d (always 90d, not range-dependent) | `#7c3aed` |

**Sparklines:** 14 daily buckets, cases created per day. Same `Sparkline` component already in `EmbassyDashboard.tsx`, reuse.

**Range behaviour:** cards 2 and 5 are always fixed-window (30d and 90d respectively, noted with a small "30d" / "90d" pill). Cards 1, 3, 4 respond to the range selector.

---

### 4.4 Active Crisis & Distress

Shows only `getPriority() === 'critical'` cases that are not resolved/closed.

**Aggregated — not individual.** Group by `case_type` + `assigned_emirate`. Do NOT show case IDs or names.

Each row shows:
- Type label + emirate (e.g. "Death in custody — Abu Dhabi")
- One-line situation: status label + who it's with (derived from latest `case_events` note if available, otherwise status label)
- Age in days (oldest case in that group if multiple)
- Arrow "›" — click to open a filtered case list (same `CaseAccordion` pattern as embassy dashboard, but showing only that type + emirate subset)

**No cases = green "All clear" state** (mirror the embassy dashboard hero pattern).

---

### 4.5 Strategic Trends

Two-column grid:

**Left — Case Volume Monthly bar chart**
- X-axis: last N months (8 months for 1M range, scales with range selector)
- Y-axis: case count
- Current month bar: `#4f46e5` (accent), prior months: `#c7d2fe`
- Below chart: delta vs same month last year (e.g. "↑ Highest volume month in 8 months")

**Right — Signal Quadrant** (new `SignalQuadrant.tsx` component)

SVG-based scatter plot. Each of the 20 case types is one dot.
- X-axis: YoY % change (left = declining, right = growing). Centre = 0%.
- Y-axis: current period volume (bottom = low, top = high). Centre = median volume.
- Dot size: proportional to volume (min 10px, max 28px diameter).
- Dot colour:
  - Top-right (high volume + growing): `#E24B4A`
  - Top-left (high volume + declining): `#16a34a`
  - Bottom-right (low volume + growing fast, i.e. YoY > 50%): `#f59e0b`
  - Bottom-left (low volume + stable/declining): `#94a3b8`
- Quadrant background tints (very faint): red top-right, green bottom-right, amber top-left, grey bottom-left
- Quadrant labels: "HIGH VOLUME · GROWING ⚑" / "EMERGING RISK" / "IMPROVING ↓" / "STABLE / LOW"
- Hover tooltip: case type name · count · YoY % change
- Click dot: opens `CaseAccordion` filtered to that case type

**YoY calculation for quadrant:** compare `inRange` cases to same date range one year prior.

---

### 4.6 Pattern Alerts

Replaces the old "Reporting Organisation" widget. Uses existing employer repeat detection from `EmbassyDashboard.tsx` (`employerCounts` map), but elevated to mission level.

**Threshold:** 3+ cases with same `company_name` in last 90 days (always 90d).

Each alert card:
- Badge: "N CASES · 90D"
- Employer name
- Case type breakdown (e.g. "employer harassment (8), salary dispute (3)")
- Severity: if any case is critical → red border; if all medium/high → amber border; if declining trend → green border
- Recommended action line: pre-written based on case types present:
  - Trafficking present → "Recommend consular coordination with [emirate] Police"
  - 5+ cases same employer → "Recommend raising with UAE Ministry of Human Resources"
  - Otherwise → "Monitor — escalate if 2+ more cases in 30 days"
- Click → `CaseAccordion` filtered to that employer

Sort: by case count descending, then by presence of critical case.

---

## 5. What is NOT in Layer 1

Explicitly out of scope — do not build placeholders for these:

- Political & Commercial Engagement calendar
- HQ Compliance & Reporting (MEA deadlines)
- Welfare fund / ICWF disbursement tracking
- Diaspora Pulse (population map, community events)
- AI Brief para 2 (PM visits, MoUs — no data source)

---

## 6. What is dropped from the current embassy dashboard

This dashboard does NOT include:
- Individual case IDs anywhere in the main view
- "Reporting Organisation" widget (replaced by Pattern Alerts)
- Donut chart (replaced by Signal Quadrant)
- Print / PDF / CSV buttons in the main bar
- "Awaiting Reporter Response" count (operational, not strategic)
- Case status update form (ambassador does not update cases)

---

## 7. Reused components

| Component | Reuse as-is | Change |
|-----------|-------------|--------|
| `Sparkline` | Yes | Copy or import from `EmbassyDashboard.tsx` |
| `CaseAccordion` | Yes | Import directly — read-only, no status update form shown for ambassador role |
| `FuzzySearchOverlay` | Yes | Keep — ambassador can still search by name |
| `PRIORITY_DOT` / `getPriority()` | Yes | Move to shared `lib/priority.ts` so both dashboards import |
| `daysOpen()` | Yes | Move to `lib/caseUtils.ts` |
| `STATUS_DOT` / `EMBASSY_LABEL` | No | Ambassador uses different labels — define locally |

**Refactor note:** extract `getPriority()`, `daysOpen()`, `getTypeColor()`, `getOrg()` from `EmbassyDashboard.tsx` into `lib/caseUtils.ts` so both dashboards share them without duplication.

---

## 8. Supabase / data

**No new migrations needed for Layer 1.**

`app/ambassador/page.tsx` fetches:
```ts
const { data: cases } = await supabase
  .from('cases')
  .select('id, case_id, case_type, status, reporting_emirate, assigned_emirate, created_at, company_name, ...')
  // no .eq('assigned_emirate', ...) — ambassador sees all
```

**MoM / YoY computation:** done client-side in `useMemo` hooks in `AmbassadorDashboard.tsx`. The full case list is already in memory after the initial fetch — no extra queries needed for delta calculations.

---

## 9. Auth & access

`app/ambassador/page.tsx`:
```ts
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
if (profile.role !== 'ambassador') redirect('/dashboard')
```

Add `ambassador` to RLS policies — same as `tfa_admin` read policies on `cases` and `case_events`.

---

## 10. Mobile behaviour

- Range selector: horizontal scroll on mobile (overflow-x: auto)
- Vital Signs: 2-col on mobile, 3-col on sm, 5-col on lg
- Signal Quadrant: min-height 240px, tap to see tooltip (no hover on mobile)
- Active Crisis: full width, stacks vertically
- Pattern Alerts: full width cards

---

## 11. Out-of-scope for this spec

- IFS officer sub-roles (portfolio filtering) — deferred to Layer 2
- `ambassador` role assignment UI in admin panel — add manually via Supabase dashboard for now
- AI Brief caching / rate limiting — use same pattern as `EmbassyAIBrief`
- Comparison to volunteer/admin dashboards — separate designs

---

## 12. Acceptance criteria

1. An `ambassador` role user lands on `/ambassador` after login
2. All 5 vital sign cards show correct counts with MoM and YoY deltas
3. Active Crisis shows only critical non-resolved cases, grouped by type + emirate, no case IDs visible
4. Clicking a crisis row opens `CaseAccordion` with the correct filtered case list
5. Signal Quadrant plots all case types present in the data; hover shows tooltip; click opens case list
6. Pattern Alerts shows employers with 3+ cases in 90d, sorted by count
7. Range selector changes vital signs, volume chart, and quadrant data
8. A `tfa_admin` or `embassy_*` user accessing `/ambassador` is redirected away
9. No individual case IDs or affected-person names visible in any non-accordion section
