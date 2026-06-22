'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { daysOpen, getPriority, PRIORITY_DOT, sortByPriority } from '@/lib/caseUtils'
import { SignalQuadrant } from './SignalQuadrant'
import type { PanelCase } from './CaseSidePanel'

// ─── types & constants ────────────────────────────────────────────────────────

type Range = '1d' | '7d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all'

const RANGE_DAYS: Record<Range, number> = {
  '1d': 1, '7d': 7, '1w': 7, '1m': 30, '3m': 90,
  '6m': 180, '1y': 365, '5y': 1825, 'all': Infinity,
}
const RANGES: Range[] = ['1d', '7d', '1m', '3m', '6m', '1y', '5y', 'all']
const RANGE_LABEL: Record<Range, string> = {
  '1d': '1D', '7d': '7D', '1w': '1W', '1m': '1M', '3m': '3M',
  '6m': '6M', '1y': '1Y', '5y': '5Y', 'all': 'ALL',
}

type VitalKey = 'openCases' | 'crisisSignals' | 'avgDaysOpen' | 'resolutionRate' | 'employerAlerts'

const VITAL_DEFS: {
  key: VitalKey; label: string; subtitle: string; valueColor: string
  goodDir: 'up' | 'down'; suffix?: string; fixedWindow?: string
}[] = [
  { key: 'openCases',      label: 'Open Cases',       subtitle: 'Both emirates',            valueColor: '#0b2545', goodDir: 'down' },
  { key: 'crisisSignals',  label: 'Crisis Signals',   subtitle: 'Critical · open · 30d',    valueColor: '#E24B4A', goodDir: 'down', fixedWindow: '30d' },
  { key: 'avgDaysOpen',    label: 'Avg Days Open',    subtitle: 'Active cases',              valueColor: '#EF9F27', goodDir: 'down' },
  { key: 'resolutionRate', label: 'Resolution Rate',  subtitle: 'Rolling 7d',                valueColor: '#138808', goodDir: 'up',   suffix: '%' },
  { key: 'employerAlerts', label: 'Employer Alerts',  subtitle: '3+ cases same employer',   valueColor: '#7c3aed', goodDir: 'down', fixedWindow: '90d' },
]

type DrillDown =
  | { kind: 'type';     value: string }
  | { kind: 'employer'; value: string }
  | { kind: 'crisis';   caseType: string; emirate: string }

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeVitals(cases: PanelCase[], range: Range): Record<VitalKey, number> {
  const days   = RANGE_DAYS[range]
  const cutoff = range === 'all' ? 0 : Date.now() - days * 86_400_000
  const inRange = cases.filter(c => new Date(c.created_at).getTime() >= cutoff)
  const open    = inRange.filter(c => !['resolved', 'closed'].includes(c.status))

  const cutoff30 = Date.now() - 30 * 86_400_000
  const crisis   = cases.filter(
    c => new Date(c.created_at).getTime() >= cutoff30 &&
         !['resolved', 'closed'].includes(c.status) &&
         getPriority(c.case_type, c.status, c.created_at) === 'critical',
  )

  const avgDaysOpen = open.length
    ? Math.round(open.reduce((s, c) => s + daysOpen(c.created_at), 0) / open.length)
    : 0

  const week7    = cases.filter(c => new Date(c.created_at).getTime() >= Date.now() - 7 * 86_400_000)
  const resolved7 = week7.filter(c => ['resolved', 'closed'].includes(c.status))
  const resRate  = week7.length ? Math.round((resolved7.length / week7.length) * 100) : 0

  const cutoff90 = Date.now() - 90 * 86_400_000
  const open90   = cases.filter(c => new Date(c.created_at).getTime() >= cutoff90 && !['resolved', 'closed'].includes(c.status))
  const empMap   = new Map<string, number>()
  for (const c of open90) if (c.company_name) empMap.set(c.company_name, (empMap.get(c.company_name) ?? 0) + 1)

  return {
    openCases:      open.length,
    crisisSignals:  crisis.length,
    avgDaysOpen,
    resolutionRate: resRate,
    employerAlerts: [...empMap.values()].filter(n => n >= 3).length,
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Sparkbars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="mt-2 flex h-5 items-end gap-0.5">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm"
          style={{ height: `${Math.max(3, Math.round((v / max) * 100))}%`, background: i === values.length - 1 ? color : `${color}55` }} />
      ))}
    </div>
  )
}

