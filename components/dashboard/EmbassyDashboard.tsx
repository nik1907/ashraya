'use client'

import { ChevronRight, Download, MessageCircle, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'
import type { PanelCase } from './CaseSidePanel'

// ─── types ────────────────────────────────────────────────────────────────────

type Range    = '7d' | '30d' | '90d' | '1y' | 'all'
type Priority = 'critical' | 'high' | 'medium' | 'normal'
type KpiKey   = 'attention' | 'critical_p' | 'progress' | 'resolved'

// ─── constants ────────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']

const EMBASSY_LABEL: Record<string, string> = {
  submitted:      'Pending',
  sent:           'Received',
  acknowledged:   'Acknowledged',
  need_more_info: 'Needs info',
  in_progress:    'In progress',
  resolved:       'Resolved',
  closed:         'Closed',
}

const STATUS_DOT: Record<string, string> = {
  sent:           '#378ADD',
  acknowledged:   '#7F77DD',
  need_more_info: '#D4537E',
  in_progress:    '#EF9F27',
  submitted:      '#888780',
  resolved:       '#639922',
  closed:         '#888780',
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  sent:           { bg: '#E6F1FB', text: '#0C447C' },
  acknowledged:   { bg: '#EEEDFE', text: '#3C3489' },
  need_more_info: { bg: '#FBEAF0', text: '#4B1528' },
  in_progress:    { bg: '#FAEEDA', text: '#633806' },
  submitted:      { bg: '#F1EFE8', text: '#444441' },
  resolved:       { bg: '#EAF3DE', text: '#27500A' },
  closed:         { bg: '#F1EFE8', text: '#444441' },
}

const PIPELINE_ORDER = ['sent', 'acknowledged', 'need_more_info', 'in_progress', 'submitted', 'resolved', 'closed']

const PRIORITY_DOT: Record<Priority, string> = {
  critical: '#E24B4A',
  high:     '#EF9F27',
  medium:   '#EEA82A',
  normal:   '#639922',
}

const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, normal: 3 }

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function getPriority(caseType: string, status: string, createdAt: string): Priority {
  const t   = caseType.toLowerCase()
  const age = daysOpen(createdAt)
  if (
    t.includes('police') || t.includes('detent') || t.includes('arrest') ||
    t.includes('death')  || t.includes('traffick') || t.includes('medical') ||
    t.includes('missing')
  ) return 'critical'
  if (status === 'sent') {
    if (age >= 3) return 'critical'
    if (age >= 1) return 'high'
  }
  if (
    t.includes('passport') || t.includes('harass') || t.includes('abscond') ||
    t.includes('exit')     || t.includes('human')  || t.includes('overstay')
  ) return 'high'
  if (age >= 21) return 'critical'
  if (age >= 14) return 'high'
  if (age >= 7)  return 'medium'
  return 'normal'
}

function getTypeColor(caseType: string): string {
  const t = caseType.toLowerCase()
  if (t.includes('police') || t.includes('detent') || t.includes('death') || t.includes('traffick')) return '#E24B4A'
  if (t.includes('harass') || t.includes('employer') || t.includes('salary') || t.includes('wage'))  return '#1D9E75'
  if (t.includes('missing'))                                                                           return '#7F77DD'
  if (t.includes('overstay') || t.includes('illegal'))                                                return '#EF9F27'
  if (t.includes('abscond'))                                                                           return '#378ADD'
  if (t.includes('passport'))                                                                          return '#EEA82A'
  if (t.includes('exit') || t.includes('amnesty'))                                                    return '#888780'
  return '#B4B2A9'
}

function toWhatsApp(phone: string | null): string | null {
  if (!phone) return null
  const d = phone.replace(/[^0-9]/g, '')
  if (d.length < 7) return null
  if (d.startsWith('971')) return `https://wa.me/${d}`
  if (d.startsWith('0'))   return `https://wa.me/971${d.slice(1)}`
  return `https://wa.me/971${d}`
}

