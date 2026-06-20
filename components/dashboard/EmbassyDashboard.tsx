'use client'

import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { StatusBadge } from '@/components/CasesList'
import { CaseSidePanel, type PanelCase } from './CaseSidePanel'

type Range = '7d' | '30d' | '90d' | '1y' | 'all'
type Tab = 'all' | 'attention' | 'progress' | 'resolved'

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']
const RANGE_LABELS: Record<Range, string> = { '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year', all: 'All time' }

const ATTENTION = new Set(['sent', 'need_more_info'])
const PROGRESS = new Set(['acknowledged', 'in_progress'])
const RESOLVED = new Set(['resolved', 'closed'])

const STATUS_PIPELINE: Array<{ key: string; label: string }> = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'sent', label: 'Emailed' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

function ms(days: number) { return days * 86_400_000 }
function daysOpen(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) }
function trunc(s: string, n = 24) { return s.length > n ? s.slice(0, n) + '…' : s }

function trendArrow(curr: number, prev: number, upIsBad?: boolean) {
  if (prev === 0 || curr === prev) return null
  const pct = Math.abs(Math.round(((curr - prev) / prev) * 100))
  const up = curr > prev
  const positive = up !== !!upIsBad
  return { up, pct, positive }
}

function Trend({ curr, prev, upIsBad }: { curr: number; prev: number; upIsBad?: boolean }) {
  const t = trendArrow(curr, prev, upIsBad)
  if (!t) return null
  return (
    <span className={`text-xs ${t.positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {t.up ? '↑' : '↓'} {t.pct}%
    </span>
  )
}

function MetricCard({
  label, value, prev, upIsBad, active, onClick,
}: {
  label: string; value: number; prev: number; upIsBad?: boolean; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col rounded-xl border p-5 text-left transition-all ${
        active
          ? 'border-brand-navy bg-brand-navy text-white'
          : 'border-brand-border bg-brand-card hover:border-brand-navy/30 hover:bg-brand-navy/5'
      }`}
    >
      <span className={`text-xs font-medium tracking-wide ${active ? 'text-white/70' : 'text-brand-muted'}`}>
        {label}
      </span>
      <span className={`mt-2 text-3xl font-light tabular-nums ${active ? 'text-white' : 'text-brand-navy'}`}>
        {value}
      </span>
      <div className="mt-1.5 h-4">
        {prev > 0 && <Trend curr={value} prev={prev} upIsBad={upIsBad} />}
      </div>
    </button>
  )
}

