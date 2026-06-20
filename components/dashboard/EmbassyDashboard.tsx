'use client'

import { ArrowLeft, Download, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'
import type { PanelCase } from './CaseSidePanel'

// ─── types ──────────────────────────────────────────────────────────────────

type Range = '7d' | '30d' | '90d' | '1y' | 'all'
type Priority = 'critical' | 'high' | 'medium' | 'normal'

type FilterState =
  | { mode: 'awaiting' }
  | { mode: 'list'; typeFilter?: string; statusFilter?: string; label: string }

type RightState = FilterState | { mode: 'briefing'; caseId: string; back: FilterState }

// ─── constants ───────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']

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

// ─── priority scoring ────────────────────────────────────────────────────────

function getPriority(caseType: string, status: string, createdAt: string): Priority {
  const type = caseType.toLowerCase()
  const ageDays = daysOpen(createdAt)

  // Always critical regardless of age
  if (
    type.includes('police') || type.includes('detent') || type.includes('arrest') ||
    type.includes('death') || type.includes('traffick') || type.includes('medical') ||
    type.includes('missing')
  ) return 'critical'

  // SLA breach: 'received' but no action taken
  if (status === 'sent') {
    if (ageDays >= 3) return 'critical'  // 3+ days unacknowledged
    if (ageDays >= 1) return 'high'      // 1–2 days
  }

  if (
    type.includes('passport') || type.includes('harass') ||
    type.includes('absconding') || type.includes('exit') ||
    type.includes('human') || type.includes('overstay')
  ) return 'high'

  if (ageDays >= 21) return 'critical'
  if (ageDays >= 14) return 'high'
  if (ageDays >= 7) return 'medium'
  return 'normal'
}

const PRIORITY_DOT: Record<Priority, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-400',
  normal: 'bg-emerald-400',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High priority',
  medium: 'Medium',
  normal: 'Normal',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function ms(d: number) { return d * 86_400_000 }

function daysOpen(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function trunc(s: string, n = 20) { return s.length > n ? s.slice(0, n) + '…' : s }

function ageLabel(d: number) { return d === 0 ? 'Today' : `${d}d` }

function ageClass(d: number) {
  return d >= 14 ? 'text-red-600 font-semibold' : d >= 7 ? 'text-amber-600' : 'text-brand-muted'
}

/** Convert a UAE phone number to a wa.me link. */
function toWhatsApp(phone: string | null): string | null {
  if (!phone) return null
  const d = phone.replace(/[^0-9]/g, '')
  if (!d || d.length < 7) return null
  if (d.startsWith('971')) return `https://wa.me/${d}`
  if (d.startsWith('0')) return `https://wa.me/971${d.slice(1)}`
  return `https://wa.me/971${d}`
}

/** Split case_brief or fall back to splitting polished_summary into sentences. */
function toBullets(c: PanelCase): string[] {
  if (c.case_brief) {
    return c.case_brief.split('\n').map((s) => s.trim()).filter((s) => s.length > 10)
  }
  if (!c.polished_summary) return []
  const parts = c.polished_summary.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 30)
  if (parts.length >= 2) return parts.slice(0, 3)
  return c.polished_summary
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 3)
}