function toBullets(c: PanelCase): string[] {
  if (c.case_brief) {
    return c.case_brief.split('\n').map(s => s.trim()).filter(s => s.length > 10)
  }
  if (!c.polished_summary) return []
  const parts = c.polished_summary.split(/\n{2,}/).map(s => s.trim()).filter(s => s.length > 30)
  if (parts.length >= 2) return parts.slice(0, 3)
  return c.polished_summary
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30)
    .slice(0, 3)
}

function downloadCSV(rows: PanelCase[]) {
  const headers = ['Case ID', 'Name', 'Type', 'Status', 'Outcome', 'Reporting emirate', 'Days open', 'Submitted']
  const data = rows.map(c => [
    c.case_id ?? '', c.name ?? '', c.case_type,
    EMBASSY_LABEL[c.status] ?? c.status, c.outcome ?? '',
    c.reporting_emirate ?? '', String(daysOpen(c.created_at)), c.created_at.slice(0, 10),
  ])
  const csv = [headers, ...data]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `cases-${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── small components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { bg, text } = STATUS_STYLE[status] ?? { bg: '#F1EFE8', text: '#444441' }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap" style={{ background: bg, color: text }}>
      {EMBASSY_LABEL[status] ?? status}
    </span>
  )
}

function PriorDot({ caseType, status, createdAt }: { caseType: string; status: string; createdAt: string }) {
  const p = getPriority(caseType, status, createdAt)
  return (
    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT[p] }} title={p} />
  )
}

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return null
  const wa = toWhatsApp(phone)
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[11px]">{phone}</span>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
          <MessageCircle size={11} />
        </a>
      )}
    </span>
  )
}

// ─── case briefing panel ──────────────────────────────────────────────────────

function CaseBriefing({
  c,
  userFullName,
  employerCounts,
  showStatusForm = true,
}: {
  c: PanelCase
  userFullName: string
  employerCounts: Map<string, number>
  showStatusForm?: boolean
}) {
  const bullets  = toBullets(c)
  const age      = daysOpen(c.created_at)
  const priority = getPriority(c.case_type, c.status, c.created_at)
  const empCount = c.company_name ? (employerCounts.get(c.company_name) ?? 0) : 0

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge status={c.status} />
          <span className="text-[10px] font-medium" style={{ color: PRIORITY_DOT[priority] }}>{priority}</span>
          <span className={`text-[11px] ${age >= 7 ? 'text-red-600 font-medium' : 'text-brand-muted'}`}>
            {age === 0 ? 'Today' : `${age}d open`}
          </span>
        </div>
        <p className="font-mono text-[10px] text-brand-muted mb-1">{c.case_id ?? 'Pending'}</p>
        <p className="text-sm font-medium text-brand-navy">{c.name ?? '—'}</p>
        <p className="text-[11px] text-brand-muted">{c.case_type}</p>
      </div>

      {/* Situation bullets */}
      <div className="rounded-xl border border-brand-border bg-brand-bg p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-2">Situation</p>
        {bullets.length > 0 ? (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-navy">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-saffron flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-brand-muted italic">AI brief not yet generated — resubmit case to generate.</p>
        )}
      </div>

      {/* Identity + Reporter */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-brand-border p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1.5">Identity</p>
          <div className="space-y-1 text-brand-navy">
            {c.passport && <p><span className="text-brand-muted">Passport </span>{c.passport}</p>}
            {c.eid      && <p><span className="text-brand-muted">EID </span>{c.eid}</p>}
            {c.phone    && <PhoneLink phone={c.phone} />}
            {c.company_name && (
              <p className="flex items-center gap-1 flex-wrap">
                <span className="text-brand-muted">Employer</span>
                {empCount >= 3 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">⚠ {empCount} cases</span>
                )}
              </p>
            )}
            {c.company_name && <p className="truncate">{c.company_name}</p>}
            {!c.passport && !c.eid && !c.phone && <p className="text-brand-muted">—</p>}
          </div>
        </div>
        <div className="rounded-xl border border-brand-border p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1.5">Reported by</p>
          <div className="space-y-1 text-brand-navy">
            {c.reporter_name  && <p className="font-medium">{c.reporter_name}</p>}
            {c.reporter_phone && <PhoneLink phone={c.reporter_phone} />}
            {!c.reporter_name && <p className="text-brand-muted">—</p>}
          </div>
        </div>
      </div>

      {/* Resolution (if resolved/closed) */}
      {(c.outcome || c.resolved_by || c.resolution_note) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Resolution</p>
          {c.outcome         && <p className="font-medium text-emerald-800">{c.outcome}</p>}
          {c.resolved_by     && <p className="text-emerald-700">By {c.resolved_by}</p>}
          {c.resolution_note && <p className="text-emerald-600 italic mt-1">{c.resolution_note}</p>}
        </div>
      )}

      {/* Status form */}
      {showStatusForm && (
        <div className="rounded-xl border border-brand-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-2">Update status</p>
          <CaseStatusForm
            caseId={c.id}
            current={c.status}
            options={EMBASSY_STATUS_OPTIONS}
            defaultHandledBy={userFullName}
          />
        </div>
      )}

      <Link href={`/cases/${c.id}`} className="text-[11px] text-brand-navy-light underline">
        View full case & attachments →
      </Link>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

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
  const [range,      setRange]      = useState<Range>('30d')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [openKpi,    setOpenKpi]    = useState<KpiKey | null>(null)
  const [kpiCase,    setKpiCase]    = useState<string | null>(null)

  // ── date-filtered cases (updates everything) ────────────────────────────────
  const cutoff = useMemo(
    () => range === 'all' ? 0 : Date.now() - RANGE_DAYS[range] * 86_400_000,
    [range],
  )
  const inRange = useMemo(
    () => cases.filter(c => new Date(c.created_at).getTime() >= cutoff),
    [cases, cutoff],
  )

  // ── kpi counts ──────────────────────────────────────────────────────────────
  const kpiCounts = useMemo(() => ({
    attention:  inRange.filter(c => ['sent', 'submitted', 'need_more_info'].includes(c.status)).length,
    critical_p: inRange.filter(c => getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    progress:   inRange.filter(c => ['acknowledged', 'in_progress'].includes(c.status)).length,
    resolved:   inRange.filter(c => ['resolved', 'closed'].includes(c.status)).length,
  }), [inRange])

  // ── cases in the open kpi dropdown (stays open + refreshes on range change) ─
  const kpiCases = useMemo(() => {
    if (!openKpi) return []
    return inRange.filter(c => {
      if (openKpi === 'attention')  return ['sent', 'submitted', 'need_more_info'].includes(c.status)
      if (openKpi === 'critical_p') return getPriority(c.case_type, c.status, c.created_at) === 'critical'
      if (openKpi === 'progress')   return ['acknowledged', 'in_progress'].includes(c.status)
      if (openKpi === 'resolved')   return ['resolved', 'closed'].includes(c.status)
      return false
    }).sort((a, b) =>
      PRIORITY_ORDER[getPriority(a.case_type, a.status, a.created_at)] -
      PRIORITY_ORDER[getPriority(b.case_type, b.status, b.created_at)],
    )
  }, [inRange, openKpi])

  // ── status counts filtered by type (updates when type clicked or range changes)
  const statusCounts = useMemo(() => {
    const src = typeFilter ? inRange.filter(c => c.case_type === typeFilter) : inRange
    const m: Record<string, number> = {}
    src.forEach(c => { m[c.status] = (m[c.status] ?? 0) + 1 })
    return m
  }, [inRange, typeFilter])
  const maxStatus = Math.max(1, ...PIPELINE_ORDER.map(k => statusCounts[k] ?? 0))

  // ── type breakdown ──────────────────────────────────────────────────────────
  const typeBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    inRange.forEach(c => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [inRange])
  const maxType = Math.max(1, ...typeBreakdown.map(([, n]) => n))

  // ── emirate split ───────────────────────────────────────────────────────────
  const emirateSplit = useMemo(() => {
    const ad = inRange.filter(c => c.reporting_emirate !== 'Other emirates').length
    return { ad, other: inRange.length - ad }
  }, [inRange])

  // ── case age buckets (open only) ────────────────────────────────────────────
  const ageBuckets = useMemo(() => {
    const open = inRange.filter(c => !['resolved', 'closed'].includes(c.status))
    return [
      { label: '21+ days — critical SLA', color: '#E24B4A', n: open.filter(c => daysOpen(c.created_at) >= 21).length },
      { label: '8–20 days',               color: '#EF9F27', n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 8  && d < 21 }).length },
      { label: '3–7 days',                color: '#EEA82A', n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 3  && d < 8  }).length },
      { label: '0–2 days — fresh',        color: '#639922', n: open.filter(c => daysOpen(c.created_at) < 3).length },
    ]
  }, [inRange])
  const maxAge = Math.max(1, ...ageBuckets.map(b => b.n))

  // ── employer repeat-offender map ────────────────────────────────────────────
  const employerCounts = useMemo(() => {
    const m = new Map<string, number>()
    cases.forEach(c => { if (c.company_name) m.set(c.company_name, (m.get(c.company_name) ?? 0) + 1) })
    return m
  }, [cases])

  const criticalCount = useMemo(
    () => inRange.filter(c => getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    [inRange],
  )

  const avgDays = useMemo(() => {
    const done = inRange.filter(c => ['resolved', 'closed'].includes(c.status))
    if (!done.length) return null
    return Math.round(done.reduce((s, c) => s + daysOpen(c.created_at), 0) / done.length)
  }, [inRange])

  const kpiSelectedCase = kpiCase ? (cases.find(c => c.id === kpiCase) ?? null) : null

  function toggleKpi(key: KpiKey) {
    if (openKpi === key) { setOpenKpi(null); setKpiCase(null) }
    else                 { setOpenKpi(key);  setKpiCase(null) }
  }

  function changeRange(r: Range) {
    setRange(r)
    setKpiCase(null)
  }

  const KPI_DEFS: { key: KpiKey; label: string; valueColor: string }[] = [
    { key: 'attention',  label: 'Need action', valueColor: 'var(--color-text-danger)'  },
    { key: 'critical_p', label: 'Critical',    valueColor: 'var(--color-text-danger)'  },
    { key: 'progress',   label: 'In progress', valueColor: 'var(--color-text-warning)' },
    { key: 'resolved',   label: 'Resolved',    valueColor: 'var(--color-text-success)' },
  ]

  return (
    <div className="flex flex-col">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-border bg-brand-card px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brand-navy">{emirateName}</span>
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">
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
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => changeRange(r)}
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

      <div className="flex flex-col gap-4 p-4">

        {/* ── Data story ── */}
        <div className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-bg px-4 py-3">
          <div className="w-0.5 self-stretch rounded-full bg-brand-saffron flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1">Summary · {range === 'all' ? 'all time' : `last ${range}`}</p>
            <p className="text-sm text-brand-navy leading-relaxed">
              {kpiCounts.attention > 0
                ? `${kpiCounts.attention} case${kpiCounts.attention !== 1 ? 's' : ''} awaiting response · ${kpiCounts.critical_p} critical`
                : 'All cases actioned — nothing awaiting response'}
              {avgDays !== null ? ` · Avg resolution ~${avgDays}d` : ''}
              {` · ${inRange.length} total cases`}
            </p>
          </div>
        </div>

        {/* ── KPI row + accordion ── */}
        <div>
          <div className="grid grid-cols-5 gap-2">
            {KPI_DEFS.map(d => {
              const count = kpiCounts[d.key]
              const isOn  = openKpi === d.key
              return (
                <button
                  key={d.key}
                  onClick={() => toggleKpi(d.key)}
                  className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                    isOn
                      ? 'border-brand-navy bg-brand-navy'
                      : 'border-brand-border bg-brand-card hover:border-brand-navy/40'
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-wider ${isOn ? 'text-white/70' : 'text-brand-muted'}`}>{d.label}</span>
                  <span
                    className="text-2xl font-semibold tabular-nums leading-tight mt-1"
                    style={{ color: isOn ? '#fff' : d.valueColor }}
                  >
                    {count}
                  </span>
                  <span className={`text-[10px] mt-1 ${isOn ? 'text-white/50' : 'text-brand-muted'}`}>
                    {isOn ? 'click to close' : count > 0 ? 'click to view ↓' : 'none'}
                  </span>
                </button>
              )
            })}

            {/* Avg resolution — not clickable */}
            <div className="flex flex-col rounded-xl border border-brand-border bg-brand-card p-3">
              <span className="text-[10px] uppercase tracking-wider text-brand-muted">Avg resolution</span>
              <span className="text-xl font-semibold tabular-nums leading-tight mt-1 text-emerald-600">
                {avgDays !== null ? `~${avgDays}d` : '—'}
              </span>
              <span className="text-[10px] text-brand-muted mt-1">across resolved</span>
            </div>
          </div>

          {/* ── Accordion dropdown ── */}
          {openKpi && (
            <div className="mt-2 flex rounded-xl border border-brand-border overflow-hidden" style={{ minHeight: 240 }}>

              {/* Left — case list */}
              <div className="flex w-[42%] flex-col border-r border-brand-border">
                <div className="flex items-center justify-between border-b border-brand-border bg-brand-bg px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                    {KPI_DEFS.find(d => d.key === openKpi)?.label} · {kpiCases.length} case{kpiCases.length !== 1 ? 's' : ''}
                    {range !== 'all' && <span className="font-normal"> · {range}</span>}
                  </span>
                  <button
                    onClick={() => { setOpenKpi(null); setKpiCase(null) }}
                    className="rounded p-0.5 text-brand-muted hover:text-brand-navy"
                    aria-label="Close"
                  >
                    <X size={12} />
                  </button>
                </div>

                {kpiCases.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-brand-muted italic">
                    No cases in this period
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {kpiCases.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setKpiCase(prev => prev === c.id ? null : c.id)}
                        className={`flex w-full items-center gap-2 border-b border-brand-border px-3 py-2.5 text-left transition-colors hover:bg-brand-navy/5 ${kpiCase === c.id ? 'bg-brand-navy/10' : ''}`}
                      >
                        <PriorDot caseType={c.case_type} status={c.status} createdAt={c.created_at} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-brand-navy">{c.name ?? '—'}</p>
                          <p className="truncate text-[11px] text-brand-muted">{c.case_type}</p>
                        </div>
                        <StatusBadge status={c.status} />
                        <ChevronRight size={12} className="flex-shrink-0 text-brand-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right — briefing */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {kpiSelectedCase ? (
                  <CaseBriefing
                    c={kpiSelectedCase}
                    userFullName={userFullName}
                    employerCounts={employerCounts}
                    showStatusForm={true}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-brand-muted">
                    <ChevronRight size={20} />
                    <p className="text-sm">Select a case to view briefing</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Type breakdown */}
          <div className="col-span-2 rounded-xl border border-brand-border bg-brand-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Cases by type <span className="normal-case font-normal text-[9px]">· click to filter status pipeline</span>
              </p>
              {typeFilter && (
                <button onClick={() => setTypeFilter(null)} className="text-[10px] text-brand-muted hover:text-brand-navy">
                  × clear filter
                </button>
              )}
            </div>
            {typeBreakdown.length === 0 ? (
              <p className="text-sm text-brand-muted italic">No cases in this period</p>
            ) : (
              <div className="space-y-1.5">
                {typeBreakdown.map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(f => f === type ? null : type)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      typeFilter === type
                        ? 'bg-brand-navy/10 ring-1 ring-brand-navy/20'
                        : 'hover:bg-brand-navy/5'
                    }`}
                  >
                    <span className="w-[160px] flex-shrink-0 truncate text-[11px] text-brand-navy">{type}</span>
                    <div className="flex-1 overflow-hidden rounded-full h-1.5 bg-brand-border">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width:      `${Math.round(count / maxType * 100)}%`,
                          background: getTypeColor(type),
                        }}
                      />
                    </div>
                    <span className="w-5 flex-shrink-0 text-right text-[11px] font-medium tabular-nums text-brand-navy">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status pipeline (dynamic) */}
          <div className="rounded-xl border border-brand-border bg-brand-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Status pipeline</p>
              {typeFilter && (
                <span className="max-w-[100px] truncate text-[9px] text-brand-navy">{typeFilter}</span>
              )}
            </div>
            <div className="space-y-2">
              {PIPELINE_ORDER.filter(k => statusCounts[k]).map(k => {
                const n   = statusCounts[k] ?? 0
                const dot = STATUS_DOT[k] ?? '#888'
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                    <span className="w-[84px] flex-shrink-0 text-[11px] text-brand-navy">{EMBASSY_LABEL[k] ?? k}</span>
                    <div className="flex-1 overflow-hidden rounded-full h-1.5 bg-brand-border">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round(n / maxStatus * 100)}%`, background: dot }}
                      />
                    </div>
                    <span className="w-5 flex-shrink-0 text-right text-[11px] font-medium tabular-nums text-brand-navy">{n}</span>
                  </div>
                )
              })}
              {!PIPELINE_ORDER.some(k => statusCounts[k]) && (
                <p className="text-sm text-brand-muted italic">No cases</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Analysis row ── */}
        <div className={`grid gap-4 ${showEmirateSplit ? 'grid-cols-2' : 'grid-cols-1'}`}>

          {/* Emirate split (Abu Dhabi only) */}
          {showEmirateSplit && (
            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Reporting emirate</p>
              <div className="space-y-2">
                {[
                  { label: 'Abu Dhabi',       n: emirateSplit.ad,    color: '#378ADD' },
                  { label: 'Other emirates',   n: emirateSplit.other, color: '#7F77DD' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-[12px] text-brand-navy">
                      <span>{row.label}</span>
                      <span className="font-medium tabular-nums">
                        {row.n} · {inRange.length ? Math.round(row.n / inRange.length * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width:      `${inRange.length ? Math.round(row.n / inRange.length * 100) : 0}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-brand-muted pt-1">
                  Dubai-routed cases CC'd here appear under Other emirates
                </p>
              </div>
            </div>
          )}

          {/* Case age */}
          <div className="rounded-xl border border-brand-border bg-brand-card p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Case age — open cases only</p>
            <div className="space-y-2">
              {ageBuckets.map(b => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-brand-navy">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
                      {b.label}
                    </span>
                    <span className="font-medium tabular-nums">{b.n}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round(b.n / maxAge * 100)}%`, background: b.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alerts footer ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[12px] text-brand-muted">
          <span className="font-medium" style={{ color: '#A32D2D' }}>Alerts</span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
              {criticalCount} critical case{criticalCount !== 1 ? 's' : ''} in period
            </span>
          )}
          {(() => {
            const repeat = [...employerCounts.entries()].filter(([, n]) => n >= 3)
            return repeat.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                {repeat.length} repeat employer{repeat.length !== 1 ? 's' : ''} flagged (3+ cases)
              </span>
            ) : null
          })()}
          <span className="ml-auto">
            <Link href="/cases" className="text-[11px] text-brand-navy-light underline">
              View all cases in admin →
            </Link>
          </span>
        </div>

      </div>
    </div>
  )
}