function BarWidget({ title, rows, max }: { title: string; rows: [string, number][]; max: number }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-brand-muted">No data</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(([label, count]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-brand-navy">{trunc(label, 20)}</span>
              <div className="flex-1 rounded-full bg-brand-border/50">
                <div
                  className="h-2 rounded-full bg-brand-saffron transition-all"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs tabular-nums text-brand-muted">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function downloadCSV(rows: PanelCase[]) {
  const headers = [
    'Case ID', 'Name', 'Type', 'Status', 'Reporting emirate',
    'Date of incident', 'Passport', 'EID', 'Phone', 'Employer',
    'Reporter', 'Reporter phone', 'Days open', 'Submitted',
  ]
  const data = rows.map((c) => [
    c.case_id ?? '',
    c.name ?? '',
    c.case_type,
    c.status,
    c.reporting_emirate ?? '',
    c.date_of_incident ?? '',
    c.passport ?? '',
    c.eid ?? '',
    c.phone ?? '',
    c.company_name ?? '',
    c.reporter_name ?? '',
    c.reporter_phone ?? '',
    String(daysOpen(c.created_at)),
    c.created_at.slice(0, 10),
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
  const [tab, setTab] = useState<Tab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const selectedCase = useMemo(
    () => (selectedCaseId ? (cases.find((c) => c.id === selectedCaseId) ?? null) : null),
    [selectedCaseId, cases],
  )

  const cutoff = useMemo(() => (range === 'all' ? 0 : Date.now() - ms(RANGE_DAYS[range])), [range])
  const prevCutoff = useMemo(() => (range === 'all' ? 0 : cutoff - ms(RANGE_DAYS[range])), [range, cutoff])

  const inRange = useMemo(
    () => cases.filter((c) => new Date(c.created_at).getTime() >= cutoff),
    [cases, cutoff],
  )

  const inPrev = useMemo(
    () =>
      range === 'all'
        ? []
        : cases.filter((c) => {
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
  }), [inRange])

  const prev = useMemo(() => ({
    total: inPrev.length,
    attention: inPrev.filter((c) => ATTENTION.has(c.status)).length,
    progress: inPrev.filter((c) => PROGRESS.has(c.status)).length,
    resolved: inPrev.filter((c) => RESOLVED.has(c.status)).length,
  }), [inPrev])

  // Avg resolution time: mean age of resolved/closed cases (upper-bound approximation)
  const avgResolutionDays = useMemo(() => {
    const done = inRange.filter((c) => RESOLVED.has(c.status))
    if (!done.length) return null
    return Math.round(done.reduce((sum, c) => sum + daysOpen(c.created_at), 0) / done.length)
  }, [inRange])

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of inRange) map.set(c.case_type, (map.get(c.case_type) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
  }, [inRange])

  const maxTypeCount = Math.max(1, ...typeBreakdown.map(([, n]) => n))

  const emirateBreakdown = useMemo((): [string, number][] => {
    const ab = inRange.filter((c) => c.reporting_emirate !== 'Other emirates').length
    const du = inRange.filter((c) => c.reporting_emirate === 'Other emirates').length
    return [['Abu Dhabi', ab], ['Other Emirates', du]]
  }, [inRange])

  const pipelineCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of inRange) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [inRange])

  const awaiting = useMemo(
    () =>
      inRange
        .filter((c) => ATTENTION.has(c.status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 8),
    [inRange],
  )

  const listCases = useMemo(() => {
    const byTab = (() => {
      switch (tab) {
        case 'attention': return inRange.filter((c) => ATTENTION.has(c.status))
        case 'progress': return inRange.filter((c) => PROGRESS.has(c.status))
        case 'resolved': return inRange.filter((c) => RESOLVED.has(c.status))
        default: return inRange
      }
    })()
    const q = searchQuery.trim().toLowerCase()
    const searched = q
      ? byTab.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.case_id?.toLowerCase().includes(q) ||
            c.passport?.toLowerCase().includes(q),
        )
      : byTab
    return [...searched].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [inRange, tab, searchQuery])

  function selectCase(id: string) {
    setSelectedCaseId((prev) => (prev === id ? null : id))
  }

  const gridCols = showEmirateSplit ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-7 px-6 py-6">

          {/* Header + date range */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-brand-navy">{emirateName}</h1>
              <p className="mt-0.5 text-sm text-brand-muted">Community welfare cases dashboard</p>
            </div>
            <div className="flex rounded-lg border border-brand-border bg-brand-card p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-all ${
                    range === r
                      ? 'bg-brand-navy font-medium text-white shadow-sm'
                      : 'text-brand-muted hover:text-brand-navy'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Metric cards */}
          <div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="Total cases" value={stats.total} prev={prev.total} active={tab === 'all'} onClick={() => setTab('all')} />
              <MetricCard label="Need attention" value={stats.attention} prev={prev.attention} upIsBad active={tab === 'attention'} onClick={() => setTab('attention')} />
              <MetricCard label="In progress" value={stats.progress} prev={prev.progress} active={tab === 'progress'} onClick={() => setTab('progress')} />
              <MetricCard label="Resolved" value={stats.resolved} prev={prev.resolved} active={tab === 'resolved'} onClick={() => setTab('resolved')} />
            </div>
            {avgResolutionDays !== null && (
              <p className="mt-2.5 text-xs text-brand-muted">
                Avg. time to close (resolved cases):{' '}
                <span className="font-medium text-brand-navy">~{avgResolutionDays} days</span>
              </p>
            )}
          </div>

          {/* Breakdown widgets */}
          <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
            <BarWidget title="Cases by type" rows={typeBreakdown} max={maxTypeCount} />

            {/* Status pipeline */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-muted">Status pipeline</p>
              <div className="space-y-1">
                {STATUS_PIPELINE.map(({ key, label }) => {
                  const n = pipelineCounts[key] ?? 0
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === 'resolved' || key === 'closed') setTab('resolved')
                        else if (key === 'in_progress' || key === 'acknowledged') setTab('progress')
                        else if (key === 'sent' || key === 'need_more_info') setTab('attention')
                        else setTab('all')
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-brand-navy/5"
                    >
                      <span className="text-brand-navy">{label}</span>
                      <span className={`tabular-nums font-medium ${n === 0 ? 'text-brand-muted' : 'text-brand-navy'}`}>{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Reporting emirate — head mission only */}
            {showEmirateSplit && (
              <BarWidget
                title="Reported from"
                rows={emirateBreakdown}
                max={Math.max(1, ...emirateBreakdown.map(([, n]) => n))}
              />
            )}
          </div>

          {/* Awaiting attention */}
          {awaiting.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-700">
                Awaiting response ({awaiting.length})
              </p>
              <div className="divide-y divide-amber-100">
                {awaiting.map((c) => {
                  const age = daysOpen(c.created_at)
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectCase(c.id)}
                      className="flex w-full items-center justify-between py-2.5 text-left hover:bg-amber-100/50"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-brand-muted">{c.case_id ?? '—'}</span>
                        <span className="ml-2 text-sm text-brand-navy">{c.name ?? '—'}</span>
                        <span className="ml-2 text-xs text-brand-muted">{trunc(c.case_type, 20)}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 pl-4">
                        {c.reporter_phone && (
                          <span className="font-mono text-xs text-brand-muted">{c.reporter_phone}</span>
                        )}
                        <StatusBadge status={c.status} />
                        <span
                          className={`w-12 text-right text-xs tabular-nums font-medium ${
                            age >= 14 ? 'text-red-600' : age >= 7 ? 'text-amber-600' : 'text-brand-muted'
                          }`}
                        >
                          {age === 0 ? 'Today' : `${age}d`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Case list */}
          <div className="rounded-xl border border-brand-border bg-brand-card">
            {/* Search + export */}
            <div className="flex items-center gap-3 border-b border-brand-border px-4 py-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2.5 text-brand-muted" />
                <input
                  type="search"
                  placeholder="Search name, case ID, or passport…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-brand-border bg-transparent py-1.5 pl-8 pr-3 text-sm text-brand-navy placeholder:text-brand-muted focus:border-brand-navy focus:outline-none"
                />
              </div>
              <button
                onClick={() => downloadCSV(listCases)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-xs text-brand-muted hover:border-brand-navy hover:text-brand-navy"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-border">
              {(
                [
                  ['all', 'All', stats.total],
                  ['attention', 'Need attention', stats.attention],
                  ['progress', 'In progress', stats.progress],
                  ['resolved', 'Resolved', stats.resolved],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm transition-colors ${
                    tab === key
                      ? 'border-brand-navy font-medium text-brand-navy'
                      : 'border-transparent text-brand-muted hover:text-brand-navy'
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                      tab === key ? 'bg-brand-navy text-white' : 'bg-brand-border text-brand-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Rows */}
            {listCases.length === 0 ? (
              <div className="py-10 text-center text-sm text-brand-muted">
                {searchQuery ? 'No cases match your search' : 'No cases in this filter'}
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {listCases.map((c) => {
                  const age = daysOpen(c.created_at)
                  const isOpen = selectedCaseId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectCase(c.id)}
                      className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-brand-navy/3 ${
                        isOpen ? 'bg-brand-navy/5' : ''
                      }`}
                    >
                      <span className="w-28 shrink-0 font-mono text-xs text-brand-muted">
                        {c.case_id ?? 'Pending'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-brand-navy">{c.name ?? '—'}</span>
                        <span className="ml-2 text-xs text-brand-muted">{trunc(c.case_type, 22)}</span>
                      </div>
                      <StatusBadge status={c.status} />
                      <span
                        className={`w-12 shrink-0 text-right text-xs tabular-nums ${
                          age >= 14 ? 'font-medium text-red-600' : age >= 7 ? 'text-amber-600' : 'text-brand-muted'
                        }`}
                      >
                        {age === 0 ? 'Today' : `${age}d`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Side panel ── */}
      {selectedCase && (
        <CaseSidePanel
          c={selectedCase}
          onClose={() => setSelectedCaseId(null)}
          userFullName={userFullName}
        />
      )}
    </div>
  )
}
