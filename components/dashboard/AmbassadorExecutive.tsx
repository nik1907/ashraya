'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

import { getAIAnswer, getAmbassadorBrief, getEmergingRisks } from '@/app/ambassador/actions'

// Type mirrors from lib/ai/ambassador (avoid 'server-only' import in client code)
export type AmbassadorBriefCtx = {
  activeCases: number
  criticalCases: number
  avgResolutionDays: number
  responseRate: number
  topCategory: string
  topCategoryPct: number
  dubaiPct: number
  dubaiTrend: number
  medicalTrend: number | null
  recentEmployerAlert: string | null
  repatriationRising: boolean
  slaBreaches: number
  avgDaysOpen: number
}

type RiskItem    = { level: 'high' | 'medium' | 'info'; text: string }
type RiskScore   = { score: 'low' | 'medium' | 'high'; signals: number }
type Pulse       = { month: string; total: number; labour: number }
type Category    = { label: string; value: number; pct: number; color: string }
type MissionHalf = { count: number; trend: number; pct: number }
type FunnelItem  = { label: string; count: number; color: string }

export type ExecutiveData = {
  kpis: {
    activeCases: number
    volumeTrend: number
    criticalCases: number
    criticalTrend: number
    avgResolutionDays: number
    resolutionTrend: number
    responseRate: number
    responseTrend: number
  }
  riskScore: RiskScore
  pulse: Pulse[]
  categories: Category[]
  mission: { abuDhabi: MissionHalf; dubai: MissionHalf; total: number }
  funnel: FunnelItem[]
  resolutionEfficiency: number
  aiContext: AmbassadorBriefCtx
}

// ── config ─────────────────────────────────────────────────────────────────────

