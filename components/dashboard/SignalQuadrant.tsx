'use client'

import { useRef, useState } from 'react'
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
  if (highVol && yoyPct >= 0)  return '#E24B4A' // top-right: high volume + growing
  if (highVol && yoyPct <  0)  return '#16a34a' // top-left:  high volume + declining
  if (!highVol && yoyPct > 50) return '#f59e0b' // bottom-right: emerging risk
  return '#94a3b8'                               // bottom-left: stable / low
}

const W = 600, H = 240
const PAD = { t: 24, r: 20, b: 24, l: 22 }
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
  const [tip, setTip] = useState<{ dot: Dot; x: number; y: number } | null>(null)

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
  const sorted  = [...volumes].sort((a, b) => a - b)
  const median  = sorted[Math.floor(sorted.length / 2)] ?? 1

  const rawYoy = types.map(t => {
    const cur  = currMap.get(t) ?? 0
    const prev = prevMap.get(t) ?? 0
    if (prev === 0) return cur > 0 ? 150 : 0
    return Math.round(((cur - prev) / prev) * 100)
  })

  // Clamp so axis always shows ±range with 0 in view
  const minYoy = Math.min(-40, ...rawYoy.map(y => Math.max(-300, y)))
  const maxYoy = Math.max(40,  ...rawYoy.map(y => Math.min(300,  y)))

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
    const yoy = rawYoy[i]
    // Smaller radius — fixed SVG units, independent of screen size
    const r = Math.max(5, Math.min(10, Math.round(4 + (vol / maxVol) * 6)))
    return { type: t, volume: vol, yoyPct: yoy, color: quadrantColor(yoy, vol, median), r }
  })

  return (
    // Fixed-height container — SVG scales to fill it via preserveAspectRatio
    <div className="relative select-none overflow-hidden rounded-xl border border-brand-border bg-brand-card" style={{ height: 240 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
        onMouseLeave={() => setTip(null)}
      >
        {/* quadrant tints */}
        <rect x={midX}   y={PAD.t} width={W - PAD.r - midX} height={midY - PAD.t}     fill="#fee2e2" opacity="0.3" />
        <rect x={PAD.l}  y={PAD.t} width={midX - PAD.l}     height={midY - PAD.t}     fill="#dcfce7" opacity="0.25" />
        <rect x={midX}   y={midY}  width={W - PAD.r - midX} height={PAD.t + PH - midY} fill="#fef9c3" opacity="0.25" />
        <rect x={PAD.l}  y={midY}  width={midX - PAD.l}     height={PAD.t + PH - midY} fill="#f1f5f9" opacity="0.3" />

        {/* axis lines */}
        <line x1={midX}   y1={PAD.t}        x2={midX}        y2={PAD.t + PH} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4 3" />
        <line x1={PAD.l}  y1={midY}         x2={PAD.l + PW}  y2={midY}       stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4 3" />

        {/* quadrant labels */}
        <text x={midX + 5}  y={PAD.t + 9}  fontSize="6.5" fill="#E24B4A" fontWeight="700">HIGH VOLUME · GROWING ⚑</text>
        <text x={PAD.l + 3} y={PAD.t + 9}  fontSize="6.5" fill="#16a34a" fontWeight="700">IMPROVING ↓</text>
        <text x={midX + 5}  y={H - 5}      fontSize="6.5" fill="#f59e0b" fontWeight="700">EMERGING RISK</text>
        <text x={PAD.l + 3} y={H - 5}      fontSize="6.5" fill="#94a3b8" fontWeight="700">STABLE / LOW</text>

        {/* axis labels */}
        <text x={PAD.l + PW / 2} y={H - 1}           fontSize="7" fill="#94a3b8" textAnchor="middle">YoY % Change →</text>
        <text x={6}              y={PAD.t + PH / 2}  fontSize="7" fill="#94a3b8" textAnchor="middle" transform={`rotate(-90,6,${PAD.t + PH / 2})`}>Volume</text>

        {/* 0% marker */}
        <text x={midX} y={H - 1} fontSize="6" fill="#94a3b8" textAnchor="middle">0%</text>

        {/* dots */}
        {dots.map(dot => {
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
              <circle cx={cx} cy={cy} r={dot.r + 4} fill="transparent" />
              <circle cx={cx} cy={cy} r={dot.r} fill={dot.color} fillOpacity="0.85" />
              {dot.volume > 0 && (
                <text x={cx} y={cy + 2.5} fontSize="5.5" fill="#fff" fontWeight="700" textAnchor="middle">{dot.volume}</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* tooltip — positioned in viewport coords */}
      {tip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-lg"
          style={{ left: Math.min(tip.x + 12, W - 160), top: Math.max(0, tip.y - 36), maxWidth: 180 }}
        >
          <p className="text-[11px] font-semibold text-brand-navy leading-snug">{tip.dot.type}</p>
          <p className="text-[10px] text-brand-muted mt-0.5">{tip.dot.volume} case{tip.dot.volume !== 1 ? 's' : ''}</p>
          <p className="text-[10px] text-brand-muted">YoY {tip.dot.yoyPct >= 0 ? '+' : ''}{tip.dot.yoyPct}%</p>
          <p className="mt-1 text-[9px] text-brand-navy/60">Click to view cases →</p>
        </div>
      )}
    </div>
  )
}
