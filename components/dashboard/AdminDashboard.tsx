'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CASE_STATUS_LABELS } from '@/lib/types'
import type { PanelCase } from './CaseSidePanel'
import { ActivityPanel } from './ActivityPanel'
import type { ActivityItem } from './DashboardOverview'

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysOpen(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function getPriority(caseType: string, status: string, createdAt: string) {
  if (['resolved', 'closed'].includes(status)) return 'normal' as const
  const t = caseType.toLowerCase(), age = daysOpen(createdAt)
  if (t.includes('police') || t.includes('detent') || t.includes('arrest') ||
      t.includes('death')  || t.includes('traffick') || t.includes('medical') ||
      t.includes('missing')) return 'critical' as const
  if (status === 'sent') { if (age >= 3) return 'critical' as const; if (age >= 1) return 'high' as const }
  if (t.includes('passport') || t.includes('harass') || t.includes('abscond') ||
      t.includes('exit')     || t.includes('human')  || t.includes('overstay')) return 'high' as const
  if (age >= 21) return 'critical' as const
  if (age >= 14) return 'high' as const
  if (age >= 7)  return 'medium' as const
  return 'normal' as const
}

function sortByPriority(a: PanelCase, b: PanelCase) {
  const order = { critical: 0, high: 1, medium: 2, normal: 3 }
  return order[getPriority(a.case_type, a.status, a.created_at)] -
         order[getPriority(b.case_type, b.status, b.created_at)]
}

function getTypeColor(idx: number): string {
  const palette = ['#1B3A6B', '#2563EB', '#1D9E75', '#EF9F27', '#7F77DD', '#E24B4A', '#378ADD', '#888780']
  return palette[idx % palette.length]
}

// ─── constants ────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  critical: '#E24B4A', high: '#EF9F27', medium: '#EEA82A', normal: '#639922',
}

type Range = '7d' | '30d' | '90d' | '1y' | 'all'
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']
const RANGE_LABEL: Record<Range, string> = { '7d': '7d', '30d': '30d', '90d': '90d', '1y': '1y', all: 'All' }

const STATUS_COLOR: Record<string, string> = {
  submitted: '#444441', sent: '#0C447C', acknowledged: '#3C3489',
  need_more_info: '#633806', in_progress: '#0A3C50', resolved: '#27500A', closed: '#27500A',
}

const PIPELINE_ORDER = ['submitted', 'sent', 'acknowledged', 'need_more_info', 'in_progress', 'resolved']

// ─── component ────────────────────────────────────────────────────────────────

