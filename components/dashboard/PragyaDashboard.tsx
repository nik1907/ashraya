'use client'

import { useEffect, useRef, useState } from 'react'
import { getPragyaInsights } from '@/app/ambassador/pragya-action'
import type { PragyaMission, PragyaPeriod, PragyaOutput } from '@/lib/ai/pragya'

// ── filter config ─────────────────────────────────────────────────────────────

const MISSIONS: { value: PragyaMission; label: string }[] = [
  { value: 'all',       label: 'All Missions' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'dubai',     label: 'Dubai' },
]

const PERIODS: { value: PragyaPeriod; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '6m',  label: '6 months' },
  { value: '1y',  label: '1 year' },
]

// ── style maps ────────────────────────────────────────────────────────────────

const RISK_HEADER: Record<string, string> = {
  LOW:      'bg-green-50 border-b border-green-200',
  ELEVATED: 'bg-amber-50 border-b border-amber-200',
  CRITICAL: 'bg-red-50   border-b border-red-200',
}
const RISK_BADGE: Record<string, string> = {
  LOW:      'bg-green-100 text-green-800 border-green-300',
  ELEVATED: 'bg-amber-100 text-amber-800 border-amber-300',
  CRITICAL: 'bg-red-100   text-red-800   border-red-300',
}
const RISK_DOT: Record<string, string> = {
  LOW:      'bg-green-400',
  ELEVATED: 'bg-amber-400',
  CRITICAL: 'bg-red-500',
}

const PATTERN_ACCENT: Record<string, string> = {
  cluster:    'bg-purple-400',
  spike:      'bg-red-400',
  slowdown:   'bg-sky-400',
  geographic: 'bg-amber-400',
  escalation: 'bg-rose-500',
}
const PATTERN_LABEL: Record<string, string> = {
  cluster:    'Employer Nexus',
  spike:      'Volume Spike',
  slowdown:   'Volume Decline',
  geographic: 'Geographic Concentration',
  escalation: 'Escalation Risk',
}

const DIR_SYMBOL: Record<string, string> = { up: '▲', down: '▼', stable: '—' }
const DIR_COLOR:  Record<string, string>  = {
  up:     'text-red-600',
  down:   'text-green-600',
  stable: 'text-brand-muted',
}
const CONF_COLOR: Record<string, string> = {
  'data-backed': 'text-green-700',
  watch:         'text-amber-600',
}

const CONN_BADGE: Record<string, string> = {
  'employer-nexus':   'bg-purple-100 text-purple-700 border-purple-200',
  'location-cluster': 'bg-sky-100    text-sky-700    border-sky-200',
  'timing-cluster':   'bg-rose-100   text-rose-700   border-rose-200',
}
const CONN_LABEL: Record<string, string> = {
  'employer-nexus':   'Employer Nexus',
  'location-cluster': 'Location Cluster',
  'timing-cluster':   'Timing Cluster',
}

// ── shared sub-components ─────────────────────────────────────────────────────

