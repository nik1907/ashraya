'use client'

import { useMemo, useRef, useState } from 'react'

import { PrintButton } from '@/components/PrintButton'
import { fmtLongDateNoWeekday } from '@/lib/dates'
import { casesToCsvRows, downloadCsv, toCsv } from '@/lib/exportCsv'
import {
  availableYears,
  defaultPeriod,
  makeCalendarBuckets,
  makePeriod,
  type Bucket,
  type PeriodKind,
  type ReportPeriod,
} from '@/lib/reportPeriods'
import type { PanelCase } from './CaseSidePanel'

// ─── types ────────────────────────────────────────────────────────────────────

type TCase = PanelCase & { updated_at?: string | null }

const PERIOD_KINDS: PeriodKind[] = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL']

const CRISIS_KEYS = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
const isCrisis = (t: string) => CRISIS_KEYS.some(k => t.toLowerCase().includes(k))
const SLA_H = 48
const SLA_TARGET_PCT = 90

// ─── helpers ──────────────────────────────────────────────────────────────────

function getResolvedAt(c: TCase): number | null {
  if (!['resolved', 'closed'].includes(c.status)) return null
  return c.updated_at ? new Date(c.updated_at).getTime() : null
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

// ─── data computation ─────────────────────────────────────────────────────────

type BucketStats = Bucket & {
  newCases: number
  resolvedCases: number
  openAtEnd: number
  crisisCases: number
  adCases: number
  dubaiCases: number
  slaCompliant: number
  slaTotal: number
}

function computeBuckets(cases: TCase[], buckets: Bucket[]): BucketStats[] {
  return buckets.map(b => {
    const inBucket = (t: number) => t >= b.start && t < b.end
    const created  = (c: TCase)  => new Date(c.created_at).getTime()
    const resolved = (c: TCase)  => getResolvedAt(c)
    const emirate  = (c: TCase)  => (c.assigned_emirate ?? '').toLowerCase()

    const newCases      = cases.filter(c => inBucket(created(c))).length
    const resolvedCases = cases.filter(c => { const r = resolved(c); return r !== null && inBucket(r) }).length
    const openAtEnd     = cases.filter(c => {
      if (created(c) >= b.end) return false
      const r = resolved(c)
      return r === null || r >= b.end
    }).length
    const crisisCases   = cases.filter(c => inBucket(created(c)) && isCrisis(c.case_type)).length
    const adCases       = cases.filter(c => inBucket(created(c)) && emirate(c).includes('abu')).length
    const dubaiCases    = cases.filter(c => inBucket(created(c)) && emirate(c).includes('dubai')).length

    const crisisRes     = cases.filter(c => { const r = resolved(c); return r !== null && inBucket(r) && isCrisis(c.case_type) })
    const slaTotal      = crisisRes.length
    const slaCompliant  = crisisRes.filter(c => {
      const r = resolved(c)!
      return (r - created(c)) / 3_600_000 <= SLA_H
    }).length

    return { ...b, newCases, resolvedCases, openAtEnd, crisisCases, adCases, dubaiCases, slaCompliant, slaTotal }
  })
}

type KPIs = {
  resolutionRate: number | null
  netBacklogChange: number | null
  medianResolveDays: number | null
  slaCompliance: number | null
  openNow: number
}

function computeKPIs(cases: TCase[], buckets: BucketStats[]): KPIs {
  const totalNew      = buckets.reduce((s, b) => s + b.newCases, 0)
  const totalResolved = buckets.reduce((s, b) => s + b.resolvedCases, 0)
  const resolutionRate = totalNew > 0 ? Math.round((totalResolved / totalNew) * 100) : null

  const first = buckets[0]
  const last  = buckets[buckets.length - 1]
  const netBacklogChange = first && last ? last.openAtEnd - first.openAtEnd : null

  const periodStart = first?.start ?? 0
  const periodEnd   = last?.end ?? Date.now()
  const days = cases
    .map(c => { const r = getResolvedAt(c); if (!r || r < periodStart || r >= periodEnd) return null; return (r - new Date(c.created_at).getTime()) / 86_400_000 })
    .filter((d): d is number => d !== null && d >= 0)
  const medianResolveDays = days.length > 0 ? Math.round(median(days)) : null

  const slaT = buckets.reduce((s, b) => s + b.slaTotal, 0)
  const slaC = buckets.reduce((s, b) => s + b.slaCompliant, 0)
  const slaCompliance = slaT > 0 ? Math.round((slaC / slaT) * 100) : null

  const openNow = cases.filter(c => !['resolved', 'closed'].includes(c.status)).length

  return { resolutionRate, netBacklogChange, medianResolveDays, slaCompliance, openNow }
}

type TypeMedian = { type: string; median: number; count: number }

function computeMedianByType(cases: TCase[], periodStart: number, periodEnd: number): TypeMedian[] {
  const m = new Map<string, number[]>()
  for (const c of cases) {
    const r = getResolvedAt(c)
    if (!r || r < periodStart || r >= periodEnd) continue
    const d = (r - new Date(c.created_at).getTime()) / 86_400_000
    if (d < 0) continue
    if (!m.has(c.case_type)) m.set(c.case_type, [])
    m.get(c.case_type)!.push(d)
  }
  return [...m.entries()]
    .map(([type, arr]) => ({ type, median: Math.round(median(arr)), count: arr.length }))
    .sort((a, b) => b.median - a.median)
    .slice(0, 10)
}

// ─── CSV shaping ──────────────────────────────────────────────────────────────

function bucketsToCsvRows(stats: BucketStats[], kpis: KPIs): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['Month', 'New Cases', 'Resolved Cases', 'Open at End', 'Crisis Cases', 'Abu Dhabi', 'Dubai', 'SLA Compliant', 'SLA Total']
  const rows: (string | number)[][] = stats.map(b => [
    b.label, b.newCases, b.resolvedCases, b.openAtEnd, b.crisisCases, b.adCases, b.dubaiCases, b.slaCompliant, b.slaTotal,
  ])
  rows.push([])
  rows.push(['KPI', 'Value'])
  rows.push(['Resolution Rate (%)', kpis.resolutionRate ?? ''])
  rows.push(['Net Backlog Change', kpis.netBacklogChange ?? ''])
  rows.push(['Median Resolve Days', kpis.medianResolveDays ?? ''])
  rows.push(['SLA Compliance (%)', kpis.slaCompliance ?? ''])
  return { headers, rows }
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const GB = { W: 600, H: 200, t: 32, r: 16, b: 40, l: 36 } // grouped bar
const AR = { W: 600, H: 160, t: 20, r: 16, b: 28, l: 36 } // area
const SM = { W: 400, H: 140, t: 20, r: 12, b: 28, l: 30 } // small (line / emirate)

const NAVY   = '#0b2545'
const GREEN  = '#16a34a'
const RED    = '#E24B4A'
const AMBER  = '#f59e0b'
const SLATE  = '#94a3b8'

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, suffix = '', note, valueColor = NAVY }: {
  label: string; value: number | null; suffix?: string; note?: string; valueColor?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-brand-border bg-brand-card px-4 py-4 text-center">
      <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{label}</span>
      <span className="text-2xl font-black tabular-nums" style={{ color: valueColor }}>
        {value === null ? '—' : `${value}${suffix}`}
      </span>
      {note && <span className="text-[10px] text-brand-muted">{note}</span>}
    </div>
  )
}

