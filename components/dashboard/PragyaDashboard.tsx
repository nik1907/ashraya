'use client'

import { useEffect, useRef, useState } from 'react'
import { getPragyaInsights } from '@/app/ambassador/pragya-action'
import type { PragyaMission, PragyaPeriod, PragyaOutput } from '@/lib/ai/pragya'

// ── filter config ─────────────────────────────────────────────────────────────

const MISSIONS: { value: PragyaMission; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'abu-dhabi', label: 'Abu Dhabi' },
  { value: 'dubai',     label: 'Dubai' },
]

const PERIODS: { value: PragyaPeriod; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '6m',  label: '6 mo' },
  { value: '1y',  label: '1 yr' },
]

// ── style maps ────────────────────────────────────────────────────────────────

const RISK_BG: Record<string, string> = {
  LOW:      'border-green-300 bg-green-50',
  ELEVATED: 'border-amber-300 bg-amber-50',
  CRITICAL: 'border-red-300   bg-red-50',
}
const RISK_BADGE: Record<string, string> = {
  LOW:      'border-green-300 bg-green-100 text-green-800',
  ELEVATED: 'border-amber-300 bg-amber-100 text-amber-800',
  CRITICAL: 'border-red-300   bg-red-100   text-red-800',
}
const ICON_MAP: Record<string, string> = {
  cluster:    '🔗',
  spike:      '📈',
  slowdown:   '📉',
  geographic: '📍',
  escalation: '⚠️',
}
const DIR_MAP:  Record<string, string> = { up: '↑', down: '↓', stable: '→' }
const CONF_STYLE: Record<string, string> = {
  'data-backed': 'text-green-700',
  watch:         'text-amber-600',
}
const CONN_BADGE: Record<string, string> = {
  'employer-nexus':   'bg-purple-100 text-purple-700',
  'location-cluster': 'bg-blue-100   text-blue-700',
  'timing-cluster':   'bg-rose-100   text-rose-700',
}
const CONN_LABEL: Record<string, string> = {
  'employer-nexus':   'Employer Nexus',
  'location-cluster': 'Location Cluster',
  'timing-cluster':   'Timing Cluster',
}

// ── shared sub-components ─────────────────────────────────────────────────────

function FilterBar<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value:   T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-brand-border bg-brand-card p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all ${
            value === o.value
              ? 'bg-brand-navy text-white'
              : 'text-brand-muted hover:text-brand-navy'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{title}</p>
      {count !== undefined && (
        <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[9px] font-black text-brand-navy">
          {count}
        </span>
      )}
    </div>
  )
}

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 animate-pulse">
      <div className="h-3 w-1/3 rounded bg-brand-border mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-2.5 rounded bg-brand-border mb-2 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
      ))}
    </div>
  )
}

// ── section components ────────────────────────────────────────────────────────

function BriefSection({ riskLevel, bullets }: { riskLevel: string; bullets: string[] }) {
  const bg    = RISK_BG[riskLevel]    ?? RISK_BG.LOW
  const badge = RISK_BADGE[riskLevel] ?? RISK_BADGE.LOW
  return (
    <div className={`rounded-xl border-2 p-5 ${bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${badge}`}>
          {riskLevel}
        </span>
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted/70">
          Strategic Brief
        </p>
      </div>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm font-medium text-brand-navy">
            <span className="mt-1 flex-shrink-0 text-brand-saffron">•</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PatternsSection({ patterns }: { patterns: PragyaOutput['patterns'] }) {
  if (patterns.length === 0) return null
  return (
    <div>
      <SectionHeader title="Emerging Patterns" count={patterns.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {patterns.map((p, i) => (
          <div key={i} className="rounded-xl border border-brand-border bg-brand-card p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 leading-none mt-0.5">
                {ICON_MAP[p.icon] ?? '📊'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-navy leading-snug">{p.headline}</p>
                <p className="text-[11px] text-brand-muted mt-1">{p.evidence}</p>
                <span className="mt-1.5 inline-block rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
                  {p.mission}
                </span>
              </div>
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
      <SectionHeader title="Predictive Signals" count={predictions.length} />
      <div className="flex flex-col gap-2">
        {predictions.map((p, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-card px-4 py-3">
            <span className="text-base font-black text-brand-navy w-4 flex-shrink-0 text-center">
              {DIR_MAP[p.direction] ?? '→'}
            </span>
            <p className="flex-1 text-sm font-medium text-brand-navy">{p.signal}</p>
            <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-wide ${CONF_STYLE[p.confidence] ?? ''}`}>
              {p.confidence === 'data-backed' ? '● Confirmed' : '○ Watch'}
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
      <SectionHeader title="Hidden Connections" count={connections.length} />
      <div className="flex flex-col gap-2">
        {connections.map((c, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-card p-4">
            <span className="text-xl flex-shrink-0 leading-none mt-0.5">🕸</span>
            <div className="min-w-0">
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black mb-1 ${CONN_BADGE[c.type] ?? 'bg-slate-100 text-slate-700'}`}>
                {CONN_LABEL[c.type] ?? c.type}
              </span>
              <p className="text-sm font-medium text-brand-navy">{c.summary}</p>
              <p className="text-[11px] text-brand-muted mt-0.5">
                {c.caseCount} case{c.caseCount !== 1 ? 's' : ''} linked
              </p>
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
      <SectionHeader title="Strategic Recommendations" count={recommendations.length} />
      <ol className="space-y-2">
        {recommendations.map((r, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-brand-border bg-brand-card p-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-navy">
                {r.action}
                <span className="mx-1.5 text-brand-saffron">→</span>
                {r.target}
              </p>
              <p className="text-[11px] text-brand-muted mt-0.5">{r.rationale}</p>
            </div>
          </li>
        ))}
      </ol>
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

  const missionLabel = mission === 'all' ? 'all missions' : mission === 'abu-dhabi' ? 'Abu Dhabi' : 'Dubai'

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterBar options={MISSIONS} value={mission} onChange={setMission} />
        <FilterBar options={PERIODS}  value={period}  onChange={setPeriod}  />
        {loading && (
          <span className="text-[11px] text-brand-muted animate-pulse">Pragya is analysing…</span>
        )}
      </div>

      {/* ── Content ── */}
      {(loading || !output) ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={4} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <BriefSection           riskLevel={output.riskLevel}               bullets={output.brief}               />
          <PatternsSection        patterns={output.patterns}                                                       />
          <PredictionsSection     predictions={output.predictions}                                                 />
          <ConnectionsSection     connections={output.connections}                                                 />
          <RecommendationsSection recommendations={output.recommendations}                                        />

          <p className="text-center text-[10px] text-brand-muted/50">
            Pragya · {missionLabel} · {period} window · grounded in real data · no hallucination
          </p>
        </div>
      )}

    </div>
  )
}
