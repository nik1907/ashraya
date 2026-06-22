'use client'

import { useMemo, useState } from 'react'

import { daysOpen, getPriority, PRIORITY_DOT, sortByPriority } from '@/lib/caseUtils'
import { SignalQuadrant } from './SignalQuadrant'
import type { PanelCase } from './CaseSidePanel'

// ─── types & constants ────────────────────────────────────────────────────────

type Range = '1d' | '7d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all'

const RANGE_DAYS: Record<Range, number> = {
  '1d': 1, '7d': 7, '1w': 7, '1m': 30, '3m': 90,
  '6m': 180, '1y': 365, '5y': 1825, 'all': Infinity,
}
const RANGES: Range[] = ['1d', '7d', '1w', '1m', '3m', '6m', '1y', '5y', 'all']
const RANGE_LABEL: Record<Range, string> = {
  '1d': '1D', '7d': '7D', '1w': '1W', '1m': '1M', '3m': '3M',
  '6m': '6M', '1y': '1Y', '5y': '5Y', 'all': 'ALL',
}

type VitalKey = 'openCases' | 'crisisSignals' | 'avgDaysOpen' | 'resolutionRate' | 'employerAlerts'

const VITAL_DEFS: {
  key: VitalKey; label: string; subtitle: string; valueColor: string
  goodDir: 'up' | 'down'; suffix?: string; fixedWindow?: string
}[] = [
  { key: 'openCases',      label: 'Open Cases UAE-wide',     subtitle: 'Both emirates · all types',   valueColor: '#0b2545', goodDir: 'down' },
  { key: 'crisisSignals',  label: 'Crisis Signals',          subtitle: 'Critical open cases',          valueColor: '#E24B4A', goodDir: 'down', fixedWindow: '30d' },
  { key: 'avgDaysOpen',    label: 'Avg Days Open',           subtitle: 'Active open cases',            valueColor: '#EF9F27', goodDir: 'down' },
  { key: 'resolutionRate', label: 'Resolution Rate',         subtitle: 'Rolling 7d window',            valueColor: '#138808', goodDir: 'up',   suffix: '%' },
  { key: 'employerAlerts', label: 'Employer Alerts',         subtitle: '3+ cases · same employer',     valueColor: '#7c3aed', goodDir: 'down', fixedWindow: '90d' },
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

  // KPI 1 — open cases in range
  const openCases = inRange.filter(c => !['resolved', 'closed'].includes(c.status))

  // KPI 2 — crisis signals always 30d
  const cutoff30 = Date.now() - 30 * 86_400_000
  const crisisSignals = cases.filter(
    c => new Date(c.created_at).getTime() >= cutoff30 &&
         !['resolved', 'closed'].includes(c.status) &&
         getPriority(c.case_type, c.status, c.created_at) === 'critical',
  )

  // KPI 3 — avg days open
  const avgDaysOpen = openCases.length
    ? Math.round(openCases.reduce((s, c) => s + daysOpen(c.created_at), 0) / openCases.length)
    : 0

  // KPI 4 — resolution rate rolling 7d
  const cutoff7 = Date.now() - 7 * 86_400_000
  const openedThisWeek = cases.filter(c => new Date(c.created_at).getTime() >= cutoff7)
  const resolvedThisWeek = openedThisWeek.filter(c => ['resolved', 'closed'].includes(c.status))
  const resolutionRate = openedThisWeek.length
    ? Math.round((resolvedThisWeek.length / openedThisWeek.length) * 100)
    : 0

  // KPI 5 — employer alerts always 90d
  const cutoff90 = Date.now() - 90 * 86_400_000
  const last90Open = cases.filter(
    c => new Date(c.created_at).getTime() >= cutoff90 && !['resolved', 'closed'].includes(c.status),
  )
  const empMap = new Map<string, number>()
  for (const c of last90Open) {
    if (c.company_name) empMap.set(c.company_name, (empMap.get(c.company_name) ?? 0) + 1)
  }
  const employerAlerts = [...empMap.values()].filter(n => n >= 3).length

  return {
    openCases: openCases.length,
    crisisSignals: crisisSignals.length,
    avgDaysOpen,
    resolutionRate,
    employerAlerts,
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function VitalSparkbars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="mt-2.5 flex h-6 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.max(3, Math.round((v / max) * 100))}%`,
            background: i === values.length - 1 ? color : `${color}55`,
          }}
        />
      ))}
    </div>
  )
}