// ─── Chart: Grouped Bar — New vs Resolved ─────────────────────────────────────

function GroupedBarChart({ buckets }: { buckets: BucketStats[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ label: string; n: number; r: number; x: number; y: number } | null>(null)

  if (buckets.length === 0) return <NoData />

  const PW = GB.W - GB.l - GB.r
  const PH = GB.H - GB.t - GB.b
  const maxVal = Math.max(1, ...buckets.flatMap(b => [b.newCases, b.resolvedCases]))
  const n = buckets.length
  const bucketW = PW / n
  const barW = Math.min(22, Math.max(6, (bucketW - 8) / 2))

  function barX(i: number, side: 0 | 1) {
    const cx = GB.l + (i + 0.5) * bucketW
    return side === 0 ? cx - barW - 1.5 : cx + 1.5
  }
  function barY(val: number) { return GB.t + PH - (val / maxVal) * PH }
  function barH(val: number) { return (val / maxVal) * PH }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold text-brand-navy">New vs Resolved Cases</p>
        <div className="flex items-center gap-3 text-[10px] text-brand-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: NAVY }} />New</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: GREEN }} />Resolved</span>
        </div>
      </div>
      <div style={{ height: GB.H }}>
        <svg ref={svgRef} viewBox={`0 0 ${GB.W} ${GB.H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setTip(null)}>
          {/* Y-axis guide lines */}
          {[0.25, 0.5, 0.75, 1].map(f => {
            const y = GB.t + PH - f * PH
            const v = Math.round(maxVal * f)
            return (
              <g key={f}>
                <line x1={GB.l} y1={y} x2={GB.W - GB.r} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                <text x={GB.l - 4} y={y + 3} fontSize="7" fill={SLATE} textAnchor="end">{v}</text>
              </g>
            )
          })}
          {/* Zero line */}
          <line x1={GB.l} y1={GB.t + PH} x2={GB.W - GB.r} y2={GB.t + PH} stroke="#cbd5e1" strokeWidth="0.8" />

          {/* Bars */}
          {buckets.map((b, i) => {
            const x0 = barX(i, 0), x1 = barX(i, 1)
            const hN = barH(b.newCases), hR = barH(b.resolvedCases)
            return (
              <g key={i} style={{ cursor: 'default' }}
                onMouseEnter={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip({ label: b.label || '…', n: b.newCases, r: b.resolvedCases, x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
                onMouseMove={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
                }}
              >
                {/* new bar */}
                {hN > 0 && <rect x={x0} y={barY(b.newCases)} width={barW} height={hN} fill={NAVY} fillOpacity="0.85" rx="1.5" />}
                {/* resolved bar */}
                {hR > 0 && <rect x={x1} y={barY(b.resolvedCases)} width={barW} height={hR} fill={GREEN} fillOpacity="0.85" rx="1.5" />}
                {/* x-axis label */}
                {b.label && (
                  <text x={GB.l + (i + 0.5) * bucketW} y={GB.t + PH + 14} fontSize="7" fill={SLATE} textAnchor="middle">{b.label}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      {tip && (
        <div className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg text-[11px]"
          style={{ left: tip.x + 10, top: tip.y - 50 }}>
          <p className="font-semibold text-brand-navy mb-0.5">{tip.label}</p>
          <p className="text-brand-muted">New: <span className="font-semibold text-brand-navy">{tip.n}</span></p>
          <p className="text-brand-muted">Resolved: <span className="font-semibold text-green-700">{tip.r}</span></p>
        </div>
      )}
    </div>
  )
}

// ─── Chart: Area — Backlog Over Time ─────────────────────────────────────────

function BacklogAreaChart({ buckets }: { buckets: BucketStats[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ val: number; label: string; x: number; y: number } | null>(null)

  if (buckets.length === 0) return <NoData />

  const PW = AR.W - AR.l - AR.r
  const PH = AR.H - AR.t - AR.b
  const maxVal = Math.max(1, ...buckets.map(b => b.openAtEnd))
  const n = buckets.length

  function px(i: number) { return AR.l + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW) }
  function py(v: number) { return AR.t + PH - (v / maxVal) * PH }

  const pts = buckets.map((b, i) => ({ x: px(i), y: py(b.openAtEnd), b }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(AR.t + PH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(AR.t + PH).toFixed(1)} Z`

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
      <p className="mb-2 text-[11px] font-bold text-brand-navy">Open Backlog Over Time</p>
      <div style={{ height: AR.H }} className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${AR.W} ${AR.H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setTip(null)}>
          {/* Y guides */}
          {[0.5, 1].map(f => {
            const y = AR.t + PH - f * PH
            return (
              <g key={f}>
                <line x1={AR.l} y1={y} x2={AR.W - AR.r} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                <text x={AR.l - 4} y={y + 3} fontSize="7" fill={SLATE} textAnchor="end">{Math.round(maxVal * f)}</text>
              </g>
            )
          })}
          {/* Area fill */}
          <path d={areaPath} fill={NAVY} fillOpacity="0.08" />
          {/* Line */}
          <path d={linePath} fill="none" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* Dots + labels */}
          {pts.map((p, i) => (
            <g key={i}
              onMouseEnter={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip({ val: p.b.openAtEnd, label: p.b.label, x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
              }}
            >
              <circle cx={p.x} cy={p.y} r={8} fill="transparent" style={{ cursor: 'default' }} />
              <circle cx={p.x} cy={p.y} r={3} fill={NAVY} />
              {p.b.label && (
                <text x={p.x} y={AR.t + PH + 14} fontSize="7" fill={SLATE} textAnchor="middle">{p.b.label}</text>
              )}
            </g>
          ))}
        </svg>
        {tip && (
          <div className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg text-[11px]"
            style={{ left: tip.x + 10, top: Math.max(0, tip.y - 48) }}>
            <p className="text-brand-muted">{tip.label}</p>
            <p className="font-semibold text-brand-navy">{tip.val} open</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chart: Horizontal Bar — Median Days to Resolve by Type ──────────────────

function HorizontalBarChart({ data }: { data: TypeMedian[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
        <p className="mb-2 text-[11px] font-bold text-brand-navy">Median Days to Resolve — by Type</p>
        <p className="text-[11px] text-brand-muted py-6 text-center">No resolved cases in selected period</p>
      </div>
    )
  }

  const PAD = { t: 28, r: 60, b: 12, l: 120 }
  const W = 600
  const PW = W - PAD.l - PAD.r
  const rowH = 26
  const H = PAD.t + data.length * rowH + PAD.b
  const maxMedian = Math.max(1, ...data.map(d => d.median))

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
      <p className="mb-2 text-[11px] font-bold text-brand-navy">Median Days to Resolve — by Type</p>
      <div style={{ height: Math.min(H + 8, 300), overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          {/* axis line */}
          <line x1={PAD.l} y1={PAD.t - 8} x2={PAD.l} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth="0.8" />
          {/* reference guides */}
          {[0.25, 0.5, 0.75, 1].map(f => {
            const x = PAD.l + f * PW
            return (
              <g key={f}>
                <line x1={x} y1={PAD.t - 8} x2={x} y2={H - PAD.b} stroke="#f1f5f9" strokeWidth="0.6" />
                <text x={x} y={PAD.t - 11} fontSize="6.5" fill={SLATE} textAnchor="middle">{Math.round(maxMedian * f)}d</text>
              </g>
            )
          })}
          {/* bars */}
          {data.map((d, i) => {
            const y = PAD.t + i * rowH
            const bw = (d.median / maxMedian) * PW
            const aboveSla = d.median > 14
            const color = aboveSla ? RED : NAVY
            const label = d.type.length > 18 ? d.type.slice(0, 17) + '…' : d.type
            return (
              <g key={d.type}>
                <rect x={PAD.l} y={y + 6} width={Math.max(bw, 2)} height={14} fill={color} fillOpacity={aboveSla ? 0.75 : 0.85} rx="2" />
                <text x={PAD.l - 6} y={y + 16} fontSize="7.5" fill={NAVY} textAnchor="end">{label}</text>
                <text x={PAD.l + bw + 5} y={y + 16} fontSize="7.5" fill={color} fontWeight="700">{d.median}d</text>
                <text x={W - 4} y={y + 16} fontSize="6.5" fill={SLATE} textAnchor="end">({d.count})</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="mt-1 text-[9px] text-brand-muted">Red bars exceed 14-day benchmark · count in parentheses</p>
    </div>
  )
}

// ─── Chart: Small Line ────────────────────────────────────────────────────────

type SmallLineSeries = { values: number[]; color: string; label?: string }

function SmallLineChart({
  title, buckets, series, yLabel, targetPct, note,
}: {
  title: string
  buckets: Bucket[]
  series: SmallLineSeries[]
  yLabel?: (v: number) => string
  targetPct?: number
  note?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ vals: number[]; label: string; x: number; y: number } | null>(null)
  const n = buckets.length

  const allVals = series.flatMap(s => s.values)
  const maxVal = Math.max(1, ...allVals, targetPct ?? 0)

  const PW = SM.W - SM.l - SM.r
  const PH = SM.H - SM.t - SM.b

  function px(i: number) { return SM.l + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW) }
  function py(v: number) { return SM.t + PH - (v / maxVal) * PH }
  function fmt(v: number) { return yLabel ? yLabel(v) : String(v) }

  if (n === 0 || allVals.every(v => v === 0)) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card p-4 flex flex-col gap-1 print:break-inside-avoid">
        <p className="text-[11px] font-bold text-brand-navy">{title}</p>
        <p className="text-[11px] text-brand-muted text-center py-8">No data for selected period</p>
      </div>
    )
  }

  const targetY = targetPct !== undefined ? py(targetPct) : null

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-bold text-brand-navy">{title}</p>
        {series.length > 1 && (
          <div className="flex gap-2">
            {series.map(s => (
              <span key={s.label} className="flex items-center gap-1 text-[9px] text-brand-muted">
                <span className="inline-block h-1.5 w-3 rounded" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: SM.H }} className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${SM.W} ${SM.H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setTip(null)}>
          {/* Y guides */}
          {[0, 0.5, 1].map(f => {
            const y = SM.t + PH - f * PH
            return (
              <g key={f}>
                <line x1={SM.l} y1={y} x2={SM.W - SM.r} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                <text x={SM.l - 3} y={y + 3} fontSize="6.5" fill={SLATE} textAnchor="end">{fmt(Math.round(maxVal * f))}</text>
              </g>
            )
          })}
          {/* SLA target line */}
          {targetY !== null && (
            <line x1={SM.l} y1={targetY} x2={SM.W - SM.r} y2={targetY}
              stroke={AMBER} strokeWidth="1" strokeDasharray="4 3" />
          )}

          {/* Series lines */}
          {series.map(s => {
            const pts = s.values.map((v, i) => ({ x: px(i), y: py(v) }))
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
            return (
              <g key={s.label ?? s.color}>
                <path d={path} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={s.color} />
                ))}
              </g>
            )
          })}

          {/* Invisible hover targets */}
          {buckets.map((b, i) => (
            <rect key={i} x={px(i) - 10} y={SM.t} width={20} height={PH} fill="transparent"
              style={{ cursor: 'default' }}
              onMouseEnter={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip({ label: b.label, vals: series.map(s => s.values[i] ?? 0), x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
              }}
            />
          ))}

          {/* X labels */}
          {buckets.map((b, i) => b.label ? (
            <text key={i} x={px(i)} y={SM.t + PH + 14} fontSize="6.5" fill={SLATE} textAnchor="middle">{b.label}</text>
          ) : null)}

          {/* Target label */}
          {targetY !== null && targetPct !== undefined && (
            <text x={SM.W - SM.r - 2} y={targetY - 3} fontSize="6" fill={AMBER} textAnchor="end">target {targetPct}%</text>
          )}
        </svg>
        {tip && (
          <div className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg text-[11px]"
            style={{ left: Math.min(tip.x + 10, 180), top: Math.max(0, tip.y - 52) }}>
            <p className="font-semibold text-brand-navy mb-0.5">{tip.label}</p>
            {series.map((s, j) => (
              <p key={j} className="text-brand-muted">
                {s.label ? `${s.label}: ` : ''}<span className="font-semibold" style={{ color: s.color }}>{fmt(tip.vals[j])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      {note && <p className="mt-1 text-[9px] text-brand-muted">{note}</p>}
    </div>
  )
}

// ─── Chart: Emirate grouped bar ───────────────────────────────────────────────

function EmirateBarChart({ buckets }: { buckets: BucketStats[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ ad: number; dubai: number; label: string; x: number; y: number } | null>(null)

  if (buckets.length === 0) return <NoData />

  const PW = SM.W - SM.l - SM.r
  const PH = SM.H - SM.t - SM.b
  const maxVal = Math.max(1, ...buckets.flatMap(b => [b.adCases, b.dubaiCases]))
  const n = buckets.length
  const bucketW = PW / n
  const barW = Math.min(18, Math.max(4, (bucketW - 6) / 2))

  function bx(i: number, side: 0 | 1) {
    const cx = SM.l + (i + 0.5) * bucketW
    return side === 0 ? cx - barW - 1 : cx + 1
  }
  function by(v: number) { return SM.t + PH - (v / maxVal) * PH }
  function bh(v: number) { return (v / maxVal) * PH }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 print:break-inside-avoid">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-bold text-brand-navy">Abu Dhabi vs Dubai</p>
        <div className="flex gap-2 text-[9px] text-brand-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded" style={{ background: NAVY }} />Abu Dhabi</span>
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded" style={{ background: AMBER }} />Dubai</span>
        </div>
      </div>
      <div style={{ height: SM.H }} className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${SM.W} ${SM.H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setTip(null)}>
          {[0.5, 1].map(f => {
            const y = SM.t + PH - f * PH
            return (
              <g key={f}>
                <line x1={SM.l} y1={y} x2={SM.W - SM.r} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                <text x={SM.l - 3} y={y + 3} fontSize="6.5" fill={SLATE} textAnchor="end">{Math.round(maxVal * f)}</text>
              </g>
            )
          })}
          <line x1={SM.l} y1={SM.t + PH} x2={SM.W - SM.r} y2={SM.t + PH} stroke="#cbd5e1" strokeWidth="0.8" />

          {buckets.map((b, i) => {
            const hA = bh(b.adCases), hD = bh(b.dubaiCases)
            return (
              <g key={i}
                onMouseEnter={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip({ ad: b.adCases, dubai: b.dubaiCases, label: b.label, x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
                onMouseMove={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
                }}
              >
                {hA > 0 && <rect x={bx(i, 0)} y={by(b.adCases)} width={barW} height={hA} fill={NAVY} fillOpacity="0.8" rx="1" />}
                {hD > 0 && <rect x={bx(i, 1)} y={by(b.dubaiCases)} width={barW} height={hD} fill={AMBER} fillOpacity="0.8" rx="1" />}
                {b.label && <text x={SM.l + (i + 0.5) * bucketW} y={SM.t + PH + 14} fontSize="6.5" fill={SLATE} textAnchor="middle">{b.label}</text>}
              </g>
            )
          })}
        </svg>
        {tip && (
          <div className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg text-[11px]"
            style={{ left: tip.x + 10, top: Math.max(0, tip.y - 52) }}>
            <p className="font-semibold text-brand-navy mb-0.5">{tip.label}</p>
            <p className="text-brand-muted">Abu Dhabi: <span className="font-semibold" style={{ color: NAVY }}>{tip.ad}</span></p>
            <p className="text-brand-muted">Dubai: <span className="font-semibold" style={{ color: AMBER }}>{tip.dubai}</span></p>
          </div>
        )}
      </div>
    </div>
  )
}

function NoData() {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-brand-border bg-brand-card text-[11px] text-brand-muted print:break-inside-avoid">
      No data for selected period
    </div>
  )
}

// ─── Main ReportTab ───────────────────────────────────────────────────────────

export function ReportTab({ cases, designation }: { cases: PanelCase[]; designation?: string }) {
  const years = useMemo(() => availableYears(cases), [cases])
  const [period, setPeriod] = useState<ReportPeriod>(() => defaultPeriod())

  const buckets = useMemo(() => makeCalendarBuckets(period), [period])

  const stats = useMemo(() => computeBuckets(cases as TCase[], buckets), [cases, buckets])

  const kpis = useMemo(() => computeKPIs(cases as TCase[], stats), [cases, stats])

  const medianByType = useMemo(() => computeMedianByType(cases as TCase[], period.start, period.end), [cases, period])

  const hasUpdatedAt = useMemo(() => (cases as TCase[]).some(c => c.updated_at), [cases])

  // Series for small line charts
  const crisisSeries: SmallLineSeries[] = [{ values: stats.map(b => b.crisisCases), color: RED }]
  const slaSeries: SmallLineSeries[]    = [{ values: stats.map(b => b.slaTotal > 0 ? Math.round((b.slaCompliant / b.slaTotal) * 100) : 0), color: NAVY }]

  const generatedDateStr = fmtLongDateNoWeekday(new Date())
  const kindLabel = period.kind === 'ANNUAL' ? 'Annual' : 'Quarterly'

  function exportSummaryCsv() {
    const { headers, rows } = bucketsToCsvRows(stats, kpis)
    downloadCsv(`report-summary-${period.year}-${period.kind}.csv`, toCsv(headers, rows))
  }

  function exportCasesCsv() {
    const inPeriod = cases.filter(c => {
      const t = new Date(c.created_at).getTime()
      return t >= period.start && t < period.end
    })
    const { headers, rows } = casesToCsvRows(inPeriod)
    downloadCsv(`report-cases-${period.year}-${period.kind}.csv`, toCsv(headers, rows))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Report header (visible on screen and print) */}
      <p className="text-[11px] text-brand-muted">
        {kindLabel} Welfare Report — {period.label} · Generated {generatedDateStr}
        {designation ? ` · Prepared by ${designation}` : ''}
      </p>

      {/* Toolbar: period picker + export actions (screen only) */}
      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period.year}
            onChange={e => setPeriod(makePeriod(Number(e.target.value), period.kind))}
            className="rounded-lg border border-brand-border bg-brand-card px-2 py-1 text-[11px] font-bold text-brand-navy"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-brand-border bg-brand-card p-1">
            {PERIOD_KINDS.map(k => (
              <button key={k} type="button" onClick={() => setPeriod(makePeriod(period.year, k))}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all ${period.kind === k ? 'bg-brand-navy text-white' : 'text-brand-muted hover:text-brand-navy'}`}>
                {k === 'ANNUAL' ? 'Annual' : k}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportSummaryCsv}
            className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy">
            Summary CSV
          </button>
          <button type="button" onClick={exportCasesCsv}
            className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy">
            Case CSV
          </button>
          <PrintButton label="Export PDF" />
        </div>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:break-inside-avoid">
        <KpiTile
          label="Resolution Rate"
          value={kpis.resolutionRate}
          suffix="%"
          note={hasUpdatedAt ? 'resolved ÷ opened' : 'enable updated_at'}
          valueColor={kpis.resolutionRate === null ? SLATE : kpis.resolutionRate >= 90 ? GREEN : kpis.resolutionRate >= 70 ? AMBER : RED}
        />
        <KpiTile
          label="Net Backlog Change"
          value={kpis.netBacklogChange}
          note={kpis.netBacklogChange !== null ? (kpis.netBacklogChange <= 0 ? 'backlog shrinking ✓' : 'backlog growing') : undefined}
          valueColor={kpis.netBacklogChange === null ? SLATE : kpis.netBacklogChange <= 0 ? GREEN : RED}
        />
        <KpiTile
          label="Median Resolve"
          value={kpis.medianResolveDays}
          suffix={kpis.medianResolveDays !== null ? ' days' : ''}
          note={hasUpdatedAt ? 'across closed cases' : 'needs updated_at'}
          valueColor={kpis.medianResolveDays === null ? SLATE : kpis.medianResolveDays <= 7 ? GREEN : kpis.medianResolveDays <= 14 ? AMBER : RED}
        />
        <KpiTile
          label={`SLA Compliance (${SLA_H}h)`}
          value={kpis.slaCompliance}
          suffix="%"
          note="crisis cases only"
          valueColor={kpis.slaCompliance === null ? SLATE : kpis.slaCompliance >= SLA_TARGET_PCT ? GREEN : kpis.slaCompliance >= 75 ? AMBER : RED}
        />
      </div>

      {/* ── Primary chart: New vs Resolved ───────────────────────────────── */}
      <div className="relative">
        <GroupedBarChart buckets={stats} />
      </div>

      {/* ── Middle row: Backlog + Median by type ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative">
          <BacklogAreaChart buckets={stats} />
        </div>
        <HorizontalBarChart data={medianByType} />
      </div>

      {/* ── Bottom row: Crisis + SLA + Emirate ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative">
          <SmallLineChart
            title="Crisis Case Volume"
            buckets={buckets}
            series={crisisSeries}
            note="police / detention / trafficking / medical / missing"
          />
        </div>
        <div className="relative">
          <SmallLineChart
            title={`SLA Compliance — ${SLA_H}h`}
            buckets={buckets}
            series={slaSeries}
            yLabel={v => `${v}%`}
            targetPct={SLA_TARGET_PCT}
            note="crisis cases resolved within 48h · dashed line = 90% target"
          />
        </div>
        <EmirateBarChart buckets={stats} />
      </div>

      {!hasUpdatedAt && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] text-amber-700 print:hidden">
          Resolution-time metrics (median resolve days, SLA compliance) require <code>updated_at</code> in the case data. Ensure your Supabase table has <code>updated_at</code> with a trigger.
        </p>
      )}
    </div>
  )
}
