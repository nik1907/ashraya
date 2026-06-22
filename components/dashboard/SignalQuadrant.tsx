'use client'

import { useRef, useState } from 'react'
import { getTypeColor } from '@/lib/caseUtils'
import type { PanelCase } from './CaseSidePanel'

type Dot = {
  type:   string
  volume: number
  yoyPct: number
  color:  string
  r:      number
}

function quadrantColor(yoyPct: number, volume: number, medianVolume: number) {
  const highVol = volume >= medianVolume
  if (highVol && yoyPct >= 0)  return '#E24B4A' // top-right: high + growing
  if (highVol && yoyPct <  0)  return '#16a34a' // top-left:  high + declining
  if (!highVol && yoyPct > 50) return '#f59e0b' // bottom-right: emerging risk
  return '#94a3b8'                               // bottom-left: stable/low
}

export function SignalQuadrant({
  inRange,
  prevYear,
  onTypeClick,
}: {
  inRange:     PanelCase[]
  prevYear:    PanelCase[]
  onTypeClick: (type: string) => void
}) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<{ dot: Dot; x: number; y: number } | null>(null)

  // Count per type
  const currMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  for (const c of inRange)  currMap.set(c.case_type, (currMap.get(c.case_type) ?? 0) + 1)
  for (const c of prevYear) prevMap.set(c.case_type, (prevMap.get(c.case_type) ?? 0) + 1)

  const types = [...new Set([...currMap.keys(), ...prevMap.keys()])]
  if (types.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-brand-border bg-brand-card text-sm text-brand-muted">
        No case data for selected period
      </div>
    )
  }

  const volumes = types.map(t => currMap.get(t) ?? 0)
  const maxVol  = Math.max(1, ...volumes)
  const median  = [...volumes].sort((a, b) => a - b)[Math.floor(volumes.length / 2)] ?? 1

  const yoyPcts = types.map(t => {
    const cur  = currMap.get(t) ?? 0
    const prev = prevMap.get(t) ?? 0
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  })

  const minYoy = Math.min(-20, ...yoyPcts)
  const maxYoy = Math.max(20, ...yoyPcts)

  const W = 480, H = 300
  const PAD = { t: 28, r: 16, b: 28, l: 20 }
  const PW = W - PAD.l - PAD.r
  const PH = H - PAD.t - PAD.b

  function toX(yoy: number) {
    return PAD.l + ((yoy - minYoy) / (maxYoy - minYoy)) * PW
  }
  function toY(vol: number) {
    return PAD.t + PH - (vol / maxVol) * PH
  }

  const midX = toX(0)
  const midY = toY(median)

  const dots: Dot[] = types.map((t, i) => {
    const vol = volumes[i]
    const yoy = yoyPcts[i]
    const r   = Math.max(7, Math.min(20, Math.round(6 + (vol / maxVol) * 14)))
    return {
      type: t,
      volume: vol,
      yoyPct: yoy,
      color: quadrantColor(yoy, vol, median),
      r,
    }
  })

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-brand-border bg-brand-card"
        onMouseLeave={() => setTip(null)}
      >
        {/* quadrant tints */}
        <rect x={midX} y={PAD.t}   width={W - PAD.r - midX} height={midY - PAD.t}  fill="#fee2e2" opacity="0.25" />
        <rect x={PAD.l} y={PAD.t}  width={midX - PAD.l}     height={midY - PAD.t}  fill="#dcfce7" opacity="0.20" />
        <rect x={midX} y={midY}    width={W - PAD.r - midX} height={PAD.t + PH - midY} fill="#fef9c3" opacity="0.20" />
        <rect x={PAD.l} y={midY}   width={midX - PAD.l}     height={PAD.t + PH - midY} fill="#f1f5f9" opacity="0.25" />

        {/* axis lines */}
        <line x1={midX} y1={PAD.t} x2={midX} y2={PAD.t + PH} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={PAD.l} y1={midY} x2={PAD.l + PW} y2={midY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 3" />

        {/* quadrant labels */}
        <text x={midX + 6}  y={PAD.t + 11} fontSize="7" fill="#E24B4A" fontWeight="600">HIGH VOLUME · GROWING ⚑</text>
        <text x={PAD.l + 4} y={PAD.t + 11} fontSize="7" fill="#16a34a" fontWeight="600">IMPROVING ↓</text>
        <text x={midX + 6}  y={H - 7}      fontSize="7" fill="#f59e0b" fontWeight="600">EMERGING RISK</text>
        <text x={PAD.l + 4} y={H - 7}      fontSize="7" fill="#94a3b8" fontWeight="600">STABLE / LOW</text>

        {/* axis labels */}
        <text x={PAD.l + PW / 2} y={H - 1} fontSize="7.5" fill="#94a3b8" textAnchor="middle">YoY % Change →</text>
        <text x={3} y={PAD.t + PH / 2} fontSize="7.5" fill="#94a3b8" textAnchor="middle" transform={`rotate(-90, 3, ${PAD.t + PH / 2})`}>Volume</text>

        {/* dots */}
        {dots.map((dot, i) => {
          const cx = toX(dot.yoyPct)
          const cy = toY(dot.volume)
          return (
            <g
              key={dot.type}
              style={{ cursor: 'pointer' }}
              onClick={() => onTypeClick(dot.type)}
              onMouseEnter={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip({ dot, x: e.clientX - rect.left, y: e.clientY - rect.top })
              }}
              onMouseMove={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setTip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
              }}
            >
              <circle cx={cx} cy={cy} r={dot.r + 3} fill="transparent" />
              <circle cx={cx} cy={cy} r={dot.r} fill={dot.color} fillOpacity="0.85" />
              {dot.volume > 0 && (
                <text cx={cx} cy={cy} x={cx} y={cy + 3} fontSize="7" fill="#fff" fontWeight="700" textAnchor="middle">{dot.volume}</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* tooltip */}
      {tip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg text-[11px]"
          style={{ left: tip.x + 12, top: tip.y - 10, maxWidth: 180 }}
        >
          <p className="font-semibold text-brand-navy leading-snug">{tip.dot.type}</p>
          <p className="text-brand-muted mt-0.5">{tip.dot.volume} case{tip.dot.volume !== 1 ? 's' : ''} this period</p>
          <p className="text-brand-muted">
            YoY {tip.dot.yoyPct >= 0 ? '+' : ''}{tip.dot.yoyPct}%
          </p>
          <p className="mt-1 text-brand-navy/70 text-[10px]">Click to view cases →</p>
        </div>
      )}
    </div>
  )
}