function VitalDelta({
  current, prev, goodDir, label,
}: {
  current: number; prev: number | null; goodDir: 'up' | 'down'; label: string
}) {
  if (prev === null) return null
  const delta = current - prev
  if (delta === 0) return <span className="text-[9px] font-semibold text-brand-muted">{label} →</span>
  const isPositive = delta > 0
  const isGood = (goodDir === 'up' && isPositive) || (goodDir === 'down' && !isPositive)
  const cls = isGood ? 'text-green-600' : 'text-red-600'
  return (
    <span className={`text-[9px] font-bold ${cls}`}>
      {label} {isPositive ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  )
}

function CrisisRow({
  caseType, emirate, count, oldest, onClick, active,
}: {
  caseType: string; emirate: string; count: number; oldest: number
  onClick: () => void; active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
        active ? 'border-red-400 bg-red-50' : 'border-brand-border bg-brand-card hover:border-red-300'
      }`}
    >
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-navy truncate">{caseType}</p>
        <p className="text-[11px] text-brand-muted">{emirate}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{count} case{count !== 1 ? 's' : ''}</span>
        <span className={`text-[10px] font-medium ${oldest >= 14 ? 'text-red-600' : 'text-amber-600'}`}>{oldest}d oldest</span>
      </div>
      <span className="text-brand-muted/50 text-xs">›</span>
    </button>
  )
}

function PatternAlertCard({
  employer, cases90d, onClick, active,
}: {
  employer: string; cases90d: PanelCase[]; onClick: () => void; active: boolean
}) {
  const count    = cases90d.length
  const hasCrit  = cases90d.some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
  const hasTraff = cases90d.some(c => c.case_type.toLowerCase().includes('traffick'))
  const emirate  = cases90d[0]?.assigned_emirate ?? ''

  const borderCls = hasCrit ? 'border-red-400' : 'border-amber-400'

  const typeBreakdown = [...cases90d
    .reduce<Map<string, number>>((m, c) => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1), new Map())
    .entries()].sort((a, b) => b[1] - a[1])

  const recommendation = hasTraff
    ? `Recommend consular coordination with ${emirate || 'UAE'} Police`
    : count >= 5
    ? 'Recommend raising with UAE Ministry of Human Resources'
    : 'Monitor — escalate if 2+ more cases in 30 days'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${
        active ? 'border-red-500 bg-red-50' : borderCls + ' bg-brand-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-brand-navy leading-snug">{employer}</p>
        <span className="flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          {count} CASES · 90D
        </span>
      </div>
      <p className="text-[11px] text-brand-muted leading-relaxed">
        {typeBreakdown.slice(0, 3).map(([t, n]) => `${t} (${n})`).join(' · ')}
      </p>
      <p className="text-[10px] font-medium text-brand-navy/70 border-t border-brand-border/40 pt-2">
        → {recommendation}
      </p>
    </button>
  )
}

function DrillList({
  cases, label, onClose,
}: {
  cases: PanelCase[]; label: string; onClose: () => void
}) {
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
      <div className="max-h-96 overflow-y-auto divide-y divide-brand-border/40">
        {sorted.map(c => {
          const priority = getPriority(c.case_type, c.status, c.created_at)
          const isOpen   = open === c.id
          return (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-bg"
              >
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

export function AmbassadorDashboard({ cases }: { cases: PanelCase[] }) {
  const [range,    setRange]    = useState<Range>('1m')
  const [drillDown, setDrill]  = useState<DrillDown | null>(null)

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
    const days   = RANGE_DAYS[range]
    if (range === 'all') return []
    const pStart = Date.now() - (days + 365) * 86_400_000
    const pEnd   = Date.now() - 365 * 86_400_000
    return cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= pStart && t < pEnd })
  }, [cases, range])

  const prevMonthCases = useMemo(() => {
    const days = RANGE_DAYS[range]
    if (range === 'all') return null
    const pStart = Date.now() - (days + 30) * 86_400_000
    const pEnd   = Date.now() - 30 * 86_400_000
    return cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= pStart && t < pEnd })
  }, [cases, range])

  // ── vitals ────────────────────────────────────────────────────────────────
  const vitals     = useMemo(() => computeVitals(cases, range),             [cases, range])
  const vitalsPrev = useMemo(() => prevMonthCases ? computeVitals(cases.filter(c => {
    const t = new Date(c.created_at).getTime()
    const end = Date.now() - 30 * 86_400_000
    return t < end
  }), range) : null, [cases, range, prevMonthCases])

  const vitalSparklines = useMemo(() => {
    const DAYS = 8
    const now  = Date.now()
    const buckets = Array.from({ length: DAYS }, (_, i) => {
      const start = now - (DAYS - 1 - i) * 86_400_000
      const end   = start + 86_400_000
      const s = cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= start && t < end })
      return computeVitals(s, '1d')
    })
    const toArr = (k: VitalKey) => buckets.map(b => b[k])
    return { openCases: toArr('openCases'), crisisSignals: toArr('crisisSignals'), avgDaysOpen: toArr('avgDaysOpen'), resolutionRate: toArr('resolutionRate'), employerAlerts: toArr('employerAlerts') }
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
    const last90Open = cases.filter(
      c => new Date(c.created_at).getTime() >= cutoff90 && !['resolved', 'closed'].includes(c.status),
    )
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
        const aHasCrit = a[1].some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
        const bHasCrit = b[1].some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')
        if (aHasCrit !== bHasCrit) return aHasCrit ? -1 : 1
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

      {/* ── header ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-brand-navy px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Mission Command · Ashraya Welfare Platform</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">Embassy of India — UAE</h1>
            <p className="mt-0.5 text-xs text-white/60">Abu Dhabi · Dubai · Both Emirates</p>
          </div>
          {/* range selector */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-white/10 p-1">
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

      {/* ── Mission Vital Signs (5 KPI cards) ─────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Mission Vital Signs</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {VITAL_DEFS.map(d => {
            const count = vitals[d.key]
            const prev  = vitalsPrev?.[d.key] ?? null
            const sparks = vitalSparklines[d.key]
            return (
              <div
                key={d.key}
                className="flex flex-col rounded-xl border border-brand-border bg-brand-card p-3"
              >
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
                  <div className="mt-2 flex gap-2">
                    <VitalDelta current={count} prev={prev} goodDir={d.goodDir} label="MoM" />
                  </div>
                )}
                <VitalSparkbars values={sparks} color={d.valueColor} />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Active Crisis & Distress ───────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Active Crisis & Distress</p>
        {crisisGroups.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
            <span className="text-lg text-green-500">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">All clear — no active crisis cases</p>
              <p className="text-[11px] text-green-600">No critical humanitarian cases in the current period</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {crisisGroups.map(g => (
              <CrisisRow
                key={`${g.caseType}||${g.emirate}`}
                caseType={g.caseType}
                emirate={g.emirate}
                count={g.count}
                oldest={g.oldest}
                active={drillDown?.kind === 'crisis' && drillDown.caseType === g.caseType && drillDown.emirate === g.emirate}
                onClick={() => setDrill(
                  drillDown?.kind === 'crisis' && drillDown.caseType === g.caseType && drillDown.emirate === g.emirate
                    ? null
                    : { kind: 'crisis', caseType: g.caseType, emirate: g.emirate }
                )}
              />
            ))}
          </div>
        )}

        {drillDown?.kind === 'crisis' && (
          <div className="mt-2">
            <DrillList cases={drillCases} label={drillLabel} onClose={() => setDrill(null)} />
          </div>
        )}
      </section>

      {/* ── Strategic Trends ──────────────────────────────────────────────── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Strategic Trends — Signal Quadrant</p>
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-1 text-[11px] text-brand-muted">
            Each dot = one welfare case category · X axis = YoY growth · Y axis = volume · click a dot to see cases
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

      {/* ── Pattern Alerts ────────────────────────────────────────────────── */}
      {employerAlertList.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
            Employer Pattern Alerts
            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">{employerAlertList.length}</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employerAlertList.map(({ employer, cases: ec }) => (
              <PatternAlertCard
                key={employer}
                employer={employer}
                cases90d={ec}
                active={drillDown?.kind === 'employer' && drillDown.value === employer}
                onClick={() => setDrill(
                  drillDown?.kind === 'employer' && drillDown.value === employer
                    ? null
                    : { kind: 'employer', value: employer }
                )}
              />
            ))}
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