export function AdminDashboard({
  cases,
  pendingApprovals,
  activity,
}: {
  cases: PanelCase[]
  pendingApprovals: number
  activity: ActivityItem[]
}) {
  const [range,            setRange]            = useState<Range>('30d')
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)
  const [showAnalysis,     setShowAnalysis]     = useState(false)

  const cutoff  = useMemo(() => range === 'all' ? 0 : Date.now() - RANGE_DAYS[range] * 86_400_000, [range])
  const inRange = useMemo(() => cases.filter(c => new Date(c.created_at).getTime() >= cutoff), [cases, cutoff])

  // "Action" cases: only need_more_info — embassy has asked for info, admin must follow up with volunteer
  const actionCases = useMemo(() =>
    inRange
      .filter(c => c.status === 'need_more_info')
      .sort(sortByPriority)
      .slice(0, 5),
    [inRange],
  )

  const kpiCounts = useMemo(() => ({
    attention: inRange.filter(c => c.status === 'need_more_info').length,
    open:     inRange.filter(c => !['resolved', 'closed'].includes(c.status)).length,
    needInfo: inRange.filter(c => c.status === 'need_more_info').length,
    resolved: inRange.filter(c => ['resolved', 'closed'].includes(c.status)).length,
  }), [inRange])

  const avgDays = useMemo(() => {
    const done = inRange.filter(c => ['resolved', 'closed'].includes(c.status))
    return done.length ? Math.round(done.reduce((s, c) => s + daysOpen(c.created_at), 0) / done.length) : null
  }, [inRange])

  const statusBreakdown = useMemo(() => {
    const m: Record<string, number> = {}
    inRange.forEach(c => { const k = c.status === 'closed' ? 'resolved' : c.status; m[k] = (m[k] ?? 0) + 1 })
    return PIPELINE_ORDER.filter(s => m[s]).map(s => ({ status: s, count: m[s] }))
  }, [inRange])

  const typeBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    inRange.forEach(c => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [inRange])

  const emirateSplit = useMemo(() => {
    const ad = inRange.filter(c => c.reporting_emirate !== 'Other emirates').length
    return { ad, other: inRange.length - ad }
  }, [inRange])

  const ageBuckets = useMemo(() => {
    const open = inRange.filter(c => !['resolved', 'closed'].includes(c.status))
    return [
      { label: '21+ days',  color: '#E24B4A', n: open.filter(c => daysOpen(c.created_at) >= 21).length },
      { label: '8–20 days', color: '#EF9F27', n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 8  && d < 21 }).length },
      { label: '3–7 days',  color: '#EEA82A', n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 3  && d < 8  }).length },
      { label: '0–2 days',  color: '#639922', n: open.filter(c => daysOpen(c.created_at) < 3).length },
    ]
  }, [inRange])

  const narrative = useMemo(() => {
    const parts: string[] = []
    const waitInfo = inRange.filter(c => c.status === 'need_more_info').length
    if (waitInfo > 0) parts.push(`${waitInfo} case${waitInfo !== 1 ? 's' : ''} awaiting reporter information`)
    if (pendingApprovals > 0) parts.push(`${pendingApprovals} account${pendingApprovals !== 1 ? 's' : ''} pending approval`)
    if (parts.length === 0)   parts.push('All cases on track')
    if (avgDays !== null)     parts.push(`avg resolution ~${avgDays}d`)
    return parts.join(' · ')
  }, [inRange, pendingApprovals, avgDays])

  const maxBucket = Math.max(...ageBuckets.map(b => b.n), 1)
  const maxPipeline = Math.max(...statusBreakdown.map(s => s.count), 1)
  const maxType = typeBreakdown[0]?.[1] ?? 1

  return (
    <div className="space-y-5">

      {/* top bar: narrative + range pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-muted">{narrative}</p>
        <div className="flex items-center gap-1 rounded-lg border border-brand-border bg-brand-card p-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${range === r ? 'bg-brand-navy text-white' : 'text-brand-muted hover:text-brand-navy'}`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* pending approvals alert */}
      {pendingApprovals > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="text-sm font-semibold text-amber-900">
            {pendingApprovals} volunteer account{pendingApprovals !== 1 ? 's' : ''} waiting for approval
          </span>
          <Link href="/admin?tab=access" className="text-xs font-medium text-amber-800 underline">
            Review →
          </Link>
        </div>
      )}

      {/* HERO: action queue */}
      <div className={`rounded-xl border-2 p-4 ${kpiCounts.attention > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${kpiCounts.attention > 0 ? 'text-red-600' : 'text-green-700'}`}>
              Cases needing action
            </p>
            <p className={`mt-0.5 text-5xl font-bold tabular-nums leading-none ${kpiCounts.attention > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {kpiCounts.attention}
            </p>
          </div>
          {kpiCounts.attention === 0 && <span className="mt-1 text-2xl text-green-600">✓</span>}
        </div>

        {actionCases.length > 0 && (
          <div className="space-y-1.5">
            {actionCases.map(c => {
              const priority   = getPriority(c.case_type, c.status, c.created_at)
              const days       = daysOpen(c.created_at)
              const isExpanded = expandedActionId === c.id
              const summary    = c.case_brief ?? c.polished_summary
              return (
                <div key={c.id} className="overflow-hidden rounded-lg bg-white/80 transition-colors hover:bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedActionId(isExpanded ? null : c.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PRIORITY_DOT[priority] }} />
                    <span className="font-medium text-brand-navy">{c.name ?? '—'}</span>
                    <span className="hidden truncate text-xs text-brand-muted sm:block">{c.case_type}</span>
                    <span
                      className="shrink-0 rounded-full border border-brand-border/30 bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-brand-muted"
                    >
                      {CASE_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-brand-muted">{c.case_id ?? '—'}</span>
                    <span className={`w-8 text-right text-xs font-semibold tabular-nums ${days >= 7 ? 'text-red-600' : days >= 3 ? 'text-amber-600' : 'text-brand-muted'}`}>
                      {days === 0 ? 'Today' : `${days}d`}
                    </span>
                    <span className="ml-1 text-[10px] text-brand-muted/60">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 border-t border-brand-border/40 px-3 pb-3 pt-2.5 text-xs">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-brand-muted">
                        {c.assigned_emirate && <span><span className="font-medium text-brand-navy">Emirate:</span> {c.assigned_emirate}</span>}
                        {c.date_of_incident && <span><span className="font-medium text-brand-navy">Incident:</span> {c.date_of_incident}</span>}
                        {c.gender          && <span><span className="font-medium text-brand-navy">Gender:</span> {c.gender}</span>}
                        {c.age  != null    && <span><span className="font-medium text-brand-navy">Age:</span> {c.age}</span>}
                        {c.passport        && <span><span className="font-medium text-brand-navy">Passport:</span> {c.passport}</span>}
                        {c.phone           && <span><span className="font-medium text-brand-navy">Phone:</span> {c.phone}</span>}
                        {c.company_name    && <span><span className="font-medium text-brand-navy">Employer:</span> {c.company_name}</span>}
                        {c.reporter_name   && <span><span className="font-medium text-brand-navy">Reporter:</span> {c.reporter_name}</span>}
                      </div>
                      {summary && (
                        <p className="line-clamp-3 leading-relaxed text-brand-muted">{summary}</p>
                      )}
                      <a href={`/cases/${c.id}`} className="font-medium text-brand-navy-light underline hover:text-brand-navy">
                        View full case →
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* supporting KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-brand-border bg-brand-card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy">Total open</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy tabular-nums">{kpiCounts.open}</p>
          <p className="text-[10px] text-brand-muted">active cases this period</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Info Requested</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">{kpiCounts.needInfo}</p>
          <p className="text-[10px] text-brand-muted">awaiting reporter info</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Resolved/Closed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{kpiCounts.resolved}</p>
          <p className="text-[10px] text-brand-muted">this period</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy">Avg resolution</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy tabular-nums">{avgDays !== null ? `~${avgDays}d` : '—'}</p>
          <p className="text-[10px] text-brand-muted">resolved cases</p>
        </div>
      </div>

      {/* charts + activity */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* status pipeline */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">Status pipeline</p>
          <div className="space-y-2.5">
            {statusBreakdown.map(({ status, count }) => (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-brand-muted">{CASE_STATUS_LABELS[status] ?? status}</span>
                  <span className="font-semibold tabular-nums" style={{ color: STATUS_COLOR[status] }}>{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-navy/5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.round((count / maxPipeline) * 100)}%`, background: STATUS_COLOR[status] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* case types */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">Case types</p>
          <div className="space-y-2.5">
            {typeBreakdown.slice(0, 7).map(([type, count], idx) => (
              <div key={type}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="truncate text-brand-muted">{type}</span>
                  <span className="ml-2 shrink-0 font-semibold tabular-nums" style={{ color: getTypeColor(idx) }}>{count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-navy/5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.round((count / maxType) * 100)}%`, background: getTypeColor(idx) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* emirate split */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">Emirate split</p>
          <div className="flex items-end gap-4">
            <div className="flex-1 text-center">
              <p className="text-3xl font-bold tabular-nums text-brand-navy">{emirateSplit.ad}</p>
              <p className="text-[11px] text-brand-muted">Abu Dhabi</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-3xl font-bold tabular-nums text-brand-navy">{emirateSplit.other}</p>
              <p className="text-[11px] text-brand-muted">Dubai / Other</p>
            </div>
          </div>
          {inRange.length > 0 && (
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
              <div className="h-full bg-brand-navy transition-all"     style={{ width: `${Math.round((emirateSplit.ad / inRange.length) * 100)}%` }} />
              <div className="h-full flex-1 bg-brand-navy/25" />
            </div>
          )}
        </div>

        {/* recent activity */}
        <ActivityPanel items={activity} />

      </div>

      {/* collapsible analysis */}
      <div>
        <button
          onClick={() => setShowAnalysis(v => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-brand-border bg-brand-card/50 px-4 py-2.5 text-xs font-medium text-brand-muted hover:bg-brand-card"
        >
          <span>Detailed analysis — case age &amp; type breakdown</span>
          <span>{showAnalysis ? '▲ Hide' : '▼ Show detailed analysis'}</span>
        </button>

        {showAnalysis && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">Open case age</p>
              <div className="space-y-2">
                {ageBuckets.map(b => (
                  <div key={b.label} className="flex items-center gap-3 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
                    <span className="w-20 shrink-0 text-brand-muted">{b.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-brand-navy/5">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.round((b.n / maxBucket) * 100)}%`, background: b.color }} />
                    </div>
                    <span className="w-5 text-right font-semibold tabular-nums" style={{ color: b.color }}>{b.n}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">All case types</p>
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 180 }}>
                {typeBreakdown.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="truncate text-brand-muted">{type}</span>
                    <span className="ml-3 shrink-0 font-semibold tabular-nums text-brand-navy">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
