'use client'

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

function ms(days: number) {
  return days * 86_400_000
}
function daysOpen(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}
function trunc(s: string, n = 24) {
  return s.length > n ? s.slice(0, n) + '…' : s
}
function trend(curr: number, prev: number) {
  if (prev === 0 || curr === prev) return null
  const pct = Math.abs(Math.round(((curr - prev) / prev) * 100))
  return { up: curr > prev, pct }
}

function Trend({ curr, prev, upIsBad }: { curr: number; prev: number; upIsBad?: boolean }) {
  const t = trend(curr, prev)
  if (!t) return null
  const positive = t.up !== !!upIsBad
  return (
    <span className={`text-xs ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {t.up ? '↑' : '↓'} {t.pct}%
    </span>
  )
}

function MetricCard({
  label,
  value,
  prev,
  upIsBad,
  active,
  onClick,
}: {
  label: string
  value: number
  prev: number
  upIsBad?: boolean
  active?: boolean
  onClick?: () => void
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

export function EmbassyDashboard({
  cases,
  userFullName,
  emirateName,
}: {
  cases: PanelCase[]
  userFullName: string
  emirateName: string
}) {
  const [range, setRange] = useState<Range>('30d')
  const [tab, setTab] = useState<Tab>('all')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const selectedCase = useMemo(
    () => (selectedCaseId ? (cases.find((c) => c.id === selectedCaseId) ?? null) : null),
    [selectedCaseId, cases],
  )

  const cutoff = useMemo(() => {
    if (range === 'all') return 0
    return Date.now() - ms(RANGE_DAYS[range])
  }, [range])

  const prevCutoff = useMemo(() => {
    if (range === 'all') return 0
    return cutoff - ms(RANGE_DAYS[range])
  }, [range, cutoff])

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

  const stats = useMemo(
    () => ({
      total: inRange.length,
      attention: inRange.filter((c) => ATTENTION.has(c.status)).length,
      progress: inRange.filter((c) => PROGRESS.has(c.status)).length,
      resolved: inRange.filter((c) => RESOLVED.has(c.status)).length,
    }),
    [inRange],
  )

  const prev = useMemo(
    () => ({
      total: inPrev.length,
      attention: inPrev.filter((c) => ATTENTION.has(c.status)).length,
      progress: inPrev.filter((c) => PROGRESS.has(c.status)).length,
      resolved: inPrev.filter((c) => RESOLVED.has(c.status)).length,
    }),
    [inPrev],
  )

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of inRange) map.set(c.case_type, (map.get(c.case_type) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
  }, [inRange])

  const maxCount = Math.max(1, ...typeBreakdown.map(([, n]) => n))

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
    const base = (() => {
      switch (tab) {
        case 'attention':
          return inRange.filter((c) => ATTENTION.has(c.status))
        case 'progress':
          return inRange.filter((c) => PROGRESS.has(c.status))
        case 'resolved':
          return inRange.filter((c) => RESOLVED.has(c.status))
        default:
          return inRange
      }
    })()
    return [...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [inRange, tab])

  function selectCase(id: string) {
    setSelectedCaseId((prev) => (prev === id ? null : id))
  }

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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              label="Total cases"
              value={stats.total}
              prev={prev.total}
              active={tab === 'all'}
              onClick={() => setTab('all')}
            />
            <MetricCard
              label="Need attention"
              value={stats.attention}
              prev={prev.attention}
              upIsBad
              active={tab === 'attention'}
              onClick={() => setTab('attention')}
            />
            <MetricCard
              label="In progress"
              value={stats.progress}
              prev={prev.progress}
              active={tab === 'progress'}
              onClick={() => setTab('progress')}
            />
            <MetricCard
              label="Resolved"
              value={stats.resolved}
              prev={prev.resolved}
              active={tab === 'resolved'}
              onClick={() => setTab('resolved')}
            />
          </div>

          {/* Type breakdown + Status pipeline */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Type breakdown */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-muted">
                Cases by type
              </p>
              {typeBreakdown.length === 0 ? (
                <p className="text-sm text-brand-muted">No cases in this period</p>
              ) : (
                <div className="space-y-2.5">
                  {typeBreakdown.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-xs text-brand-navy">{trunc(type, 20)}</span>
                      <div className="flex-1 rounded-full bg-brand-border/50">
                        <div
                          className="h-2 rounded-full bg-brand-saffron transition-all"
                          style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs tabular-nums text-brand-muted">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status pipeline */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-brand-muted">
                Status pipeline
              </p>
              <div className="space-y-2">
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
                      <span className={`tabular-nums font-medium ${n === 0 ? 'text-brand-muted' : 'text-brand-navy'}`}>
                        {n}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
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
                      <div className="flex shrink-0 items-center gap-2 pl-4">
                        <StatusBadge status={c.status} />
                        <span
                          className={`w-16 text-right text-xs tabular-nums font-medium ${
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
              <div className="py-10 text-center text-sm text-brand-muted">No cases in this filter</div>
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
