'use client'

import { useRef, useState } from 'react'
import type { PanelCase } from './CaseSidePanel'

type Dot = { type: string; volume: number; yoyPct: number; color: string; r: number }

function quadrantColor(yoyPct: number, volume: number, medianVolume: number) {
  const highVol = volume >= medianVolume
  if (highVol && yoyPct >= 0)  return '#E24B4A'
  if (highVol && yoyPct <  0)  return '#16a34a'
  if (!highVol && yoyPct > 50) return '#f59e0b'
  return '#94a3b8'
}

function typeHue(type: string) {
  let h = 0
  for (const ch of type) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h}, 60%, 52%)`
}

const W = 600, H = 240
const PAD = { t: 24, r: 20, b: 20, l: 24 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b

export function SignalQuadrant({
  inRange,
  prevYear,
  onTypeClick,
}: {
  inRange:     PanelCase[]
  prevYear:    PanelCase[]
  onTypeClick: (type: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ label: string; vol: number; yoy?: number; x: number; y: number } | null>(null)

  const currMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  for (const c of inRange)  currMap.set(c.case_type, (currMap.get(c.case_type) ?? 0) + 1)
  for (const c of prevYear) prevMap.set(c.case_type, (prevMap.get(c.case_type) ?? 0) + 1)

  const types = [...new Set([...currMap.keys(), ...prevMap.keys()])]

  if (types.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-brand-border bg-brand-card text-sm text-brand-muted">
        No case data for selected period
      </div>
    )
  }

  const volumes = types.map(t => currMap.get(t) ?? 0)
  const maxVol  = Math.max(1, ...volumes)

  // ─── Volume Baseline mode (no prior-year comparison data) ─────────────────
  if (prevYear.length === 0) {
    const sorted = [...types]
      .map((t, i) => ({ t, vol: volumes[i] }))
      .sort((a, b) => b.vol - a.vol)
    const count = sorted.length

    function toXV(i: number) { return PAD.l + ((i + 0.5) / count) * PW }
    function toYV(vol: number) { return PAD.t + PH - Math.max(0, vol / maxVol) * PH }

    return (
      <div className="relative select-none overflow-hidden rounded-xl border border-brand-border bg-brand-card" style={{ height: 240 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setTip(null)}
        >
          {/* Y-axis guide lines */}
          {[1, 2, 3, 4].map(tick => {
            const val = Math.round(maxVol * tick / 4)
            const y   = toYV(val)
            return (
              <g key={tick}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e2e8f0" strokeWidth="0.6" />
                <text x={PAD.l - 3} y={y + 2.5} fontSize="5.5" fill="#94a3b8" textAnchor="end">{val}</text>
              </g>
            )
          })}

          {/* bars + dots */}
          {sorted.map(({ t, vol }, i) => {
            const cx  = toXV(i)
            const cy  = toYV(vol)
            const col = typeHue(t)
            return (
              <g key={t} style={{ cursor: 'pointer' }}
                onClick={() => onTypeClick(t)}
                onMouseEnter={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip({ label: t, vol, x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
                onMouseMove={e => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (!rect) return
                  setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
                }}
              >
                <rect x={cx - 8} y={cy} width={16} height={PAD.t + PH - cy} fill={col} opacity="0.12" />
                <circle cx={cx} cy={cy} r={10} fill={col} fillOpacity="0.85" />
                {vol > 0 && (
                  <text x={cx} y={cy + 3} fontSize="6" fill="#fff" fontWeight="700" textAnchor="middle">{vol}</text>
                )}
              </g>
            )
          })}

          <text x={PAD.l + PW / 2} y={H - 2} fontSize="6.5" fill="#94a3b8" textAnchor="middle">
            Case volume by type — hover a dot to see type name · click to drill in
          </text>
          <text x={W - PAD.r} y={PAD.t - 8} fontSize="6" fill="#f59e0b" textAnchor="end" fontStyle="italic">
            Baseline — YoY comparison available once prior-year data exists
          </text>
        </svg>

        {tip && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg"
            style={{ left: Math.min(tip.x + 12, 400), top: Math.max(0, tip.y - 40), maxWidth: 200 }}
          >
            <p className="text-[11px] font-semibold text-brand-navy">{tip.label}</p>
            <p className="text-[10px] text-brand-muted">{tip.vol} case{tip.vol !== 1 ? 's' : ''} this period</p>
            <p className="mt-1 text-[9px] text-brand-navy/60">Click to view cases →</p>
          </div>
        )}
      </div>
    )
  }

  // ─── YoY Scatter mode (historical data available) ─────────────────────────
  const medVols  = [...volumes].sort((a, b) => a - b)
  const median   = medVols[Math.floor(medVols.length / 2)] ?? 1

  const rawYoy = types.map(t => {
    const cur  = currMap.get(t) ?? 0
    const prev = prevMap.get(t) ?? 0
    if (prev === 0) return cur > 0 ? 150 : 0
    return Math.round(((cur - prev) / prev) * 100)
  })

  const minYoy = Math.min(-40, ...rawYoy)
  const maxYoy = Math.max(40,  ...rawYoy)

  function toX(yoy: number) { return PAD.l + ((yoy - minYoy) / (maxYoy - minYoy)) * PW }
  function toY(vol: number) { return PAD.t + PH - (vol / maxVol) * PH }

  const midX = toX(0)
  const midY = toY(median)

  const dots: Dot[] = types.map((t, i) => {
    const vol = volumes[i]
    const yoy = rawYoy[i]
    const r   = Math.max(5, Math.min(10, Math.round(4 + (vol / maxVol) * 6)))
    return { type: t, volume: vol, yoyPct: yoy, color: quadrantColor(yoy, vol, median), r }
  })

  return (
    <div className="relative select-none overflow-hidden rounded-xl border border-brand-border bg-brand-card" style={{ height: 240 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
        onMouseLeave={() => setTip(null)}
      >
        {/* quadrant tints */}
        <rect x={midX}  y={PAD.t} width={W - PAD.r - midX} height={midY - PAD.t}      fill="#fee2e2" opacity="0.3" />
        <rect x={PAD.l} y={PAD.t} width={midX - PAD.l}     height={midY - PAD.t}      fill="#dcfce7" opacity="0.25" />
        <rect x={midX}  y={midY}  width={W - PAD.r - midX} height={PAD.t + PH - midY} fill="#fef9c3" opacity="0.25" />
        <rect x={PAD.l} y={midY}  width={midX - PAD.l}     height={PAD.t + PH - midY} fill="#f1f5f9" opacity="0.3" />

        {/* axis lines */}
        <line x1={midX}  y1={PAD.t}       x2={midX}       y2={PAD.t + PH} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4 3" />
        <line x1={PAD.l} y1={midY}        x2={PAD.l + PW} y2={midY}       stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4 3" />

        {/* quadrant labels */}
        <text x={midX + 5}  y={PAD.t + 9} fontSize="6.5" fill="#E24B4A" fontWeight="700">HIGH VOLUME · GROWING</text>
        <text x={PAD.l + 3} y={PAD.t + 9} fontSize="6.5" fill="#16a34a" fontWeight="700">IMPROVING ↓</text>
        <text x={midX + 5}  y={H - 8}     fontSize="6.5" fill="#f59e0b" fontWeight="700">EMERGING RISK</text>
        <text x={PAD.l + 3} y={H - 8}     fontSize="6.5" fill="#94a3b8" fontWeight="700">STABLE / LOW</text>

        <text x={PAD.l + PW / 2} y={H - 1} fontSize="7" fill="#94a3b8" textAnchor="middle">YoY % Change →</text>
        <text x={midX} y={H - 1} fontSize="6" fill="#94a3b8" textAnchor="middle">0%</text>

        {/* dots */}
        {dots.map(dot => {
          const cx = toX(dot.yoyPct)
          const cy = toY(dot.volume)
          return (
            <g key={dot.type} style={{ cursor: 'pointer' }}
              onClick={() => onTypeClick(dot.type)}
              onMouseEnter={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip({ label: dot.type, vol: dot.volume, yoy: dot.yoyPct, x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
              }}
            >
              <circle cx={cx} cy={cy} r={dot.r + 4} fill="transparent" />
              <circle cx={cx} cy={cy} r={dot.r} fill={dot.color} fillOpacity="0.85" />
              {dot.volume > 0 && (
                <text x={cx} y={cy + 2.5} fontSize="5.5" fill="#fff" fontWeight="700" textAnchor="middle">{dot.volume}</text>
              )}
            </g>
          )
        })}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg"
          style={{ left: Math.min(tip.x + 12, 400), top: Math.max(0, tip.y - 40), maxWidth: 200 }}
        >
          <p className="text-[11px] font-semibold text-brand-navy">{tip.label}</p>
          <p className="text-[10px] text-brand-muted">{tip.vol} case{tip.vol !== 1 ? 's' : ''}</p>
          {tip.yoy !== undefined && (
            <p className="text-[10px] text-brand-muted">YoY {tip.yoy >= 0 ? '+' : ''}{tip.yoy}%</p>
          )}
          <p className="mt-1 text-[9px] text-brand-navy/60">Click to view →</p>
        </div>
      )}
    </div>
  )
}
