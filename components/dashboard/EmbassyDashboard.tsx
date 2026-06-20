'use client'

import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { StatusBadge } from '@/components/CasesList'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'
import type { PanelCase } from './CaseSidePanel'

// ─── types ─────────────────────────────────────────────────────────────────

type Range = '7d' | '30d' | '90d' | '1y' | 'all'

type FilterState =
  | { mode: 'awaiting' }
  | { mode: 'list'; typeFilter?: string; statusFilter?: string; label: string }

type RightState = FilterState | { mode: 'briefing'; caseId: string; back: FilterState }

// ─── constants ──────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']

// Embassy-facing status labels — "Sent" becomes "Received" since from their
// perspective the case just arrived; "Submitted" is a TFA-side internal state.
const EMBASSY_LABEL: Record<string, string> = {
  submitted: 'Pending',
  sent: 'Received',
  acknowledged: 'Acknowledged',
  need_more_info: 'Needs info',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PIPELINE = [
  { key: 'sent', label: 'Received' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'need_more_info', label: 'Needs info' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

const ATTENTION = new Set(['sent', 'need_more_info'])
const PROGRESS = new Set(['acknowledged', 'in_progress'])
const RESOLVED = new Set(['resolved', 'closed'])

// ─── helpers ────────────────────────────────────────────────────────────────

function ms(d: number) { return d * 86_400_000 }
function daysOpen(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
function trunc(s: string, n = 18) { return s.length > n ? s.slice(0, n) + '…' : s }
function ageClass(d: number) {
  return d >= 14 ? 'text-red-600 font-semibold' : d >= 7 ? 'text-amber-600' : 'text-brand-muted'
}

/** Split polished summary into 2–3 scannable bullet sentences. */
function toBullets(text: string | null): string[] {
  if (!text) return []
  const parts = text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 30)
  if (parts.length >= 2) return parts.slice(0, 3)
  return text
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 3)
}

function downloadCSV(rows: PanelCase[]) {
  const headers = [
    'Case ID', 'Name', 'Type', 'Status', 'Reporting emirate',
    'Date of incident', 'Passport', 'EID', 'Phone', 'Employer',
    'Reporter', 'Reporter phone', 'Days open', 'Submitted',
  ]
  const data = rows.map((c) => [
    c.case_id ?? '', c.name ?? '', c.case_type,
    EMBASSY_LABEL[c.status] ?? c.status,
    c.reporting_emirate ?? '', c.date_of_incident ?? '',
    c.passport ?? '', c.eid ?? '', c.phone ?? '',
    c.company_name ?? '', c.reporter_name ?? '', c.reporter_phone ?? '',
    String(daysOpen(c.created_at)), c.created_at.slice(0, 10),
  ])
  const csv = [headers, ...data]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cases-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── sub-components ─────────────────────────────────────────────────────────

function EmbassyStatusBadge({ status }: { status: string }) {
  const label = EMBASSY_LABEL[status] ?? status
  const cls: Record<string, string> = {
    submitted: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    acknowledged: 'bg-indigo-100 text-indigo-700',
    need_more_info: 'bg-pink-100 text-pink-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-200 text-gray-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

function CaseRow({ c, onClick }: { c: PanelCase; onClick: () => void }) {
  const age = daysOpen(c.created_at)
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-brand-border px-4 py-3 text-left transition-colors hover:bg-brand-navy/5"
    >
      <span className="w-28 shrink-0 font-mono text-xs text-brand-muted">{c.case_id ?? '—'}</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-brand-navy">{c.name ?? '—'}</span>
        <span className="ml-2 text-xs text-brand-muted">{trunc(c.case_type, 22)}</span>
      </div>
      <EmbassyStatusBadge status={c.status} />
      <span className={`w-12 shrink-0 text-right text-xs tabular-nums ${ageClass(age)}`}>
        {age === 0 ? 'Today' : `${age}d`}
      </span>
    </button>
  )
}

function Briefing({
  c,
  onBack,
  userFullName,
}: {
  c: PanelCase
  onBack: () => void
  userFullName: string
}) {
  const bullets = toBullets(c.polished_summary)
  const age = daysOpen(c.created_at)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* back bar */}
      <div className="flex items-center gap-2 border-b border-brand-border px-5 py-3">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-navy">
          <ArrowLeft size={13} /> Back
        </button>
        <span className="mx-2 text-brand-border">|</span>
        <span className="font-mono text-xs text-brand-muted">{c.case_id ?? 'Pending ID'}</span>
        <EmbassyStatusBadge status={c.status} />
        <span className={`text-xs ${ageClass(age)}`}>{age === 0 ? 'Today' : `${age}d open`}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-5">
        {/* name + type */}
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">{c.name ?? '—'}</h2>
          <p className="text-xs text-brand-muted">{c.case_type}</p>
        </div>

        {/* Situation bullets */}
        <div className="rounded-xl border border-brand-border bg-brand-bg p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">Situation</p>
          {bullets.length > 0 ? (
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-navy">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-saffron" />
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-muted">Summary not yet generated.</p>
          )}
        </div>

        {/* Identity + Reporter side by side */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Identity</p>
            <div className="space-y-1 text-brand-navy">
              {c.date_of_incident && <p><span className="text-brand-muted">Incident </span>{c.date_of_incident}</p>}
              {c.passport && <p><span className="text-brand-muted">Passport </span>{c.passport}</p>}
              {c.eid && <p><span className="text-brand-muted">EID </span>{c.eid}</p>}
              {c.phone && <p><span className="text-brand-muted">Phone </span>{c.phone}</p>}
              {c.company_name && <p><span className="text-brand-muted">Employer </span>{c.company_name}</p>}
              {!c.passport && !c.eid && !c.phone && <p className="text-brand-muted">—</p>}
            </div>
          </div>
          <div className="rounded-xl border border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Reported by</p>
            <div className="space-y-1 text-brand-navy">
              {c.reporter_name && <p className="font-medium">{c.reporter_name}</p>}
              {c.reporter_phone && <p className="font-mono">{c.reporter_phone}</p>}
              {!c.reporter_name && <p className="text-brand-muted">—</p>}
            </div>
          </div>
        </div>

        {/* Status update */}
        <div className="rounded-xl border border-brand-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">Update status</p>
          <CaseStatusForm
            caseId={c.id}
            current={c.status}
            options={EMBASSY_STATUS_OPTIONS}
            defaultHandledBy={userFullName}
          />
        </div>

        <Link href={`/cases/${c.id}`} className="block text-xs text-brand-navy-light underline">
          View full case & attachments →
        </Link>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export function EmbassyDashboard({
  cases,
  userFullName,
  emirateName,
  showEmirateSplit,
}: {
  cases: PanelCase[]
  userFullName: string
  emirateName: string
  showEmirateSplit: boolean
}) {
  const [range, setRange] = useState<Range>('30d')
  const [right, setRight] = useState<RightState>({ mode: 'awaiting' })

  // ── date filter ──
  const cutoff = useMemo(() => (range === 'all' ? 0 : Date.now() - ms(RANGE_DAYS[range])), [range])
  const prevCutoff = useMemo(() => (range === 'all' ? 0 : cutoff - ms(RANGE_DAYS[range])), [range, cutoff])

  const inRange = useMemo(
    () => cases.filter((c) => new Date(c.created_at).getTime() >= cutoff),
    [cases, cutoff],
  )
  const inPrev = useMemo(
    () => range === 'all' ? [] : cases.filter((c) => {
      const t = new Date(c.created_at).getTime()
      return t >= prevCutoff && t < cutoff
    }),
    [cases, cutoff, prevCutoff, range],
  )

  // ── aggregates ──
  const stats = useMemo(() => ({
    total: inRange.length,
    attention: inRange.filter((c) => ATTENTION.has(c.status)).length,
    progress: inRange.filter((c) => PROGRESS.has(c.status)).length,
    resolved: inRange.filter((c) => RESOLVED.has(c.status)).length,
    prevTotal: inPrev.length,
    prevAttention: inPrev.filter((c) => ATTENTION.has(c.status)).length,
  }), [inRange, inPrev])

  const avgDays = useMemo(() => {
    const done = inRange.filter((c) => RESOLVED.has(c.status))
    if (!done.length) return null
    return Math.round(done.reduce((s, c) => s + daysOpen(c.created_at), 0) / done.length)
  }, [inRange])

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of inRange) map.set(c.case_type, (map.get(c.case_type) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [inRange])
  const maxType = Math.max(1, ...typeBreakdown.map(([, n]) => n))

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of inRange) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [inRange])

  // ── awaiting (default right panel) ──
  const awaiting = useMemo(
    () => inRange
      .filter((c) => ATTENTION.has(c.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [inRange],
  )

  // ── filtered list for 'list' mode ──
  const listCases = useMemo(() => {
    if (right.mode !== 'list') return []
    return inRange
      .filter((c) =>
        (!right.typeFilter || c.case_type === right.typeFilter) &&
        (!right.statusFilter || c.status === right.statusFilter),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [inRange, right])

  const briefingCase = useMemo(
    () => right.mode === 'briefing' ? (cases.find((c) => c.id === right.caseId) ?? null) : null,
    [cases, right],
  )

  // ── handlers ──
  function openBriefing(caseId: string) {
    const back: FilterState = right.mode === 'briefing' ? right.back : (right as FilterState)
    setRight({ mode: 'briefing', caseId, back })
  }

  function goBack() {
    if (right.mode === 'briefing') setRight(right.back)
    else setRight({ mode: 'awaiting' })
  }

  function setRangeAndReset(r: Range) {
    setRange(r)
    setRight({ mode: 'awaiting' })
  }

  const activeType = right.mode === 'list' ? right.typeFilter : undefined
  const activeStatus = right.mode === 'list' ? right.statusFilter : undefined

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-card px-5 py-2.5">
        <div>
          <span className="text-sm font-semibold text-brand-navy">{emirateName}</span>
          <span className="ml-3 text-xs text-brand-muted">Community welfare</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(inRange)}
            className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
          >
            <Download size={11} /> Export
          </button>
          <div className="flex rounded border border-brand-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRangeAndReset(r)}
                className={`rounded px-2.5 py-1 text-xs transition-all ${
                  range === r ? 'bg-brand-navy font-medium text-white' : 'text-brand-muted hover:text-brand-navy'
                }`}
              >
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: left sidebar + right panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside className="flex w-52 shrink-0 flex-col overflow-hidden border-r border-brand-border bg-brand-card">

          {/* Metric chips */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {([
              { label: 'Total', value: stats.total, onClick: () => setRight({ mode: 'awaiting' }) },
              { label: 'Attention', value: stats.attention, onClick: () => setRight({ mode: 'list', statusFilter: 'sent', label: 'Need attention' }) },
              { label: 'In progress', value: stats.progress, onClick: () => setRight({ mode: 'list', statusFilter: 'in_progress', label: 'In progress' }) },
              { label: 'Resolved', value: stats.resolved, onClick: () => setRight({ mode: 'list', statusFilter: 'resolved', label: 'Resolved' }) },
            ] as const).map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex flex-col rounded-lg border border-brand-border p-2.5 text-left hover:border-brand-navy/40 hover:bg-brand-navy/3"
              >
                <span className="text-2xl font-light tabular-nums text-brand-navy">{item.value}</span>
                <span className="text-xs text-brand-muted">{item.label}</span>
              </button>
            ))}
          </div>

          {avgDays !== null && (
            <p className="border-t border-brand-border px-3 py-2 text-xs text-brand-muted">
              Avg close: <span className="font-medium text-brand-navy">~{avgDays}d</span>
            </p>
          )}

          {/* Type breakdown */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">By type</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {typeBreakdown.map(([type, count]) => {
                const active = activeType === type
                return (
                  <button
                    key={type}
                    onClick={() => setRight({ mode: 'list', typeFilter: type, label: type })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-brand-navy/5 ${active ? 'bg-brand-navy/10' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-brand-navy">{type}</p>
                      <div className="mt-0.5 h-1 rounded-full bg-brand-border">
                        <div
                          className="h-1 rounded-full bg-brand-saffron"
                          style={{ width: `${Math.round((count / maxType) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-brand-muted">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status pipeline */}
          <div className="shrink-0 border-t border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Status</p>
            <div className="space-y-0.5">
              {PIPELINE.map(({ key, label }) => {
                const n = statusCounts[key] ?? 0
                const active = activeStatus === key
                return (
                  <button
                    key={key}
                    onClick={() => setRight({ mode: 'list', statusFilter: key, label })}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-brand-navy/5 ${active ? 'bg-brand-navy/10 font-medium' : ''}`}
                  >
                    <span className="text-brand-navy">{label}</span>
                    <span className={`tabular-nums ${n === 0 ? 'text-brand-muted' : 'font-medium text-brand-navy'}`}>{n}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* AWAITING (default) */}
          {right.mode === 'awaiting' && (
            <>
              <div className="shrink-0 border-b border-brand-border px-5 py-3">
                <p className="text-sm font-semibold text-brand-navy">
                  Awaiting response
                  {awaiting.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {awaiting.length}
                    </span>
                  )}
                </p>
                <p className="text-xs text-brand-muted">Click a type or status on the left to filter all cases</p>
              </div>
              {awaiting.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-brand-muted">
                  All caught up — no cases awaiting response
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {awaiting.map((c) => (
                    <CaseRow key={c.id} c={c} onClick={() => openBriefing(c.id)} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* LIST (after clicking type or status) */}
          {right.mode === 'list' && (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-brand-border px-5 py-3">
                <button onClick={goBack} className="rounded p-0.5 text-brand-muted hover:text-brand-navy">
                  <ArrowLeft size={14} />
                </button>
                <p className="text-sm font-semibold text-brand-navy">{right.label}</p>
                <span className="text-xs text-brand-muted">({listCases.length} cases)</span>
              </div>
              {listCases.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-brand-muted">
                  No cases in this filter
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {listCases.map((c) => (
                    <CaseRow key={c.id} c={c} onClick={() => openBriefing(c.id)} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* BRIEFING (after clicking a case) */}
          {right.mode === 'briefing' && briefingCase && (
            <Briefing c={briefingCase} onBack={goBack} userFullName={userFullName} />
          )}
        </div>
      </div>
    </div>
  )
}