function FilterPill<T extends string>({
  options, value, onChange,
}: {
  options:  { value: T; label: string }[]
  value:    T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-brand-border bg-brand-card p-1 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition-all ${
            value === o.value
              ? 'bg-brand-navy text-white shadow-sm'
              : 'text-brand-muted hover:text-brand-navy hover:bg-brand-navy/5'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-muted whitespace-nowrap">
        {title}
      </p>
      {count !== undefined && (
        <span className="rounded-full bg-brand-navy text-white px-2 py-0.5 text-[9px] font-black">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-brand-border/60" />
    </div>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBrief() {
  return (
    <div className="rounded-xl border border-brand-border overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-100" />
      <div className="bg-white px-5 py-4 space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-3 items-start">
            <div className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-200 flex-shrink-0" />
            <div className={`h-3 rounded bg-slate-200 ${i === 2 ? 'w-3/4' : 'w-full'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div className="rounded-xl border border-brand-border overflow-hidden animate-pulse divide-y divide-brand-border">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-14 bg-brand-card" />
      ))}
    </div>
  )
}

// ── section components ────────────────────────────────────────────────────────

function BriefSection({ riskLevel, bullets }: { riskLevel: string; bullets: string[] }) {
  const hdr   = RISK_HEADER[riskLevel] ?? RISK_HEADER.LOW
  const badge = RISK_BADGE[riskLevel]  ?? RISK_BADGE.LOW
  const dot   = RISK_DOT[riskLevel]    ?? RISK_DOT.LOW

  return (
    <div className="rounded-xl border border-brand-border overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-3 ${hdr}`}>
        <span className={`rounded border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge}`}>
          {riskLevel}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-navy/40">
          Strategic Brief
        </span>
        <div className="flex-1" />
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <div className="bg-brand-card px-5 py-4 space-y-3">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-saffron" />
            <p className="text-sm text-brand-navy leading-relaxed">{b}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PatternsSection({ patterns }: { patterns: PragyaOutput['patterns'] }) {
  if (patterns.length === 0) return null
  return (
    <div>
      <SectionLabel title="Emerging Patterns" count={patterns.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {patterns.map((p, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-card overflow-hidden flex">
            <div className={`w-1 flex-shrink-0 ${PATTERN_ACCENT[p.icon] ?? 'bg-slate-300'}`} />
            <div className="px-4 py-3 flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1">
                {PATTERN_LABEL[p.icon] ?? p.icon}
              </p>
              <p className="text-sm font-bold text-brand-navy leading-snug">{p.headline}</p>
              <p className="text-[11px] text-brand-muted mt-1">{p.evidence}</p>
              <span className="mt-2 inline-block text-[10px] font-semibold text-brand-muted border border-brand-border/60 rounded px-2 py-0.5">
                {p.mission}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PredictionsSection({ predictions }: { predictions: PragyaOutput['predictions'] }) {
  if (predictions.length === 0) return null
  return (
    <div>
      <SectionLabel title="Predictive Signals" count={predictions.length} />
      <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden divide-y divide-brand-border/50">
        {predictions.map((p, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <span className={`text-[11px] font-black w-3 flex-shrink-0 text-center ${DIR_COLOR[p.direction] ?? 'text-brand-muted'}`}>
              {DIR_SYMBOL[p.direction] ?? '—'}
            </span>
            <p className="flex-1 text-sm text-brand-navy">{p.signal}</p>
            <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-wide ${CONF_COLOR[p.confidence] ?? 'text-brand-muted'}`}>
              {p.confidence === 'data-backed' ? 'Confirmed' : 'Watch'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectionsSection({ connections }: { connections: PragyaOutput['connections'] }) {
  if (connections.length === 0) return null
  return (
    <div>
      <SectionLabel title="Hidden Connections" count={connections.length} />
      <div className="flex flex-col gap-2">
        {connections.map((c, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-card px-4 py-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <span className={`inline-block text-[10px] font-black uppercase tracking-wide border rounded px-2 py-0.5 mb-1.5 ${CONN_BADGE[c.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {CONN_LABEL[c.type] ?? c.type}
              </span>
              <p className="text-sm font-medium text-brand-navy">{c.summary}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-base font-black text-brand-navy tabular-nums leading-none">{c.caseCount}</p>
              <p className="text-[10px] text-brand-muted mt-0.5">cases</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecommendationsSection({ recommendations }: { recommendations: PragyaOutput['recommendations'] }) {
  if (recommendations.length === 0) return null
  return (
    <div>
      <SectionLabel title="Strategic Recommendations" count={recommendations.length} />
      <div className="flex flex-col gap-2">
        {recommendations.map((r, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-card px-4 py-3 flex gap-3 items-start">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-black flex items-center justify-center">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-navy">
                <span className="uppercase tracking-wide">{r.action}</span>
                <span className="mx-2 text-brand-saffron font-black">·</span>
                {r.target}
              </p>
              <p className="text-[11px] text-brand-muted mt-0.5">{r.rationale}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function PragyaDashboard() {
  const [mission, setMission] = useState<PragyaMission>('all')
  const [period,  setPeriod]  = useState<PragyaPeriod>('90d')
  const [loading, setLoading] = useState(false)
  const [output,  setOutput]  = useState<PragyaOutput | null>(null)
  const cache = useRef(new Map<string, PragyaOutput>())

  useEffect(() => {
    const key = `${mission}:${period}`
    if (cache.current.has(key)) {
      setOutput(cache.current.get(key)!)
      return
    }
    setLoading(true)
    setOutput(null)
    getPragyaInsights(mission, period)
      .then(result => {
        if (result) {
          cache.current.set(key, result)
          setOutput(result)
        }
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setLoading(false))
  }, [mission, period])

  const missionLabel = MISSIONS.find(m => m.value === mission)?.label ?? 'All Missions'
  const periodLabel  = ({ '30d': '30-day', '90d': '90-day', '6m': '6-month', '1y': '12-month' } as Record<string, string>)[period] ?? period

  return (
    <div className="flex flex-col gap-6">

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill options={MISSIONS} value={mission} onChange={setMission} />
        <div className="h-6 w-px bg-brand-border mx-1" />
        <FilterPill options={PERIODS}  value={period}  onChange={setPeriod}  />
        {loading && (
          <span className="text-[11px] text-brand-muted ml-2">Analysing…</span>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col gap-6">
          <SkeletonBrief />
          <SkeletonRows n={2} />
          <SkeletonRows n={2} />
        </div>
      ) : !output ? (
        <div className="rounded-xl border border-brand-border bg-brand-card px-6 py-8 text-center text-sm text-brand-muted">
          No data available for the selected filters.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <BriefSection           riskLevel={output.riskLevel}           bullets={output.brief}               />
          <PatternsSection        patterns={output.patterns}                                                   />
          <PredictionsSection     predictions={output.predictions}                                             />
          <ConnectionsSection     connections={output.connections}                                             />
          <RecommendationsSection recommendations={output.recommendations}                                    />

          <p className="text-center text-[10px] text-brand-muted/40 tracking-widest uppercase">
            Pragya · {missionLabel} · {periodLabel} window · data-grounded
          </p>
        </div>
      )}

    </div>
  )
}