const RISK_CFG = {
  low:    { label: 'LOW RISK',    bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500'  },
  medium: { label: 'MEDIUM RISK', bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  high:   { label: 'HIGH RISK',   bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
}

const RISK_ITEM_CFG = {
  high:   { bg: 'bg-red-50',   border: 'border-red-200',   dot: 'bg-red-500',   tx: 'text-red-800'   },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', tx: 'text-amber-800' },
  info:   { bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-400',  tx: 'text-blue-800'  },
}

const PRESET_QUESTIONS = [
  'Which case type needs attention right now?',
  'How does Dubai compare to Abu Dhabi?',
  'What should I prioritise today?',
  'Are SLA targets being met?',
]

// ── small components ───────────────────────────────────────────────────────────

function TrendBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (value === 0) return <span className="text-[10px] text-brand-muted">—</span>
  const bad = inverse ? value > 0 : value < 0
  return (
    <span className={`text-[10px] font-semibold ${bad ? 'text-red-600' : 'text-green-600'}`}>
      {value > 0 ? '+' : ''}{value}%
    </span>
  )
}

function KpiCard({
  label, value, suffix = '', trend, inverseTrend, sub,
}: {
  label: string; value: number; suffix?: string
  trend?: number; inverseTrend?: boolean; sub?: string
}) {
  return (
    <div className="flex flex-col rounded-xl border border-brand-border bg-brand-card px-4 py-3.5">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-brand-muted">{label}</p>
      <p className="text-2xl font-black tabular-nums text-brand-navy">{value}{suffix}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {trend !== undefined && <TrendBadge value={trend} inverse={inverseTrend} />}
        {sub && <span className="text-[9px] text-brand-muted">{sub}</span>}
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export function AmbassadorExecutive({ data }: { data: ExecutiveData }) {
  const { kpis, riskScore, pulse, categories, mission, funnel, resolutionEfficiency, aiContext } = data

  const [risks,        setRisks]        = useState<RiskItem[] | null>(null)
  const [risksLoading, setRisksLoading] = useState(true)
  const [brief,        setBrief]        = useState<string | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefType,    setBriefType]    = useState<'daily' | 'weekly' | 'monthly' | null>(null)
  const [aiAnswer,     setAiAnswer]     = useState<string | null>(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [question,     setQuestion]     = useState('')
  const briefRef = useRef<HTMLDivElement>(null)

  // Load emerging risks once on mount
  useEffect(() => {
    getEmergingRisks(aiContext)
      .then(r => { setRisks(r); setRisksLoading(false) })
      .catch(() => setRisksLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBrief(type: 'daily' | 'weekly' | 'monthly') {
    setBriefType(type)
    setBriefLoading(true)
    setBrief(null)
    startTransition(async () => {
      const result = await getAmbassadorBrief(aiContext, type)
      setBrief(result)
      setBriefLoading(false)
      setTimeout(() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
    })
  }

  function handleAsk(q: string) {
    if (!q.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    startTransition(async () => {
      const result = await getAIAnswer(q, aiContext)
      setAiAnswer(result)
      setAiLoading(false)
    })
  }

  const rscCfg = RISK_CFG[riskScore.score]

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI Bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="Active Cases"   value={kpis.activeCases}        trend={kpis.volumeTrend}      inverseTrend sub="vs last month" />
        <KpiCard label="Critical Cases" value={kpis.criticalCases}      trend={kpis.criticalTrend}    inverseTrend sub="new this month" />
        <KpiCard label="Avg Resolution" value={kpis.avgResolutionDays}  suffix=" d" trend={kpis.resolutionTrend} inverseTrend sub="vs 30d prior" />
        <KpiCard label="Response Rate"  value={kpis.responseRate}       suffix="%" trend={kpis.responseTrend}  sub="ack ≤48h" />
        <div className={`flex flex-col rounded-xl border border-brand-border px-4 py-3.5 ${rscCfg.bg}`}>
          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-brand-muted">AI Risk Score</p>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${rscCfg.dot}`} />
            <span className={`text-sm font-black ${rscCfg.text}`}>{rscCfg.label}</span>
          </div>
          <p className="mt-1 text-[9px] text-brand-muted">{riskScore.signals} active signal{riskScore.signals !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* Welfare Pulse — 2 cols */}
        <div className="col-span-1 rounded-xl border border-brand-border bg-brand-card p-4 sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Welfare Pulse</p>
              <p className="text-[9px] text-brand-muted">12-month case volume — total &amp; labour</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-brand-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-3 rounded" style={{ background: '#185FA5' }} />Total
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-3 rounded" style={{ background: '#EF9F27' }} />Labour
              </span>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pulse} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="execTotalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#185FA5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="execLabourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF9F27" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF9F27" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#888780' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null
                    return (
                      <div style={{ fontSize: 11, border: '1px solid #E5E0D8', borderRadius: 8, padding: '6px 10px', background: '#fff' }}>
                        <p style={{ fontWeight: 600, marginBottom: 2 }}>{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }}>{p.dataKey === 'total' ? 'Total' : 'Labour'}: {p.value}</p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Area type="monotone" dataKey="total"  stroke="#185FA5" strokeWidth={2}   fill="url(#execTotalGrad)"  dot={false} />
                <Area type="monotone" dataKey="labour" stroke="#EF9F27" strokeWidth={1.5} fill="url(#execLabourGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Donut */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-brand-muted">Case Categories</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categories.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    const cat = payload?.[0]?.payload as Category | undefined
                    if (!cat) return null
                    return (
                      <div style={{ fontSize: 10, border: '1px solid #E5E0D8', borderRadius: 6, padding: '4px 8px', background: '#fff' }}>
                        <p style={{ fontWeight: 600 }}>{cat.label}</p>
                        <p>{cat.pct}% &nbsp;({cat.value})</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
            {categories.slice(0, 6).map(c => (
              <div key={c.label} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[9px] text-brand-muted">{c.label}</span>
                <span className="text-[9px] font-semibold text-brand-navy">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data cards row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* Mission Split */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-muted">Mission Split</p>
          <div className="space-y-3">
            {[
              { label: 'Mission Abu Dhabi', d: mission.abuDhabi, color: '#185FA5' },
              { label: 'Mission Dubai',     d: mission.dubai,    color: '#EF9F27' },
            ].map(({ label, d, color }) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-brand-navy">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-black text-brand-navy">{d.count}</span>
                    {d.trend !== 0 && (
                      <span className={`text-[9px] font-bold ${d.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {d.trend > 0 ? '+' : ''}{d.trend}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-brand-bg">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: color }} />
                </div>
                <p className="mt-0.5 text-[9px] text-brand-muted">{d.pct}% of total · vs last month</p>
              </div>
            ))}
            <div className="border-t border-brand-border/50 pt-2 text-[10px] text-brand-muted space-y-0.5">
              <p>All missions: <span className="font-semibold text-brand-navy">{mission.total}</span></p>
              <p>Resolution efficiency: <span className="font-semibold text-brand-navy">{resolutionEfficiency}%</span></p>
            </div>
          </div>
        </div>

        {/* Embassy Funnel */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-muted">Embassy Funnel</p>
          <div className="space-y-3">
            {funnel.map((f, i) => {
              const maxCount = funnel[0]?.count || 1
              const pct = Math.round(f.count / maxCount * 100)
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-brand-muted">{f.label}</span>
                    <span className="text-[11px] font-bold text-brand-navy">{f.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-brand-bg">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Emerging Risks */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Emerging Risks</p>
            <span className="text-[9px] text-brand-muted/60">AI · GPT-5.5</span>
          </div>
          {risksLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-8 animate-pulse rounded-lg bg-brand-border/40" />)}
            </div>
          ) : !risks || risks.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-brand-muted">No significant risks detected</p>
          ) : (
            <div className="space-y-2">
              {risks.map((r, i) => {
                const cfg = RISK_ITEM_CFG[r.level]
                return (
                  <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 ${cfg.bg} ${cfg.border}`}>
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
                    <p className={`text-[10px] leading-snug ${cfg.tx}`}>{r.text}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Panel row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* AI Brief */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">AI Briefing Panel</p>
              <p className="text-[9px] text-brand-muted">Powered by GPT-5.5 · under 200 words</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleBrief(t)}
                  disabled={briefLoading}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition-all disabled:opacity-40 ${
                    briefType === t
                      ? 'bg-brand-navy text-white'
                      : 'border border-brand-border text-brand-muted hover:text-brand-navy'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!brief && !briefLoading && (
            <button
              type="button"
              onClick={() => handleBrief('daily')}
              className="w-full rounded-xl border-2 border-dashed border-brand-border py-7 text-[11px] font-semibold text-brand-muted transition-colors hover:border-brand-navy hover:text-brand-navy"
            >
              Brief me now →
            </button>
          )}

          {briefLoading && (
            <div className="space-y-2 py-2">
              {[null, null, null, null].map((_, i) => (
                <div key={i} className={`h-3 animate-pulse rounded bg-brand-border/40 ${i === 3 ? 'w-4/6' : i === 2 ? 'w-5/6' : 'w-full'}`} />
              ))}
            </div>
          )}

          {brief && !briefLoading && (
            <div ref={briefRef} className="rounded-lg bg-brand-navy/5 p-3">
              <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-brand-navy">{brief}</pre>
            </div>
          )}
        </div>

        {/* Ask Ashraya AI */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Ask Ashraya AI</p>
            <p className="text-[9px] text-brand-muted">Ask anything about the current welfare situation</p>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESET_QUESTIONS.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuestion(q); handleAsk(q) }}
                disabled={aiLoading}
                className="rounded-full border border-brand-border px-2.5 py-1 text-[9px] text-brand-muted transition-colors hover:border-brand-navy hover:text-brand-navy disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAsk(question) }}
              placeholder="Type your question…"
              className="min-w-0 flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-[11px] text-brand-navy placeholder-brand-muted/50 focus:border-brand-navy focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleAsk(question)}
              disabled={aiLoading || !question.trim()}
              className="flex-shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {aiLoading ? '…' : 'Ask'}
            </button>
          </div>

          {aiLoading && (
            <div className="mt-3 space-y-1.5">
              {[null, null, null].map((_, i) => (
                <div key={i} className={`h-3 animate-pulse rounded bg-brand-border/40 ${i === 2 ? 'w-3/5' : i === 1 ? 'w-4/5' : 'w-full'}`} />
              ))}
            </div>
          )}

          {aiAnswer && !aiLoading && (
            <div className="mt-3 rounded-lg bg-brand-navy/5 p-3">
              <p className="text-[11px] leading-relaxed text-brand-navy">{aiAnswer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