function VitalDelta({ current, prev, goodDir, label }: { current: number; prev: number | null; goodDir: 'up' | 'down'; label: string }) {
  if (prev === null) return null
  const delta = current - prev
  if (delta === 0) return <span className="text-[9px] font-semibold text-brand-muted">{label} →</span>
  const isGood = (goodDir === 'up' && delta > 0) || (goodDir === 'down' && delta < 0)
  return (
    <span className={`text-[9px] font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {label} {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  )
}

function CaseStoryCard({ c, isOpen, onToggle }: { c: PanelCase; isOpen: boolean; onToggle: () => void }) {
  const priority = getPriority(c.case_type, c.status, c.created_at)
  const days     = daysOpen(c.created_at)
  const name     = c.name ?? 'Individual'
  const briefLines = c.case_brief
    ? c.case_brief.split('\n').filter(s => s.trim().length > 8).slice(0, 3)
    : c.polished_summary
    ? [c.polished_summary.split(/[.!]\s/)[0]?.trim().slice(0, 160)]
    : []

  const urgencyBg = priority === 'critical'
    ? 'border-l-red-500 bg-red-50/50'
    : priority === 'high'
    ? 'border-l-amber-500 bg-amber-50/30'
    : 'border-l-slate-300 bg-white'

  return (
    <div className={`rounded-xl border border-brand-border border-l-4 ${urgencyBg} overflow-hidden`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span
          className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: PRIORITY_DOT[priority] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-brand-navy">{name}</p>
            <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] font-semibold text-brand-muted">{c.case_type}</span>
            <span className="text-[10px] text-brand-muted">{c.assigned_emirate}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            Status: <span className="font-medium text-brand-navy">{c.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            days >= 14 ? 'bg-red-100 text-red-700' :
            days >= 7  ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {days}d waiting
          </span>
          <span className="text-[10px] text-brand-muted/50">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-brand-border/40 bg-white/60 px-4 pb-3 pt-2">
          {briefLines.length > 0 ? (
            <ul className="space-y-1.5 mb-3">
              {briefLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-muted">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-[11px] text-brand-muted italic">No summary available yet.</p>
          )}
          <Link
            href={`/cases/${c.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-[11px] font-medium text-brand-navy hover:bg-brand-bg transition-colors"
          >
            View full case →
          </Link>
        </div>
      )}
    </div>
  )
}