function downloadCSV(rows: PanelCase[]) {
  const headers = [
    'Case ID', 'Name', 'Type', 'Status', 'Outcome', 'Reporting emirate',
    'Date of incident', 'Passport', 'EID', 'Phone', 'Employer',
    'Reporter', 'Reporter phone', 'Days open', 'Submitted',
  ]
  const data = rows.map((c) => [
    c.case_id ?? '', c.name ?? '', c.case_type,
    EMBASSY_LABEL[c.status] ?? c.status, c.outcome ?? '',
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

// ─── sub-components ──────────────────────────────────────────────────────────

function EmbassyStatusBadge({ status }: { status: string }) {
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
      {EMBASSY_LABEL[status] ?? status}
    </span>
  )
}

function PriorityDot({ caseType, status, createdAt }: { caseType: string; status: string; createdAt: string }) {
  const p = getPriority(caseType, status, createdAt)
  return (
    <span
      title={PRIORITY_LABEL[p]}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[p]}`}
    />
  )
}

function PhoneLink({ phone, label }: { phone: string | null; label?: string }) {
  if (!phone) return null
  const waUrl = toWhatsApp(phone)
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono">{phone}</span>
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in WhatsApp"
          className="text-emerald-600 hover:text-emerald-700"
        >
          <MessageCircle size={12} />
        </a>
      )}
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
      <PriorityDot caseType={c.case_type} status={c.status} createdAt={c.created_at} />
      <span className="w-28 shrink-0 font-mono text-xs text-brand-muted">{c.case_id ?? '—'}</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-brand-navy">{c.name ?? '—'}</span>
        <span className="ml-2 text-xs text-brand-muted">{trunc(c.case_type, 22)}</span>
      </div>
      <EmbassyStatusBadge status={c.status} />
      <span className={`w-12 shrink-0 text-right text-xs tabular-nums ${ageClass(age)}`}>
        {ageLabel(age)}
      </span>
    </button>
  )
}

function Briefing({
  c,
  onBack,
  userFullName,
  employerCounts,
}: {
  c: PanelCase
  onBack: () => void
  userFullName: string
  employerCounts: Map<string, number>
}) {
  const bullets = toBullets(c)
  const age = daysOpen(c.created_at)
  const priority = getPriority(c.case_type, c.status, c.created_at)
  const waReporter = toWhatsApp(c.reporter_phone)
  const waAffected = toWhatsApp(c.phone)
  const empCount = c.company_name ? (employerCounts.get(c.company_name) ?? 0) : 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* back bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-brand-border px-5 py-3">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-navy">
          <ArrowLeft size={13} /> Back
        </button>
        <span className="mx-1 text-brand-border">|</span>
        <span className="font-mono text-xs text-brand-muted">{c.case_id ?? 'Pending'}</span>
        <EmbassyStatusBadge status={c.status} />
        <span className={`text-xs ${ageClass(age)}`}>{age === 0 ? 'Today' : `${age}d open`}</span>
        {priority !== 'normal' && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            priority === 'critical' ? 'bg-red-100 text-red-700' :
            priority === 'high' ? 'bg-amber-100 text-amber-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
            {PRIORITY_LABEL[priority]}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* name + type */}
        <div>
          <h2 className="text-base font-semibold text-brand-navy">{c.name ?? '—'}</h2>
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
            <p className="text-sm text-brand-muted italic">Summary not yet generated.</p>
          )}
          {!c.case_brief && c.polished_summary && (
            <p className="mt-2 text-xs text-brand-muted">
              AI brief not available — showing extracted summary. Resubmit to generate.
            </p>
          )}
        </div>

        {/* Identity + Reporter */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Identity</p>
            <div className="space-y-1 text-brand-navy">
              {c.date_of_incident && <p><span className="text-brand-muted">Incident </span>{c.date_of_incident}</p>}
              {c.passport && <p><span className="text-brand-muted">Passport </span>{c.passport}</p>}
              {c.eid && <p><span className="text-brand-muted">EID </span>{c.eid}</p>}
              {c.phone && (
                <p className="flex items-center gap-1">
                  <span className="text-brand-muted">Phone </span>
                  <PhoneLink phone={c.phone} />
                </p>
              )}
              {c.company_name && (
                <p className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-brand-muted">Employer </span>
                  {c.company_name}
                  {empCount >= 3 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      ⚠ {empCount} cases
                    </span>
                  )}
                </p>
              )}
              {!c.passport && !c.eid && !c.phone && <p className="text-brand-muted">—</p>}
            </div>
          </div>
          <div className="rounded-xl border border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Reported by</p>
            <div className="space-y-1 text-brand-navy">
              {c.reporter_name && <p className="font-medium">{c.reporter_name}</p>}
              {c.reporter_phone && <PhoneLink phone={c.reporter_phone} />}
              {!c.reporter_name && <p className="text-brand-muted">—</p>}
            </div>
          </div>
        </div>

        {/* Resolution info (if resolved/closed) */}
        {(c.outcome || c.resolved_by || c.resolution_note) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">Resolution</p>
            {c.outcome && <p className="font-medium text-emerald-800">{c.outcome}</p>}
            {c.resolved_by && <p className="text-emerald-700">Handled by {c.resolved_by}</p>}
            {c.resolution_note && <p className="mt-1 text-emerald-600 italic">{c.resolution_note}</p>}
          </div>
        )}

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

  const stats = useMemo(() => ({
    total: inRange.length,
    attention: inRange.filter((c) => ATTENTION.has(c.status)).length,
    progress: inRange.filter((c) => PROGRESS.has(c.status)).length,
    resolved: inRange.filter((c) => RESOLVED.has(c.status)).length,
    prevTotal: inPrev.length,
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

  // Employer repeat-offender map (across ALL cases, not just range-filtered)
  const employerCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cases) {
      if (c.company_name) m.set(c.company_name, (m.get(c.company_name) ?? 0) + 1)
    }
    return m
  }, [cases])

  // Awaiting — sorted by priority (critical first), then age
  const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, normal: 3 }
  const awaiting = useMemo(
    () => inRange
      .filter((c) => ATTENTION.has(c.status))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[getPriority(a.case_type, a.status, a.created_at)]
        const pb = PRIORITY_ORDER[getPriority(b.case_type, b.status, b.created_at)]
        if (pa !== pb) return pa - pb
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }),
    [inRange],
  )

  const listCases = useMemo(() => {
    if (right.mode !== 'list') return []
    return inRange
      .filter((c) =>
        (!right.typeFilter || c.case_type === right.typeFilter) &&
        (!right.statusFilter || c.status === right.statusFilter),
      )
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[getPriority(a.case_type, a.status, a.created_at)]
        const pb = PRIORITY_ORDER[getPriority(b.case_type, b.status, b.created_at)]
        if (pa !== pb) return pa - pb
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [inRange, right])

  const briefingCase = useMemo(
    () => right.mode === 'briefing' ? (cases.find((c) => c.id === right.caseId) ?? null) : null,
    [cases, right],
  )

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

  // Critical cases count for badge
  const criticalCount = useMemo(
    () => inRange.filter((c) => getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    [inRange],
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-card px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brand-navy">{emirateName}</span>
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {criticalCount} critical
            </span>
          )}
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

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside className="flex w-52 shrink-0 flex-col overflow-hidden border-r border-brand-border bg-brand-card">

          {/* Metric chips */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {([
              { label: 'Total', value: stats.total, action: () => setRight({ mode: 'awaiting' }) },
              { label: 'Attention', value: stats.attention, action: () => setRight({ mode: 'list', statusFilter: 'sent', label: 'Need attention' }) },
              { label: 'In progress', value: stats.progress, action: () => setRight({ mode: 'list', statusFilter: 'in_progress', label: 'In progress' }) },
              { label: 'Resolved', value: stats.resolved, action: () => setRight({ mode: 'list', statusFilter: 'resolved', label: 'Resolved' }) },
            ]).map((item) => (
              <button
                key={item.label}
                onClick={item.action}
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

          {/* Emirate split (Abu Dhabi embassy only — sees cross-emirate cases) */}
          {showEmirateSplit && (() => {
            const abuDhabi = inRange.filter((c) => c.reporting_emirate !== 'Other emirates').length
            const other = inRange.length - abuDhabi
            return inRange.length > 0 ? (
              <div className="border-t border-brand-border px-3 py-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-muted">Reporting emirate</p>
                <div className="space-y-1">
                  {([['Abu Dhabi', abuDhabi], ['Other emirates', other]] as const).map(([label, n]) => (
                    <button
                      key={label}
                      onClick={() => setRight({ mode: 'list', label })}
                      className="flex w-full items-center justify-between text-xs hover:text-brand-navy"
                    >
                      <span className="text-brand-muted">{label}</span>
                      <span className="tabular-nums font-medium text-brand-navy">{n}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Type breakdown */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">By type</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {typeBreakdown.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setRight({ mode: 'list', typeFilter: type, label: type })}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-brand-navy/5 ${activeType === type ? 'bg-brand-navy/10' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-brand-navy">{type}</p>
                    <div className="mt-0.5 h-1 rounded-full bg-brand-border">
                      <div className="h-1 rounded-full bg-brand-saffron" style={{ width: `${Math.round((count / maxType) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-brand-muted">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status pipeline */}
          <div className="shrink-0 border-t border-brand-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">Status</p>
            <div className="space-y-0.5">
              {PIPELINE.map(({ key, label }) => {
                const n = statusCounts[key] ?? 0
                return (
                  <button
                    key={key}
                    onClick={() => setRight({ mode: 'list', statusFilter: key, label })}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-brand-navy/5 ${activeStatus === key ? 'bg-brand-navy/10 font-medium' : ''}`}
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

          {/* AWAITING */}
          {right.mode === 'awaiting' && (
            <>
              <div className="shrink-0 border-b border-brand-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-brand-navy">Awaiting response</p>
                  {awaiting.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {awaiting.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-muted">
                  Click any type or status on the left to filter · Click a case to open briefing
                </p>
              </div>
              {awaiting.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-brand-muted">
                  All caught up — no cases awaiting response
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {awaiting.map((c) => <CaseRow key={c.id} c={c} onClick={() => openBriefing(c.id)} />)}
                </div>
              )}
            </>
          )}

          {/* LIST */}
          {right.mode === 'list' && (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-brand-border px-5 py-3">
                <button onClick={goBack} className="rounded p-0.5 text-brand-muted hover:text-brand-navy">
                  <ArrowLeft size={14} />
                </button>
                <p className="text-sm font-semibold text-brand-navy">{right.label}</p>
                <span className="text-xs text-brand-muted">({listCases.length})</span>
              </div>
              {listCases.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-brand-muted">No cases</div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {listCases.map((c) => <CaseRow key={c.id} c={c} onClick={() => openBriefing(c.id)} />)}
                </div>
              )}
            </>
          )}

          {/* BRIEFING */}
          {right.mode === 'briefing' && briefingCase && (
            <Briefing
              c={briefingCase}
              onBack={goBack}
              userFullName={userFullName}
              employerCounts={employerCounts}
            />
          )}
        </div>
      </div>
    </div>
  )
}
