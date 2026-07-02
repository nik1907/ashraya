'use client'

import Link from 'next/link'
import { startTransition, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { getAIAnswer, getAmbassadorBrief, getEmergingRisks } from '@/app/ambassador/actions'
import { daysOpen, getPriority, PRIORITY_DOT } from '@/lib/caseUtils'
import type { PanelCase } from './CaseSidePanel'

// ── type mirrors from lib/ai/ambassador (avoid 'server-only' import) ──────────

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
type Pulse       = { month: string; monthKey: string; total: number; labour: number; medical: number; legal: number; death: number; family: number; financial: number; missing: number; documents: number; other: number }
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

// ── category helper (mirrors page.tsx — used for client-side filtering) ────────

function toCategory(t: string): string {
  const l = t.toLowerCase()
  if (l.includes('death') || l.includes('dead') || l.includes('repatriat')) return 'Death & Repatriation'
  if (l.includes('medical') || l.includes('health') || l.includes('hospital') || l.includes('accident') || l.includes('injur')) return 'Medical'
  if (l.includes('salary') || l.includes('labour') || l.includes('labor') || l.includes('employ') || l.includes('wage')) return 'Labour'
  if (l.includes('legal') || l.includes('court') || l.includes('arrest') || l.includes('police') || l.includes('detent') || l.includes('criminal')) return 'Legal'
  if (l.includes('family') || l.includes('marital') || l.includes('divorce') || l.includes('child') || l.includes('domestic')) return 'Family'
  if (l.includes('financial') || l.includes('fraud') || l.includes('scam') || l.includes('theft')) return 'Financial'
  if (l.includes('missing')) return 'Missing Person'
  if (l.includes('passport') || l.includes('document') || l.includes('visa') || l.includes('overstay')) return 'Documents'
  return 'Other'
}

// ── drill panel (right drawer) ─────────────────────────────────────────────────

type Drill = { title: string; cases: PanelCase[] }

function DrillPanel({ drill, onClose }: { drill: Drill; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-brand-navy/20 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-brand-border bg-brand-card shadow-2xl sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">{drill.title}</p>
            <p className="text-[10px] text-brand-muted">{drill.cases.length} case{drill.cases.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-brand-muted hover:bg-brand-navy/5"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Case list */}
        <div className="flex-1 overflow-y-auto divide-y divide-brand-border/50">
          {drill.cases.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-brand-muted">No cases in this group</div>
          ) : (
            drill.cases.map(c => {
              const priority = getPriority(c.case_type, c.status, c.created_at)
              const days     = daysOpen(c.created_at)
              const isOpen   = openId === c.id
              return (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-bg"
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: PRIORITY_DOT[priority] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-navy">{c.name ?? 'Individual'}</p>
                      <p className="truncate text-[11px] text-brand-muted">
                        {c.case_type} · {c.assigned_emirate} · {c.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      days >= 14 ? 'bg-red-100 text-red-700' : days >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {days}d
                    </span>
                    <span className="text-[10px] text-brand-muted/40">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-brand-border/30 bg-brand-bg px-4 pb-4 pt-3">
                      {c.case_brief ? (
                        <ul className="mb-3 space-y-1">
                          {c.case_brief.split('\n').filter(s => s.trim().length > 6).map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-brand-muted">
                              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />
                              {b.trim()}
                            </li>
                          ))}
                        </ul>
                      ) : c.polished_summary ? (
                        <p className="mb-3 text-[11px] leading-relaxed text-brand-muted line-clamp-4">{c.polished_summary}</p>
                      ) : null}

                      {c.company_name && (
                        <p className="mb-2 text-[10px] text-brand-muted">Employer: <span className="font-semibold text-brand-navy">{c.company_name}</span></p>
                      )}
                      {c.date_of_incident && (
                        <p className="mb-2 text-[10px] text-brand-muted">Incident: <span className="font-semibold text-brand-navy">{c.date_of_incident}</span></p>
                      )}

                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-navy-light hover:underline"
                      >
                        View full case &amp; attachments →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}

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
  label, value, suffix = '', trend, inverseTrend, sub, onClick,
}: {
  label: string; value: number; suffix?: string
  trend?: number; inverseTrend?: boolean; sub?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-xl border border-brand-border bg-brand-card px-4 py-3.5 text-left transition-all ${
        onClick ? 'cursor-pointer hover:border-brand-navy hover:shadow-md' : 'cursor-default'
      }`}
    >
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-brand-muted">{label}</p>
      <p className="text-2xl font-black tabular-nums text-brand-navy">{value}{suffix}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {trend !== undefined && <TrendBadge value={trend} inverse={inverseTrend} />}
        {sub && <span className="text-[9px] text-brand-muted">{sub}</span>}
      </div>
      {onClick && <span className="mt-1.5 text-[9px] font-medium text-brand-navy/40">Click to view cases ›</span>}
    </button>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export function AmbassadorExecutive({
  data,
  cases,
}: {
  data: ExecutiveData
  cases: PanelCase[]
}) {
  const { kpis, riskScore, pulse, categories, mission, funnel, resolutionEfficiency, aiContext } = data

  // ── AI state ──────────────────────────────────────────────────────────────
  const [risks,        setRisks]        = useState<RiskItem[] | null>(null)
  const [risksLoading, setRisksLoading] = useState(true)
  const [brief,        setBrief]        = useState<string | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefType,    setBriefType]    = useState<'daily' | 'weekly' | 'monthly' | null>(null)
  const [aiAnswer,     setAiAnswer]     = useState<string | null>(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [question,     setQuestion]     = useState('')
  const [briefError,   setBriefError]   = useState(false)
  const [aiError,      setAiError]      = useState(false)
  const briefRef = useRef<HTMLDivElement>(null)

  // ── drill state ───────────────────────────────────────────────────────────
  const [drill, setDrill] = useState<Drill | null>(null)

  function openDrill(title: string, filtered: PanelCase[]) {
    setDrill({ title, cases: filtered })
  }

  // ── case filters ──────────────────────────────────────────────────────────
  const activeCases   = cases.filter(c => !['resolved', 'closed'].includes(c.status))
  const criticalCases = activeCases.filter(c => getPriority(c.case_type, c.status, c.created_at) === 'critical')

  // Load emerging risks on mount
  useEffect(() => {
    getEmergingRisks(aiContext)
      .then(r => { setRisks(r); setRisksLoading(false) })
      .catch(() => setRisksLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBrief(type: 'daily' | 'weekly' | 'monthly') {
    setBriefType(type)
    setBriefLoading(true)
    setBrief(null)
    setBriefError(false)
    startTransition(async () => {
      try {
        const result = await getAmbassadorBrief(aiContext, type)
        if (result) {
          setBrief(result)
          setTimeout(() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
        } else {
          setBriefError(true)
        }
      } catch {
        setBriefError(true)
      } finally {
        setBriefLoading(false)
      }
    })
  }

  function handleAsk(q: string) {
    if (!q.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    setAiError(false)
    startTransition(async () => {
      try {
        const result = await getAIAnswer(q, aiContext)
        if (result) {
          setAiAnswer(result)
        } else {
          setAiError(true)
        }
      } catch {
        setAiError(true)
      } finally {
        setAiLoading(false)
      }
    })
  }

  const rscCfg = RISK_CFG[riskScore.score]

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI Bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard
          label="Active Cases"   value={kpis.activeCases}       trend={kpis.volumeTrend}      inverseTrend sub="vs last month"
          onClick={() => openDrill(`Active Cases (${activeCases.length})`, activeCases)}
        />
        <KpiCard
          label="Critical Cases" value={kpis.criticalCases}     trend={kpis.criticalTrend}    inverseTrend sub="new this month"
          onClick={() => openDrill(`Critical Cases (${criticalCases.length})`, criticalCases)}
        />
        <KpiCard label="Avg Resolution"  value={kpis.avgResolutionDays} suffix=" d"  trend={kpis.resolutionTrend} inverseTrend sub="vs 30d prior" />
        <KpiCard
          label="Response Rate"  value={kpis.responseRate}       suffix="%"  trend={kpis.responseTrend}  sub="ack ≤48h"
          onClick={() => openDrill('Forwarded to Embassy', cases.filter(c => c.status !== 'submitted'))}
        />
        {/* AI Risk Score */}
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

        {/* Priority × Status Heatmap — 2 cols, open cases only */}
        {(() => {
          const COLS = [
            { label: 'Submitted',       keys: ['submitted', 'sent'] },
            { label: 'Acknowledged',    keys: ['acknowledged'] },
            { label: 'Awaiting Info',   keys: ['need_more_info'] },
            { label: 'In Progress',     keys: ['in_progress'] },
            { label: 'Resolved',        keys: ['resolved', 'closed'] },
          ]
          const PRIOS = [
            { key: 'critical' as const, label: 'Critical', light: '#FEECEC', mid: '#F7C1C1', strong: '#E54B4B', txt: '#A32D2D' },
            { key: 'high'     as const, label: 'High',     light: '#FEF4E7', mid: '#FAD09A', strong: '#EF9F27', txt: '#854F0B' },
            { key: 'medium'   as const, label: 'Medium',   light: '#E6F1FB', mid: '#B5D4F4', strong: '#185FA5', txt: '#0C447C' },
            { key: 'normal'   as const, label: 'Normal',   light: '#EAF3DE', mid: '#C0DD97', strong: '#639922', txt: '#3B6D11' },
          ]
          const rows = PRIOS.map(p => {
            const cells = COLS.map(col => {
              const filtered = cases.filter(c =>
                getPriority(c.case_type, c.status, c.created_at) === p.key &&
                col.keys.includes(c.status)
              )
              return { ...col, count: filtered.length, cases: filtered }
            })
            const total = cases.filter(c => getPriority(c.case_type, c.status, c.created_at) === p.key).length
            return { ...p, cells, total }
          })
          const maxCount = Math.max(...rows.flatMap(r => r.cells.map(c => c.count)), 1)

          function cellStyle(count: number, light: string, mid: string, strong: string, txt: string) {
            if (count === 0) return { background: '#F5F2EE', color: '#C8C5BC' }
            const r = count / maxCount
            if (r < 0.3) return { background: light, color: txt }
            if (r < 0.65) return { background: mid, color: txt }
            return { background: strong, color: '#fff' }
          }

          return (
            <div className="col-span-1 rounded-xl border border-brand-border bg-brand-card p-4 sm:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Priority × Status</p>
                  <p className="text-[9px] text-brand-muted">All cases · darker = more · click any cell to drill</p>
                </div>
                <p className="text-[9px] text-brand-muted">{cases.filter(c => !['resolved','closed'].includes(c.status)).length} open · {cases.filter(c => ['resolved','closed'].includes(c.status)).length} resolved</p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 380 }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '76px repeat(5,1fr) 40px', gap: 4, marginBottom: 4 }}>
                    <div />
                    {COLS.map(c => (
                      <div key={c.label} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888780', textAlign: 'center' }}>{c.label}</div>
                    ))}
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888780', textAlign: 'center' }}>Total</div>
                  </div>

                  {/* Data rows */}
                  {rows.map(row => (
                    <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '76px repeat(5,1fr) 40px', gap: 4, marginBottom: 4 }}>
                      {/* Row label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: row.strong, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: row.txt }}>{row.label}</span>
                      </div>
                      {/* Cells */}
                      {row.cells.map(cell => {
                        const s = cellStyle(cell.count, row.light, row.mid, row.strong, row.txt)
                        return (
                          <button
                            key={cell.label}
                            onClick={() => cell.count > 0 && openDrill(`${row.label} · ${cell.label}`, cell.cases)}
                            className="focus:outline-none"
                            style={{
                              borderRadius: 7, background: s.background, color: s.color,
                              fontSize: 18, fontWeight: 700, padding: '10px 4px',
                              textAlign: 'center', border: 'none',
                              cursor: cell.count > 0 ? 'pointer' : 'default',
                              transition: 'filter 0.1s',
                            }}
                            onMouseEnter={e => { if (cell.count > 0) (e.currentTarget as HTMLElement).style.filter = 'brightness(0.92)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
                          >
                            {cell.count > 0 ? cell.count : '—'}
                          </button>
                        )
                      })}
                      {/* Row total */}
                      <div style={{
                        borderRadius: 7, fontSize: 15, fontWeight: 700, padding: '10px 4px',
                        textAlign: 'center',
                        background: row.total > 0 ? row.light : '#F5F2EE',
                        color: row.total > 0 ? row.txt : '#C8C5BC',
                      }}>
                        {row.total > 0 ? row.total : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Category Donut — click segment to drill */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <div className="mb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Case Categories</p>
            <p className="text-[9px] text-brand-muted">Click a segment or label to view cases</p>
          </div>
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
                  style={{ cursor: 'pointer' }}
                  onClick={(_d, index) => {
                    const cat = categories[index]
                    if (!cat) return
                    const filtered = cases.filter(c => toCategory(c.case_type) === cat.label)
                    openDrill(`${cat.label} Cases (${filtered.length})`, filtered)
                  }}
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
                        <p>{cat.pct}% &nbsp;({cat.value} cases)</p>
                        <p style={{ fontSize: 9, color: '#888780' }}>Click to view</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
            {categories.slice(0, 6).map(c => (
              <button
                key={c.label}
                type="button"
                onClick={() => openDrill(`${c.label} Cases`, cases.filter(cs => toCategory(cs.case_type) === c.label))}
                className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 hover:bg-brand-bg"
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-left text-[9px] text-brand-muted">{c.label}</span>
                <span className="text-[9px] font-semibold text-brand-navy">{c.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data cards row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* Mission Split — click each mission row */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-muted">Mission Split</p>
          <div className="space-y-3">
            {[
              {
                label: 'Mission Abu Dhabi', d: mission.abuDhabi, color: '#185FA5',
                filtered: cases.filter(c => c.assigned_emirate === 'Abu Dhabi'),
              },
              {
                label: 'Mission Dubai', d: mission.dubai, color: '#EF9F27',
                filtered: cases.filter(c => c.assigned_emirate !== 'Abu Dhabi'),
              },
            ].map(({ label, d, color, filtered }) => (
              <button
                key={label}
                type="button"
                onClick={() => openDrill(`${label} (${filtered.length})`, filtered)}
                className="w-full rounded-lg p-2 text-left transition-colors hover:bg-brand-bg"
              >
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
                <p className="mt-0.5 text-[9px] text-brand-muted">{d.pct}% of total · click to view ›</p>
              </button>
            ))}
            <div className="border-t border-brand-border/50 pt-2 text-[10px] text-brand-muted space-y-0.5">
              <p>All missions: <span className="font-semibold text-brand-navy">{mission.total}</span></p>
              <p>Resolution efficiency: <span className="font-semibold text-brand-navy">{resolutionEfficiency}%</span></p>
            </div>
          </div>
        </div>

        {/* Embassy Funnel — click each stage */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-muted">Embassy Funnel</p>
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const maxCount = funnel[0]?.count || 1
              const pct      = Math.round(f.count / maxCount * 100)
              // Determine which cases belong to this stage
              const stageCases = (() => {
                if (f.label === 'Cases received')  return cases.filter(c => c.status !== 'submitted')
                if (f.label === 'Acknowledged')    return cases.filter(c => ['acknowledged','need_more_info','in_progress','resolved','closed'].includes(c.status))
                if (f.label === 'Embassy action')  return cases.filter(c => ['in_progress','resolved','closed'].includes(c.status))
                if (f.label === 'Resolved')        return cases.filter(c => ['resolved','closed'].includes(c.status))
                return []
              })()
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => openDrill(`${f.label} (${stageCases.length})`, stageCases)}
                  className="w-full rounded-lg p-1.5 text-left transition-colors hover:bg-brand-bg"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-brand-muted">{f.label}</span>
                    <span className="text-[11px] font-bold text-brand-navy">{f.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-brand-bg">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Emerging Risks */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Emerging Risks</p>
            <span className="text-[9px] text-brand-muted/60">AI-assisted</span>
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
              <p className="text-[9px] text-brand-muted">AI-assisted · under 200 words</p>
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

          {!brief && !briefLoading && !briefError && (
            <button
              type="button"
              onClick={() => handleBrief('daily')}
              className="w-full rounded-xl border-2 border-dashed border-brand-border py-7 text-[11px] font-semibold text-brand-muted transition-colors hover:border-brand-navy hover:text-brand-navy"
            >
              Brief me now →
            </button>
          )}

          {briefError && !briefLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold text-red-700">AI service unavailable</p>
              <button
                type="button"
                onClick={() => handleBrief(briefType ?? 'daily')}
                className="mt-1.5 text-[10px] text-red-600 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
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

          {aiError && !aiLoading && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold text-red-700">AI service unavailable — try again</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Drill Panel ─────────────────────────────────────────────── */}
      {drill && <DrillPanel drill={drill} onClose={() => setDrill(null)} />}

    </div>
  )
}