function DrillList({ cases, label, onClose }: { cases: PanelCase[]; label: string; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const sorted = useMemo(() => [...cases].sort(sortByPriority), [cases])

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card">
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
        <p className="text-sm font-semibold text-brand-navy">{label}</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-brand-muted">{sorted.length} case{sorted.length !== 1 ? 's' : ''}</span>
          <button type="button" onClick={onClose} className="text-brand-muted hover:text-brand-navy text-sm">×</button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-brand-border/40">
        {sorted.map(c => {
          const priority = getPriority(c.case_type, c.status, c.created_at)
          const isOpen   = open === c.id
          return (
            <div key={c.id}>
              <button type="button" onClick={() => setOpen(isOpen ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-bg">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PRIORITY_DOT[priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-brand-navy">{c.name ?? '—'}</p>
                  <p className="truncate text-[10px] text-brand-muted">{c.case_type} · {c.assigned_emirate ?? '—'}</p>
                </div>
                <span className="text-[10px] text-brand-muted tabular-nums flex-shrink-0">{daysOpen(c.created_at)}d</span>
                <span className="text-[10px] text-brand-muted/50">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && c.case_brief && (
                <div className="border-t border-brand-border/30 bg-brand-bg px-4 py-2.5">
                  <ul className="space-y-1">
                    {c.case_brief.split('\n').filter(s => s.trim().length > 8).map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-muted">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />
                        {b.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function AmbassadorDashboard({
  cases,
  missionBrief,
}: {
  cases: PanelCase[]
  missionBrief: string | null
}) {
  const router = useRouter()
  const [range, setRange]       = useState<Range>('1m')
  const [drillDown, setDrill]   = useState<DrillDown | null>(null)
  const [openStory, setStory]   = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()

  // ── derived sets ──────────────────────────────────────────────────────────
  const cutoff = useMemo(
    () => range === 'all' ? 0 : Date.now() - RANGE_DAYS[range] * 86_400_000,
    [range],
  )

  const inRange = useMemo(
    () => cases.filter(c => new Date(c.created_at).getTime() >= cutoff),
    [cases, cutoff],
  )

  const prevYearCases = useMemo(() => {
    const days = RANGE_DAYS[range]
    if (range === 'all') return []
    const pStart = Date.now() - (days + 365) * 86_400_000
    const pEnd   = Date.now() - 365 * 86_400_000
    return cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= pStart && t < pEnd })
  }, [cases, range])

  const prevMonthCases = useMemo(() => {
    if (range === 'all') return null
    const days   = RANGE_DAYS[range]
    const pStart = Date.now() - (days + 30) * 86_400_000
    const pEnd   = Date.now() - 30 * 86_400_000
    return cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= pStart && t < pEnd })
  }, [cases, range])

  // ── vitals ────────────────────────────────────────────────────────────────
  const vitals     = useMemo(() => computeVitals(cases, range), [cases, range])
  const vitalsPrev = useMemo(() => prevMonthCases
    ? computeVitals(cases.filter(c => new Date(c.created_at).getTime() < Date.now() - 30 * 86_400_000), range)
    : null, [cases, range, prevMonthCases])

  const vitalSparklines = useMemo(() => {
    const DAYS = 8
    const now  = Date.now()
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const start = now - (DAYS - 1 - i) * 86_400_000
      const end   = start + 86_400_000
      return computeVitals(cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= start && t < end }), '1d')
    })
    const toArr = (k: VitalKey) => buckets.map(b => b[k])
    return { openCases: toArr('openCases'), crisisSignals: toArr('crisisSignals'), avgDaysOpen: toArr('avgDaysOpen'), resolutionRate: toArr('resolutionRate'), employerAlerts: toArr('employerAlerts') }
  }, [cases])

  // ── case spotlights (top 5 urgent open cases) ──────────────────────────────
  const caseSpotlights = useMemo(() => {
    const open = cases.filter(c => !['resolved', 'closed'].includes(c.status))
    return [...open].sort(sortByPriority).slice(0, 5)
  }, [cases])

  // ── crisis groups ─────────────────────────────────────────────────────────
  const crisisGroups = useMemo(() => {
    const critical = inRange.filter(
      c => !['resolved', 'closed'].includes(c.status) &&
           getPriority(c.case_type, c.status, c.created_at) === 'critical',
    )
    const m = new Map<string, PanelCase[]>()
    for (const c of critical) {
      const key = `${c.case_type}||${c.assigned_emirate ?? 'Unknown'}`
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(c)
    }
    return [...m.entries()].map(([k, cs]) => {
      const [caseType, emirate] = k.split('||')
      return { caseType, emirate, count: cs.length, oldest: Math.max(...cs.map(c => daysOpen(c.created_at))), cases: cs }
    }).sort((a, b) => b.oldest - a.oldest)
  }, [inRange])

  // ── employer alerts ────────────────────────────────────────────────────────
  const employerAlertList = useMemo(() => {
    const cutoff90 = Date.now() - 90 * 86_400_000
    const last90Open = cases.filter(c => new Date(c.created_at).getTime() >= cutoff90 && !['resolved', 'closed'].includes(c.status))
    const m = new Map<string, PanelCase[]>()
    for (const c of last90Open) {
      if (c.company_name) {
        if (!m.has(c.company_name)) m.set(c.company_name, [])
        m.get(c.company_name)!.push(c)
      }
    }
    return [...m.entries()]
      .filter(([, cs]) => cs.length >= 3)
      .sort((a, b) => {
        const aCrit = a[1].some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
        const bCrit = b[1].some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
        if (aCrit !== bCrit) return aCrit ? -1 : 1
        return b[1].length - a[1].length
      })
      .map(([employer, cs]) => ({ employer, cases: cs }))
  }, [cases])

  // ── drill-down cases ──────────────────────────────────────────────────────
  const drillCases = useMemo(() => {
    if (!drillDown) return []
    if (drillDown.kind === 'type')     return inRange.filter(c => c.case_type === drillDown.value)
    if (drillDown.kind === 'employer') return cases.filter(c => c.company_name === drillDown.value)
    return inRange.filter(c => c.case_type === drillDown.caseType && (c.assigned_emirate ?? 'Unknown') === drillDown.emirate)
  }, [drillDown, inRange, cases])

  const drillLabel = drillDown
    ? drillDown.kind === 'type'     ? drillDown.value
    : drillDown.kind === 'employer' ? `Employer: ${drillDown.value}`
    : `${drillDown.caseType} — ${drillDown.emirate}`
    : ''

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-brand-navy px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Mission Command · Ashraya Welfare Platform</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">Embassy of India — UAE</h1>
            <p className="text-xs text-white/50">Abu Dhabi · Dubai · Both Emirates</p>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-white/10 p-1 flex-shrink-0">
            {RANGES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRange(r); setDrill(null) }}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  range === r ? 'bg-white text-brand-navy' : 'text-white/70 hover:text-white'
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Mission Brief ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-brand-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between bg-brand-navy/5 px-5 py-3 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <span className="text-brand-saffron text-base">◈</span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-navy">Ambassador Situation Brief — AI Generated</p>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => startRefresh(() => { router.refresh() })}
            className="text-[10px] font-medium text-brand-muted hover:text-brand-navy disabled:opacity-50 transition-colors"
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
        <div className="bg-white px-5 py-4">
          {missionBrief ? (
            <p className="text-sm leading-relaxed text-brand-navy">{missionBrief}</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-brand-muted italic">No welfare cases on record. The mission caseload is clear.</p>
          ) : (
            <p className="text-sm leading-relaxed text-brand-navy">
              The mission currently has <strong>{vitals.openCases}</strong> open welfare case{vitals.openCases !== 1 ? 's' : ''} across both emirates.
              {vitals.crisisSignals > 0
                ? ` ${vitals.crisisSignals} case${vitals.crisisSignals !== 1 ? 's' : ''} are flagged as critical and require immediate embassy response.`
                : ' No crisis-level cases are active at this time.'}
              {vitals.avgDaysOpen > 0
                ? ` Cases are open an average of ${vitals.avgDaysOpen} days, with a ${vitals.resolutionRate}% resolution rate this week.`
                : ''}
            </p>
          )}
        </div>
      </section>

      {/* ── Case Spotlights ─────────────────────────────────────────────────── */}
      {caseSpotlights.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
              Cases Requiring Attention
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">{caseSpotlights.length}</span>
            </p>
            <Link href="/cases" className="text-[11px] text-brand-navy-light hover:underline">View all →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {caseSpotlights.map(c => (
              <CaseStoryCard
                key={c.id}
                c={c}
                isOpen={openStory === c.id}
                onToggle={() => setStory(openStory === c.id ? null : c.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Mission Vital Signs ─────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Mission Vital Signs</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {VITAL_DEFS.map(d => {
            const count = vitals[d.key]
            const prev  = vitalsPrev?.[d.key] ?? null
            const sparks = vitalSparklines[d.key]
            return (
              <div key={d.key} className="flex flex-col rounded-xl border border-brand-border bg-brand-card p-3">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted leading-snug">{d.label}</span>
                  {d.fixedWindow && (
                    <span className="flex-shrink-0 rounded bg-brand-bg px-1 py-0.5 text-[8px] font-bold text-brand-muted">{d.fixedWindow}</span>
                  )}
                </div>
                <span className="mt-1.5 text-3xl font-bold tabular-nums leading-none" style={{ color: d.valueColor }}>
                  {count}{d.suffix ?? ''}
                </span>
                <span className="mt-1 text-[10px] leading-tight text-brand-muted">{d.subtitle}</span>
                {range !== 'all' && (
                  <div className="mt-1.5">
                    <VitalDelta current={count} prev={prev} goodDir={d.goodDir} label="MoM" />
                  </div>
                )}
                <Sparkbars values={sparks} color={d.valueColor} />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Active Crisis ────────────────────────────────────────────────────── */}
      {crisisGroups.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
            Active Crisis — By Type & Emirate
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {crisisGroups.map(g => (
              <button
                key={`${g.caseType}||${g.emirate}`}
                type="button"
                onClick={() => setDrill(
                  drillDown?.kind === 'crisis' && drillDown.caseType === g.caseType ? null
                  : { kind: 'crisis', caseType: g.caseType, emirate: g.emirate }
                )}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  drillDown?.kind === 'crisis' && drillDown.caseType === g.caseType
                    ? 'border-red-400 bg-red-50'
                    : 'border-brand-border bg-brand-card hover:border-red-300'
                }`}
              >
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-navy">{g.caseType}</p>
                  <p className="text-[11px] text-brand-muted">{g.emirate}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    {g.count} case{g.count !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-[10px] font-medium ${g.oldest >= 14 ? 'text-red-600' : 'text-amber-600'}`}>
                    {g.oldest}d oldest
                  </span>
                </div>
              </button>
            ))}
          </div>
          {drillDown?.kind === 'crisis' && (
            <div className="mt-2">
              <DrillList cases={drillCases} label={drillLabel} onClose={() => setDrill(null)} />
            </div>
          )}
        </section>
      )}

      {/* ── Signal Quadrant ──────────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
          Strategic Trends — Signal Quadrant
        </p>
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-2 text-[11px] text-brand-muted">
            {prevYearCases.length > 0
              ? 'Each dot = one case category · X = YoY growth · Y = volume · click a dot to see cases'
              : 'Case volume by type — click a dot to see cases'}
          </p>
          <SignalQuadrant
            inRange={inRange}
            prevYear={prevYearCases}
            onTypeClick={t => setDrill(
              drillDown?.kind === 'type' && drillDown.value === t ? null : { kind: 'type', value: t }
            )}
          />
          {drillDown?.kind === 'type' && (
            <div className="mt-4">
              <DrillList cases={drillCases} label={drillLabel} onClose={() => setDrill(null)} />
            </div>
          )}
        </div>
      </section>

      {/* ── Employer Pattern Alerts ───────────────────────────────────────────── */}
      {employerAlertList.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
            Employer Pattern Alerts
            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">{employerAlertList.length}</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employerAlertList.map(({ employer, cases: ec }) => {
              const count    = ec.length
              const hasCrit  = ec.some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
              const hasTraff = ec.some(c => c.case_type.toLowerCase().includes('traffick'))
              const emirate  = ec[0]?.assigned_emirate ?? ''
              const typeBreakdown = [...ec.reduce<Map<string, number>>((m, c) => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1])
              const recommendation = hasTraff
                ? `Coordinate with ${emirate || 'UAE'} Police — trafficking indicators`
                : count >= 5
                ? 'Raise with UAE Ministry of Human Resources'
                : 'Monitor · escalate if 2 more cases in 30 days'
              const isActive = drillDown?.kind === 'employer' && drillDown.value === employer

              return (
                <button
                  key={employer}
                  type="button"
                  onClick={() => setDrill(isActive ? null : { kind: 'employer', value: employer })}
                  className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                    isActive
                      ? 'border-red-500 bg-red-50'
                      : hasCrit ? 'border-red-400 bg-brand-card' : 'border-amber-400 bg-brand-card'
                  } hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-brand-navy leading-snug">{employer}</p>
                    <span className="flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      {count} CASES · 90D
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-muted">
                    {typeBreakdown.slice(0, 3).map(([t, n]) => `${t} (${n})`).join(' · ')}
                  </p>
                  <p className="border-t border-brand-border/40 pt-2 text-[10px] font-medium text-brand-navy/70">
                    → {recommendation}
                  </p>
                </button>
              )
            })}
          </div>
          {drillDown?.kind === 'employer' && (
            <div className="mt-3">
              <DrillList cases={drillCases} label={drillLabel} onClose={() => setDrill(null)} />
            </div>
          )}
        </section>
      )}

    </div>
  )
}
