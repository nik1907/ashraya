'use client'

import Fuse from 'fuse.js'
import { ChevronRight, Download, MessageCircle, Printer, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { EmbassyAIBrief } from '@/components/EmbassyAIBrief'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'
import type { PanelCase } from './CaseSidePanel'

// ─── types ────────────────────────────────────────────────────────────────────

type Range    = '7d' | '30d' | '90d' | '1y' | 'all'
type Priority = 'critical' | 'high' | 'medium' | 'normal'
type KpiKey   = 'attention' | 'critical_p' | 'progress' | 'resolved'

type DetailFilter =
  | { kind: 'type';    value: string;                    label: string }
  | { kind: 'status';  value: string;  typeCtx: string | null; label: string }
  | { kind: 'emirate'; adOnly: boolean;                  label: string }
  | { kind: 'age';     minDays: number; maxDays: number; label: string }
  | { kind: 'org';     org: string;                      label: string }

// ─── constants ────────────────────────────────────────────────────────────────

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: Infinity }
const RANGES: Range[] = ['7d', '30d', '90d', '1y', 'all']

const EMBASSY_LABEL: Record<string, string> = {
  submitted: 'Pending', sent: 'Received', acknowledged: 'Acknowledged',
  need_more_info: 'Needs info', in_progress: 'In progress', resolved: 'Resolved/Closed', closed: 'Resolved/Closed',
}

const STATUS_DOT: Record<string, string> = {
  sent: '#378ADD', acknowledged: '#7F77DD', need_more_info: '#D4537E',
  in_progress: '#EF9F27', submitted: '#888780', resolved: '#639922', closed: '#639922',
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  sent:           { bg: '#E6F1FB', text: '#0C447C' },
  acknowledged:   { bg: '#EEEDFE', text: '#3C3489' },
  need_more_info: { bg: '#FBEAF0', text: '#4B1528' },
  in_progress:    { bg: '#FAEEDA', text: '#633806' },
  submitted:      { bg: '#F1EFE8', text: '#444441' },
  resolved:       { bg: '#EAF3DE', text: '#27500A' },
  closed:         { bg: '#EAF3DE', text: '#27500A' },
}

const PIPELINE_ORDER = ['sent', 'acknowledged', 'need_more_info', 'in_progress', 'submitted', 'resolved']

const PRIORITY_DOT: Record<Priority, string> = {
  critical: '#E24B4A', high: '#EF9F27', medium: '#EEA82A', normal: '#639922',
}

const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, normal: 3 }

const ORG_COLORS = ['#185FA5', '#1D9E75', '#7F77DD', '#E24B4A', '#EF9F27']

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function getPriority(caseType: string, status: string, createdAt: string): Priority {
  const t = caseType.toLowerCase(), age = daysOpen(createdAt)
  if (t.includes('police') || t.includes('detent') || t.includes('arrest') ||
      t.includes('death')  || t.includes('traffick') || t.includes('medical') ||
      t.includes('missing')) return 'critical'
  if (status === 'sent') { if (age >= 3) return 'critical'; if (age >= 1) return 'high' }
  if (t.includes('passport') || t.includes('harass') || t.includes('abscond') ||
      t.includes('exit')     || t.includes('human')  || t.includes('overstay')) return 'high'
  if (age >= 21) return 'critical'
  if (age >= 14) return 'high'
  if (age >= 7)  return 'medium'
  return 'normal'
}

function getTypeColor(t: string): string {
  const s = t.toLowerCase()
  if (s.includes('police') || s.includes('detent') || s.includes('death') || s.includes('traffick')) return '#E24B4A'
  if (s.includes('harass') || s.includes('employer') || s.includes('salary')) return '#1D9E75'
  if (s.includes('missing'))  return '#7F77DD'
  if (s.includes('overstay') || s.includes('illegal')) return '#EF9F27'
  if (s.includes('abscond'))  return '#378ADD'
  if (s.includes('passport')) return '#EEA82A'
  if (s.includes('exit') || s.includes('amnesty')) return '#888780'
  return '#B4B2A9'
}

function getOrg(caseId: string | null): string {
  return caseId?.split('-')[0] ?? 'Unknown'
}

function toWhatsApp(phone: string | null): string | null {
  if (!phone) return null
  const d = phone.replace(/[^0-9]/g, '')
  if (d.length < 7) return null
  if (d.startsWith('971')) return `https://wa.me/${d}`
  if (d.startsWith('0'))   return `https://wa.me/971${d.slice(1)}`
  return `https://wa.me/971${d}`
}

function toBullets(c: PanelCase): string[] {
  if (c.case_brief) return c.case_brief.split('\n').map(s => s.trim()).filter(s => s.length > 10)
  if (!c.polished_summary) return []
  const parts = c.polished_summary.split(/\n{2,}/).map(s => s.trim()).filter(s => s.length > 30)
  if (parts.length >= 2) return parts.slice(0, 3)
  return c.polished_summary.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 30).slice(0, 3)
}

function sortByPriority(a: PanelCase, b: PanelCase) {
  return PRIORITY_ORDER[getPriority(a.case_type, a.status, a.created_at)] -
         PRIORITY_ORDER[getPriority(b.case_type, b.status, b.created_at)]
}

function downloadCSV(rows: PanelCase[]) {
  const headers = ['Case ID', 'Name', 'Type', 'Status', 'Outcome', 'Reporting emirate', 'Days open', 'Submitted']
  const csv = [headers, ...rows.map(c => [
    c.case_id ?? '', c.name ?? '', c.case_type, EMBASSY_LABEL[c.status] ?? c.status,
    c.outcome ?? '', c.reporting_emirate ?? '', String(daysOpen(c.created_at)), c.created_at.slice(0, 10),
  ])].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: `cases-${new Date().toISOString().slice(0, 10)}.csv`,
  })
  a.click(); URL.revokeObjectURL(a.href)
}

// ─── chart components ─────────────────────────────────────────────────────────

function DonutChart({ data, onSlice, activeValue }: {
  data: { label: string; value: number; color: string }[]
  onSlice: (label: string) => void
  activeValue: string | null
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="py-4 text-sm italic text-brand-muted">No data</p>
  const cx = 21, cy = 21, r = 15.9155
  let cumPct = 0
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 42 42" className="h-28 w-28 flex-shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="3.5" />
        {data.map((d, i) => {
          const pct = (d.value / total) * 100
          const offset = 25 - cumPct
          cumPct += pct
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color}
              strokeWidth={activeValue === d.label ? 5.5 : 3.5}
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
              style={{ cursor: 'pointer', transition: 'stroke-width .15s' }}
              onClick={() => onSlice(d.label)} />
          )
        })}
        <g style={{ transform: 'rotate(90deg)', transformOrigin: '21px 21px' }}>
          <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="auto"
            fontSize="7" fontWeight="600" fill="currentColor">{total}</text>
          <text x={cx} y={cy + 5.5} textAnchor="middle" dominantBaseline="auto"
            fontSize="3.8" fill="currentColor" opacity={0.5}>cases</text>
        </g>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {data.map(d => (
          <button key={d.label} onClick={() => onSlice(d.label)}
            className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-brand-navy/5 ${activeValue === d.label ? 'bg-brand-navy/10 ring-1 ring-brand-navy/20' : ''}`}>
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-brand-navy">{d.label}</span>
            <span className="text-[11px] font-medium tabular-nums text-brand-navy">{d.value}</span>
            <span className="w-7 flex-shrink-0 text-right text-[10px] text-brand-muted">{Math.round(d.value / total * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// HTML horizontal-bar funnel — no SVG, no text-overflow issues
function FunnelChart({ stages, onStage, activeStatus }: {
  stages: { status: string; label: string; count: number; color: string }[]
  onStage: (status: string) => void
  activeStatus: string | null
}) {
  if (stages.length === 0) return <p className="py-4 text-sm italic text-brand-muted">No data</p>
  const maxCount = Math.max(1, ...stages.map(s => s.count))
  return (
    <div className="space-y-1.5">
      {stages.map(s => {
        const pct = Math.max(10, Math.round(s.count / maxCount * 100))
        const on  = activeStatus === s.status
        return (
          <button key={s.status} onClick={() => onStage(s.status)}
            className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-brand-navy/5 ${on ? 'bg-brand-navy/10 ring-1 ring-brand-navy/20' : ''}`}>
            <span className="w-24 flex-shrink-0 text-right text-[11px] text-brand-navy">{s.label}</span>
            <div className="flex-1 overflow-hidden rounded" style={{ height: 22 }}>
              <div className="flex h-full items-center justify-end pr-2 transition-all"
                style={{ width: `${pct}%`, background: s.color, opacity: on ? 1 : 0.78, borderRadius: 4 }}>
                <span className="text-[11px] font-semibold text-white">{s.count}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SegmentedBar({ segments, onSegment, activeKey }: {
  segments: { key: string; label: string; value: number; color: string }[]
  onSegment: (key: string) => void
  activeKey: string | null
}) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="text-sm italic text-brand-muted">No data</p>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-8 w-full overflow-hidden rounded-xl">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100
          const on = activeKey === seg.key
          return (
            <button key={seg.key} onClick={() => onSegment(seg.key)}
              className="flex items-center justify-center text-[10px] font-semibold text-white transition-opacity"
              style={{
                width: `${pct}%`, background: seg.color, opacity: on ? 1 : 0.72,
                outline: on ? `2px solid ${seg.color}` : 'none', outlineOffset: 2,
                minWidth: pct > 0 ? 28 : 0,
              }}
              title={`${seg.label}: ${seg.value}`}>
              {pct > 18 ? `${Math.round(pct)}%` : ''}
            </button>
          )
        })}
      </div>
      <div className="space-y-1">
        {segments.map(seg => {
          const pct = total ? Math.round(seg.value / total * 100) : 0
          const on = activeKey === seg.key
          return (
            <button key={seg.key} onClick={() => onSegment(seg.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-brand-navy/5 ${on ? 'bg-brand-navy/10 ring-1 ring-brand-navy/20' : ''}`}>
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: seg.color }} />
              <span className="flex-1 text-[12px] text-brand-navy">{seg.label}</span>
              <span className="text-[12px] font-medium tabular-nums text-brand-navy">{seg.value}</span>
              <span className="text-[10px] text-brand-muted">{pct}%</span>
            </button>
          )
        })}
        <p className="px-2 pt-0.5 text-[10px] text-brand-muted">Dubai-routed cases CC'd here appear under Other</p>
      </div>
    </div>
  )
}

// White text on saturated tiles, color-tinted text on empty tiles
function HeatmapTiles({ buckets, onBucket, activeMinDays }: {
  buckets: { label: string; sublabel: string; color: string; n: number; minDays: number; maxDays: number }[]
  onBucket: (b: { minDays: number; maxDays: number; label: string; sublabel?: string; color?: string; n?: number }) => void
  activeMinDays: number | null
}) {
  const maxN = Math.max(1, ...buckets.map(b => b.n))
  return (
    <div className="grid grid-cols-2 gap-2">
      {buckets.map(b => {
        const filled    = b.n > 0
        const intensity = filled
          ? Math.round(50 + (b.n / maxN) * 185).toString(16).padStart(2, '0')
          : '18'
        const on = activeMinDays === b.minDays
        return (
          <button key={b.minDays} onClick={() => onBucket(b)}
            className="flex flex-col rounded-xl p-3 text-left transition-all"
            style={{
              background: `${b.color}${intensity}`,
              outline: on ? `2px solid ${b.color}` : 'none',
              outlineOffset: on ? '2px' : '0',
            }}>
            <span className="text-xl font-semibold tabular-nums leading-none"
              style={{ color: filled ? '#fff' : 'var(--color-text-secondary)' }}>{b.n}</span>
            <span className="mt-1 text-[11px] font-medium leading-tight"
              style={{ color: filled ? 'rgba(255,255,255,0.9)' : b.color }}>{b.label}</span>
            <span className="text-[10px]"
              style={{ color: filled ? 'rgba(255,255,255,0.65)' : 'var(--color-text-secondary)' }}>{b.sublabel}</span>
          </button>
        )
      })}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const W = 72, H = 18, step = W / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-4 w-16 flex-shrink-0" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#BA7517" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  )
}

function OrgWidget({ data, onOrg, activeOrg }: {
  data: { org: string; count: number }[]
  onOrg: (org: string) => void
  activeOrg: string | null
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => {
        const color = ORG_COLORS[i % ORG_COLORS.length]
        const pct = total ? Math.round(d.count / total * 100) : 0
        const on = activeOrg === d.org
        return (
          <button key={d.org} onClick={() => onOrg(d.org)}
            className={`flex flex-col rounded-xl border p-3 text-left transition-all hover:bg-brand-navy/5 ${on ? 'border-brand-navy bg-brand-navy/10' : 'border-brand-border bg-brand-card'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-navy">{d.org}</span>
              <span className="text-xl font-semibold tabular-nums" style={{ color }}>{d.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="mt-1 text-[10px] text-brand-muted">{pct}% of all cases · click to view</p>
          </button>
        )
      })}
    </div>
  )
}

// ─── case list + briefing ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { bg, text } = STATUS_STYLE[status] ?? { bg: '#F1EFE8', text: '#444441' }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap" style={{ background: bg, color: text }}>
      {EMBASSY_LABEL[status] ?? status}
    </span>
  )
}

function PriorDot({ caseType, status, createdAt }: { caseType: string; status: string; createdAt: string }) {
  return <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
    style={{ background: PRIORITY_DOT[getPriority(caseType, status, createdAt)] }} />
}

function PhoneLink({ phone }: { phone: string | null }) {
  const wa = toWhatsApp(phone)
  if (!phone) return null
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[11px]">{phone}</span>
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-600"><MessageCircle size={11} /></a>}
    </span>
  )
}

function CaseListPanel({ cases, selectedId, onSelect, label, onClose }: {
  cases: PanelCase[]; selectedId: string | null
  onSelect: (id: string | null) => void; label: string; onClose: () => void
}) {
  return (
    <div className="flex w-[42%] flex-col border-r border-brand-border">
      <div className="flex items-center justify-between border-b border-brand-border bg-brand-bg px-3 py-2">
        <span className="max-w-[200px] truncate text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
          {label} · {cases.length} case{cases.length !== 1 ? 's' : ''}
        </span>
        <button onClick={onClose} className="rounded p-0.5 text-brand-muted hover:text-brand-navy"><X size={12} /></button>
      </div>
      {cases.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm italic text-brand-muted">No cases match</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {cases.map(c => (
            <button key={c.id} onClick={() => onSelect(selectedId === c.id ? null : c.id)}
              className={`flex w-full items-center gap-2 border-b border-brand-border px-3 py-2.5 text-left transition-colors hover:bg-brand-navy/5 ${selectedId === c.id ? 'bg-brand-navy/10' : ''}`}>
              <PriorDot caseType={c.case_type} status={c.status} createdAt={c.created_at} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-navy">{c.name ?? '—'}</p>
                <p className="truncate text-[11px] text-brand-muted">{c.case_type}</p>
              </div>
              <StatusBadge status={c.status} />
              <ChevronRight size={12} className="flex-shrink-0 text-brand-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CaseBriefing({ c, userFullName, employerCounts }: {
  c: PanelCase; userFullName: string; employerCounts: Map<string, number>
}) {
  const bullets  = toBullets(c)
  const age      = daysOpen(c.created_at)
  const priority = getPriority(c.case_type, c.status, c.created_at)
  const empCount = c.company_name ? (employerCounts.get(c.company_name) ?? 0) : 0
  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <span className="text-[10px] font-medium" style={{ color: PRIORITY_DOT[priority] }}>{priority}</span>
          <span className={`text-[11px] ${age >= 7 ? 'font-medium text-red-600' : 'text-brand-muted'}`}>
            {age === 0 ? 'Today' : `${age}d open`}
          </span>
        </div>
        <p className="font-mono text-[10px] text-brand-muted">{c.case_id ?? 'Pending'}</p>
        <p className="mt-0.5 text-sm font-medium text-brand-navy">{c.name ?? '—'}</p>
        <p className="text-[11px] text-brand-muted">{c.case_type}</p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-bg p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Situation</p>
        {bullets.length > 0 ? (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-navy">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />{b}
              </li>
            ))}
          </ul>
        ) : <p className="text-[11px] italic text-brand-muted">AI brief not yet generated.</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-brand-border p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Identity</p>
          <div className="space-y-1 text-brand-navy">
            {c.passport    && <p><span className="text-brand-muted">Passport </span>{c.passport}</p>}
            {c.eid         && <p><span className="text-brand-muted">EID </span>{c.eid}</p>}
            {c.phone       && <PhoneLink phone={c.phone} />}
            {c.company_name && (
              <p className="flex flex-wrap items-center gap-1">
                <span className="text-brand-muted">Employer</span>
                {empCount >= 3 && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">⚠ {empCount}</span>}
              </p>
            )}
            {c.company_name && <p className="truncate">{c.company_name}</p>}
            {!c.passport && !c.eid && !c.phone && <p className="text-brand-muted">—</p>}
          </div>
        </div>
        <div className="rounded-xl border border-brand-border p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Reported by</p>
          <div className="space-y-1 text-brand-navy">
            {c.reporter_name  && <p className="font-medium">{c.reporter_name}</p>}
            {c.reporter_phone && <PhoneLink phone={c.reporter_phone} />}
            {!c.reporter_name && <p className="text-brand-muted">—</p>}
          </div>
        </div>
      </div>

      {(c.outcome || c.resolved_by || c.resolution_note) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px]">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Resolution</p>
          {c.outcome         && <p className="font-medium text-emerald-800">{c.outcome}</p>}
          {c.resolved_by     && <p className="text-emerald-700">By {c.resolved_by}</p>}
          {c.resolution_note && <p className="mt-1 italic text-emerald-600">{c.resolution_note}</p>}
        </div>
      )}

      <div className="rounded-xl border border-brand-border p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Update status</p>
        <CaseStatusForm caseId={c.id} current={c.status} options={EMBASSY_STATUS_OPTIONS} defaultHandledBy={userFullName} />
      </div>
      <Link href={`/cases/${c.id}`} className="text-[11px] text-brand-navy-light underline">View full case & attachments →</Link>
    </div>
  )
}

function CaseAccordion({ cases, selectedId, onSelect, label, onClose, userFullName, employerCounts }: {
  cases: PanelCase[]; selectedId: string | null
  onSelect: (id: string | null) => void; label: string; onClose: () => void
  userFullName: string; employerCounts: Map<string, number>
}) {
  const selected = selectedId ? (cases.find(c => c.id === selectedId) ?? null) : null
  return (
    <div className="flex overflow-hidden rounded-xl border border-brand-border" style={{ minHeight: 240 }}>
      <CaseListPanel cases={cases} selectedId={selectedId} onSelect={onSelect} label={label} onClose={onClose} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {selected
          ? <CaseBriefing c={selected} userFullName={userFullName} employerCounts={employerCounts} />
          : <div className="flex flex-1 flex-col items-center justify-center gap-2 text-brand-muted">
              <ChevronRight size={20} />
              <p className="text-sm">Select a case to view briefing</p>
            </div>
        }
      </div>
    </div>
  )
}

// ─── fuzzy search overlay ─────────────────────────────────────────────────────

function FuzzySearchOverlay({ cases, userFullName, employerCounts }: {
  cases: PanelCase[]; userFullName: string; employerCounts: Map<string, number>
}) {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fuse = useMemo(() => new Fuse(cases, {
    keys: ['name', 'reporter_name', 'company_name', 'case_id', 'case_type'],
    threshold: 0.4,
    minMatchCharLength: 2,
    includeScore: true,
  }), [cases])

  const results = useMemo(() => {
    if (query.trim().length < 2) return []
    return fuse.search(query).slice(0, 10).map(r => r.item)
  }, [fuse, query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape' && open)                 { setOpen(false); setQuery(''); setSelectedId(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  const selected = selectedId ? (results.find(c => c.id === selectedId) ?? null) : null

  function close() { setOpen(false); setQuery(''); setSelectedId(null) }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted transition-colors hover:border-brand-navy hover:text-brand-navy"
      title="Search cases (Ctrl+K)">
      <Search size={11} /> Search
    </button>
  )

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={close}>
      <div className="mx-auto mt-14 flex" style={{ maxWidth: 860, height: 'calc(100vh - 10rem)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-2xl">

          {/* search bar */}
          <div className="flex items-center gap-2 border-b border-brand-border px-4 py-3">
            <Search size={15} className="flex-shrink-0 text-brand-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedId(null) }}
              placeholder="Search by name, reporter, employer, case ID…"
              className="flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-brand-muted"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-brand-muted hover:text-brand-navy">
                <X size={13} />
              </button>
            )}
            <button onClick={close}
              className="rounded border border-brand-border px-2 py-0.5 text-[10px] text-brand-muted hover:text-brand-navy">
              Esc
            </button>
          </div>

          {/* body */}
          {query.trim().length < 2 ? (
            <div className="p-6 text-sm text-brand-muted">
              <p>Type at least 2 characters to search</p>
              <p className="mt-2 text-[11px]">Searches: affected name · reporter name · employer · case ID · case type</p>
              <p className="mt-1 text-[10px] opacity-70">Tip: Ctrl+K opens this from anywhere on the page</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* result list */}
              <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-brand-border">
                {results.length === 0 ? (
                  <p className="p-4 text-sm italic text-brand-muted">No matches</p>
                ) : results.map(c => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center gap-2 border-b border-brand-border px-3 py-2.5 text-left transition-colors hover:bg-brand-navy/5 ${selectedId === c.id ? 'bg-brand-navy/10' : ''}`}>
                    <PriorDot caseType={c.case_type} status={c.status} createdAt={c.created_at} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy">{c.name ?? '—'}</p>
                      <p className="truncate text-[10px] text-brand-muted">
                        {c.case_id ?? 'Pending'} · {c.case_type}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </button>
                ))}
              </div>

              {/* case briefing */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {selected
                  ? <CaseBriefing c={selected} userFullName={userFullName} employerCounts={employerCounts} />
                  : <div className="flex flex-1 items-center justify-center text-sm text-brand-muted">Select a result to view details</div>
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function EmbassyDashboard({ cases, userFullName, emirateName, showEmirateSplit }: {
  cases: PanelCase[]; userFullName: string; emirateName: string; showEmirateSplit: boolean
}) {
  const [range,        setRange]        = useState<Range>('30d')
  const [typeFilter,   setTypeFilter]   = useState<string | null>(null)
  const [openKpi,      setOpenKpi]      = useState<KpiKey | null>(null)
  const [kpiCase,      setKpiCase]      = useState<string | null>(null)
  const [detailFilter, setDetailFilter] = useState<DetailFilter | null>(null)
  const [detailCase,   setDetailCase]   = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

  const cutoff  = useMemo(() => range === 'all' ? 0 : Date.now() - RANGE_DAYS[range] * 86_400_000, [range])
  const inRange = useMemo(() => cases.filter(c => new Date(c.created_at).getTime() >= cutoff), [cases, cutoff])

  const kpiCounts = useMemo(() => ({
    attention:  inRange.filter(c => ['sent', 'submitted', 'need_more_info'].includes(c.status)).length,
    critical_p: inRange.filter(c => !['resolved', 'closed'].includes(c.status) && getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    progress:   inRange.filter(c => ['acknowledged', 'in_progress'].includes(c.status)).length,
    resolved:   inRange.filter(c => ['resolved', 'closed'].includes(c.status)).length,
  }), [inRange])

  const kpiCases = useMemo(() => {
    if (!openKpi) return []
    return inRange.filter(c => {
      if (openKpi === 'attention')  return ['sent', 'submitted', 'need_more_info'].includes(c.status)
      if (openKpi === 'critical_p') return !['resolved', 'closed'].includes(c.status) && getPriority(c.case_type, c.status, c.created_at) === 'critical'
      if (openKpi === 'progress')   return ['acknowledged', 'in_progress'].includes(c.status)
      if (openKpi === 'resolved')   return ['resolved', 'closed'].includes(c.status)
      return false
    }).sort(sortByPriority)
  }, [inRange, openKpi])

  const detailCases = useMemo(() => {
    if (!detailFilter) return []
    let rows: PanelCase[]
    switch (detailFilter.kind) {
      case 'type':    rows = inRange.filter(c => c.case_type === detailFilter.value); break
      case 'status':  rows = inRange.filter(c => {
        const match = detailFilter.value === 'resolved'
          ? ['resolved', 'closed'].includes(c.status)
          : c.status === detailFilter.value
        return match && (!detailFilter.typeCtx || c.case_type === detailFilter.typeCtx)
      }); break
      case 'emirate': rows = inRange.filter(c => detailFilter.adOnly ? c.reporting_emirate !== 'Other emirates' : c.reporting_emirate === 'Other emirates'); break
      case 'age':     rows = inRange.filter(c => !['resolved','closed'].includes(c.status)).filter(c => { const d = daysOpen(c.created_at); return d >= detailFilter.minDays && d < detailFilter.maxDays }); break
      case 'org':     rows = inRange.filter(c => getOrg(c.case_id) === detailFilter.org); break
      default:        rows = []
    }
    return rows.sort(sortByPriority)
  }, [inRange, detailFilter])

  const statusCounts = useMemo(() => {
    const src = typeFilter ? inRange.filter(c => c.case_type === typeFilter) : inRange
    const m: Record<string, number> = {}
    src.forEach(c => {
      const key = c.status === 'closed' ? 'resolved' : c.status
      m[key] = (m[key] ?? 0) + 1
    })
    return m
  }, [inRange, typeFilter])

  const typeBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    inRange.forEach(c => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [inRange])

  const emirateSplit = useMemo(() => {
    const ad = inRange.filter(c => c.reporting_emirate !== 'Other emirates').length
    return { ad, other: inRange.length - ad }
  }, [inRange])

  const ageBuckets = useMemo(() => {
    const open = inRange.filter(c => !['resolved', 'closed'].includes(c.status))
    return [
      { label: '21+ days', sublabel: 'Critical SLA',    color: '#E24B4A', minDays: 21, maxDays: Infinity, n: open.filter(c => daysOpen(c.created_at) >= 21).length },
      { label: '8–20 days', sublabel: 'Needs attention', color: '#EF9F27', minDays: 8,  maxDays: 21,       n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 8  && d < 21 }).length },
      { label: '3–7 days',  sublabel: 'Monitor',         color: '#EEA82A', minDays: 3,  maxDays: 8,        n: open.filter(c => { const d = daysOpen(c.created_at); return d >= 3  && d < 8  }).length },
      { label: '0–2 days',  sublabel: 'Fresh',           color: '#639922', minDays: 0,  maxDays: 3,        n: open.filter(c => daysOpen(c.created_at) < 3).length },
    ]
  }, [inRange])

  const orgBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    inRange.forEach(c => { const o = getOrg(c.case_id); m.set(o, (m.get(o) ?? 0) + 1) })
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([org, count]) => ({ org, count }))
  }, [inRange])

  const sparkline = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: 14 }, (_, i) => {
      const s = now - (13 - i) * 86_400_000
      return cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= s && t < s + 86_400_000 }).length
    })
  }, [cases])

  const employerCounts = useMemo(() => {
    const m = new Map<string, number>()
    cases.forEach(c => { if (c.company_name) m.set(c.company_name, (m.get(c.company_name) ?? 0) + 1) })
    return m
  }, [cases])

  const criticalCount = useMemo(
    () => inRange.filter(c => !['resolved', 'closed'].includes(c.status) && getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    [inRange],
  )
  const avgDays = useMemo(() => {
    const done = inRange.filter(c => ['resolved', 'closed'].includes(c.status))
    return done.length ? Math.round(done.reduce((s, c) => s + daysOpen(c.created_at), 0) / done.length) : null
  }, [inRange])

  // top 4 urgent cases always shown without clicking
  const actionCases = useMemo(() =>
    inRange
      .filter(c => ['sent', 'submitted', 'need_more_info'].includes(c.status))
      .sort(sortByPriority)
      .slice(0, 4),
    [inRange],
  )

  // rich decision narrative
  const narrative = useMemo(() => {
    const parts: string[] = []
    const critical = inRange.filter(c =>
      !['resolved', 'closed'].includes(c.status) &&
      getPriority(c.case_type, c.status, c.created_at) === 'critical'
    )
    if (critical.length > 0) {
      const maxDays = Math.max(...critical.map(c => daysOpen(c.created_at)))
      parts.push(`${critical.length} critical case${critical.length !== 1 ? 's' : ''} open — oldest ${maxDays} days`)
    }
    const unacked3 = inRange.filter(c => c.status === 'sent' && daysOpen(c.created_at) >= 3)
    if (unacked3.length > 0)
      parts.push(`${unacked3.length} received but unacknowledged 3+ days`)
    const needInfo = inRange.filter(c => c.status === 'need_more_info')
    if (needInfo.length > 0)
      parts.push(`${needInfo.length} awaiting information from reporter`)
    if (parts.length === 0)
      parts.push(kpiCounts.attention === 0 ? 'No cases need immediate action' : `${kpiCounts.attention} case${kpiCounts.attention !== 1 ? 's' : ''} in queue`)
    if (avgDays !== null) parts.push(`avg resolution ~${avgDays}d`)
    return parts.join(' · ')
  }, [inRange, kpiCounts, avgDays])

  function openDetail(f: DetailFilter) {
    const same = JSON.stringify(f) === JSON.stringify(detailFilter)
    setDetailFilter(same ? null : f); setDetailCase(null)
  }

  function toggleKpi(key: KpiKey) {
    if (openKpi === key) { setOpenKpi(null); setKpiCase(null) }
    else                 { setOpenKpi(key);  setKpiCase(null) }
  }

  function changeRange(r: Range) { setRange(r); setKpiCase(null); setDetailCase(null) }

  function onTypeClick(type: string) {
    if (typeFilter === type) {
      setTypeFilter(null)
      if (detailFilter?.kind === 'type' || detailFilter?.kind === 'status') { setDetailFilter(null); setDetailCase(null) }
    } else {
      setTypeFilter(type)
      openDetail({ kind: 'type', value: type, label: type })
    }
  }

  function onStatusClick(status: string) {
    const label = typeFilter ? `${typeFilter} — ${EMBASSY_LABEL[status] ?? status}` : (EMBASSY_LABEL[status] ?? status)
    openDetail({ kind: 'status', value: status, typeCtx: typeFilter ?? null, label })
  }

  const KPI_DEFS: { key: KpiKey; label: string; valueColor: string }[] = [
    { key: 'attention',  label: 'Need action', valueColor: 'var(--color-text-danger)'  },
    { key: 'critical_p', label: 'Critical',    valueColor: 'var(--color-text-danger)'  },
    { key: 'progress',   label: 'In progress', valueColor: 'var(--color-text-warning)' },
    { key: 'resolved',   label: 'Resolved/Closed', valueColor: 'var(--color-text-success)' },
  ]

  const donutData    = typeBreakdown.map(([label, value]) => ({ label, value, color: getTypeColor(label) }))
  const funnelStages = PIPELINE_ORDER.filter(k => statusCounts[k]).map(k => ({
    status: k, label: EMBASSY_LABEL[k] ?? k, count: statusCounts[k] ?? 0, color: STATUS_DOT[k] ?? '#888',
  }))

  const activeDetailStatus  = detailFilter?.kind === 'status'  ? detailFilter.value   : null
  const activeDetailMinDays = detailFilter?.kind === 'age'      ? detailFilter.minDays : null
  const activeDetailEmirate = detailFilter?.kind === 'emirate'  ? (detailFilter.adOnly ? 'ad' : 'other') : null
  const activeDetailOrg     = detailFilter?.kind === 'org'      ? detailFilter.org     : null

  // which section owns the current detailFilter
  const isChartsFilter   = detailFilter?.kind === 'type' || detailFilter?.kind === 'status'
  const isAnalysisFilter = detailFilter?.kind === 'emirate' || detailFilter?.kind === 'age' || detailFilter?.kind === 'org'

  const sharedAccordionProps = {
    cases: detailCases, selectedId: detailCase, onSelect: setDetailCase,
    label: detailFilter?.label ?? '',
    onClose: () => { setDetailFilter(null); setDetailCase(null) },
    userFullName, employerCounts,
  }

  return (
    <div className="flex flex-col">

      {/* top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-border bg-brand-card px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brand-navy">{emirateName}</span>
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white">{criticalCount} critical</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FuzzySearchOverlay cases={cases} userFullName={userFullName} employerCounts={employerCounts} />
          <EmbassyAIBrief range={range} />
          <button onClick={() => downloadCSV(inRange)}
            className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy print:hidden">
            <Download size={11} /> CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy print:hidden">
            <Printer size={11} /> PDF
          </button>
          <div className="flex rounded border border-brand-border p-0.5">
            {RANGES.map(r => (
              <button key={r} onClick={() => changeRange(r)}
                className={`rounded px-2.5 py-1 text-xs transition-all ${range === r ? 'bg-brand-navy font-medium text-white' : 'text-brand-muted hover:text-brand-navy'}`}>
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">

        {/* situation narrative + sparkline */}
        <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-bg px-4 py-3">
          <div className="w-0.5 flex-shrink-0 self-stretch rounded-full bg-brand-saffron" />
          <div className="flex-1">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
              Situation · {range === 'all' ? 'all time' : `last ${range}`} · {inRange.length} cases
            </p>
            <p className="text-sm leading-relaxed text-brand-navy">{narrative}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
            <Sparkline values={sparkline} />
            <span className="text-[9px] text-brand-muted">14d submissions</span>
          </div>
        </div>

        {/* HERO: action queue — always visible, no click required */}
        <div className={`rounded-xl border-2 p-4 ${kpiCounts.attention > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${kpiCounts.attention > 0 ? 'text-red-600' : 'text-green-700'}`}>
                Cases needing action
              </p>
              <p className={`mt-0.5 text-5xl font-bold tabular-nums leading-none ${kpiCounts.attention > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {kpiCounts.attention > 0 ? kpiCounts.attention : '✓'}
              </p>
              {kpiCounts.attention === 0 && (
                <p className="mt-1 text-sm text-green-700">All clear — no cases need a response right now</p>
              )}
            </div>
            {kpiCounts.attention > 0 && (
              <button
                onClick={() => toggleKpi('attention')}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap"
              >
                {openKpi === 'attention' ? 'Close list' : `View all ${kpiCounts.attention} →`}
              </button>
            )}
          </div>

          {actionCases.length > 0 && (
            <div className="space-y-1.5">
              {actionCases.map(c => {
                const priority = getPriority(c.case_type, c.status, c.created_at)
                const days = daysOpen(c.created_at)
                const isExpanded = expandedActionId === c.id
                const summary = c.case_brief ?? c.polished_summary
                return (
                  <div key={c.id} className="overflow-hidden rounded-lg bg-white/80 transition-colors hover:bg-white">
                    {/* row — click to expand brief */}
                    <button
                      type="button"
                      onClick={() => setExpandedActionId(isExpanded ? null : c.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"
                    >
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PRIORITY_DOT[priority] }} />
                      <span className="font-medium text-brand-navy">{c.name ?? '—'}</span>
                      <span className="hidden truncate text-xs text-brand-muted sm:block">{c.case_type}</span>
                      <span className="ml-auto font-mono text-[11px] text-brand-muted">{c.case_id ?? '—'}</span>
                      <span className={`w-8 text-right text-xs font-semibold tabular-nums ${days >= 7 ? 'text-red-600' : days >= 3 ? 'text-amber-600' : 'text-brand-muted'}`}>
                        {days}d
                      </span>
                      <span className="ml-1 text-brand-muted/60 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* inline brief — shown when expanded */}
                    {isExpanded && (
                      <div className="border-t border-brand-border/40 px-3 pb-3 pt-2.5 text-xs space-y-2">
                        {/* key facts row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-brand-muted">
                          {c.assigned_emirate && <span><span className="font-medium text-brand-navy">Emirate:</span> {c.assigned_emirate}</span>}
                          {c.date_of_incident && <span><span className="font-medium text-brand-navy">Incident:</span> {c.date_of_incident}</span>}
                          {c.gender && <span><span className="font-medium text-brand-navy">Gender:</span> {c.gender}</span>}
                          {c.age != null && <span><span className="font-medium text-brand-navy">Age:</span> {c.age}</span>}
                          {c.passport && <span><span className="font-medium text-brand-navy">Passport:</span> {c.passport}</span>}
                          {c.phone && <span><span className="font-medium text-brand-navy">Phone:</span> {c.phone}</span>}
                          {c.company_name && <span><span className="font-medium text-brand-navy">Employer:</span> {c.company_name}</span>}
                        </div>

                        {/* summary */}
                        {summary && (
                          <p className="text-brand-muted leading-relaxed line-clamp-3">{summary}</p>
                        )}

                        {/* action link */}
                        <div className="pt-0.5">
                          <a href={`/cases/${c.id}`} className="font-medium text-brand-navy-light underline hover:text-brand-navy">
                            View full case →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {kpiCounts.attention > actionCases.length && (
                <button
                  onClick={() => toggleKpi('attention')}
                  className="w-full rounded-lg py-1.5 text-xs text-red-600 hover:bg-red-100/50"
                >
                  +{kpiCounts.attention - actionCases.length} more — click to view all
                </button>
              )}
            </div>
          )}
        </div>

        {openKpi === 'attention' && (
          <CaseAccordion
            cases={kpiCases} selectedId={kpiCase} onSelect={setKpiCase}
            label={`Need action · ${range !== 'all' ? range : 'all time'}`}
            onClose={() => { setOpenKpi(null); setKpiCase(null) }}
            userFullName={userFullName} employerCounts={employerCounts}
          />
        )}

        {/* supporting KPIs + avg resolution */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KPI_DEFS.filter(d => d.key !== 'attention').map(d => {
            const count = kpiCounts[d.key], isOn = openKpi === d.key
            return (
              <button key={d.key} onClick={() => toggleKpi(d.key)}
                className={`flex flex-col rounded-xl border p-3 text-left transition-all ${isOn ? 'border-brand-navy bg-brand-navy' : 'border-brand-border bg-brand-card hover:border-brand-navy/40'}`}>
                <span className={`text-[10px] uppercase tracking-wider ${isOn ? 'text-white/70' : 'text-brand-muted'}`}>{d.label}</span>
                <span className="mt-1 text-2xl font-semibold tabular-nums leading-tight"
                  style={{ color: isOn ? '#fff' : d.valueColor }}>{count}</span>
                <span className={`mt-1 text-[10px] ${isOn ? 'text-white/50' : 'text-brand-muted'}`}>
                  {isOn ? 'click to close' : count > 0 ? 'click to view ↓' : 'none'}
                </span>
              </button>
            )
          })}
          <div className="flex flex-col rounded-xl border border-brand-border bg-brand-card p-3">
            <span className="text-[10px] uppercase tracking-wider text-brand-muted">Avg resolution</span>
            <span className="mt-1 text-2xl font-semibold tabular-nums leading-tight text-emerald-600">
              {avgDays !== null ? `~${avgDays}d` : '—'}
            </span>
            <span className="mt-1 text-[10px] text-brand-muted">across resolved</span>
          </div>
        </div>

        {openKpi && openKpi !== 'attention' && (
          <CaseAccordion
            cases={kpiCases} selectedId={kpiCase} onSelect={setKpiCase}
            label={`${KPI_DEFS.find(d => d.key === openKpi)?.label ?? ''}${range !== 'all' ? ` · ${range}` : ''}`}
            onClose={() => { setOpenKpi(null); setKpiCase(null) }}
            userFullName={userFullName} employerCounts={employerCounts}
          />
        )}

        {/* charts row: donut + funnel */}
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                  Cases by type <span className="font-normal normal-case text-[9px]">· click segment or label</span>
                </p>
                {typeFilter && (
                  <button onClick={() => { setTypeFilter(null); if (detailFilter?.kind === 'type' || detailFilter?.kind === 'status') { setDetailFilter(null); setDetailCase(null) } }}
                    className="text-[10px] text-brand-muted hover:text-brand-navy">× clear</button>
                )}
              </div>
              <DonutChart data={donutData} onSlice={onTypeClick} activeValue={typeFilter} />
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                  Status pipeline <span className="font-normal normal-case text-[9px]">· click a stage to view cases</span>
                </p>
                {typeFilter && <span className="max-w-[90px] truncate text-[9px] text-brand-navy">{typeFilter}</span>}
              </div>
              <FunnelChart stages={funnelStages} onStage={onStatusClick} activeStatus={activeDetailStatus} />
            </div>
          </div>

          {/* accordion directly below charts when type or status clicked */}
          {isChartsFilter && detailFilter && (
            <div className="mt-2">
              <CaseAccordion {...sharedAccordionProps} />
            </div>
          )}
        </div>

        {/* analysis row: collapsible */}
        <div>
          <button
            onClick={() => setShowAnalysis(v => !v)}
            className="mb-2 flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-navy"
          >
            <span>{showAnalysis ? '↑' : '↓'}</span>
            <span>{showAnalysis ? 'Hide detailed analysis' : 'Show detailed analysis (age · emirate · organisation)'}</span>
          </button>
          {showAnalysis && (<><div className={`grid gap-4 ${showEmirateSplit ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>

            {showEmirateSplit && (
              <div className="rounded-xl border border-brand-border bg-brand-card p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                  Reporting emirate <span className="font-normal normal-case text-[9px]">· click to view</span>
                </p>
                <SegmentedBar
                  segments={[
                    { key: 'ad',    label: 'Abu Dhabi',      value: emirateSplit.ad,    color: '#378ADD' },
                    { key: 'other', label: 'Other emirates', value: emirateSplit.other, color: '#7F77DD' },
                  ]}
                  onSegment={key => openDetail({ kind: 'emirate', adOnly: key === 'ad', label: key === 'ad' ? 'Abu Dhabi' : 'Other emirates' })}
                  activeKey={activeDetailEmirate}
                />
              </div>
            )}

            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Case age — open only <span className="font-normal normal-case text-[9px]">· click tile to view</span>
              </p>
              <HeatmapTiles
                buckets={ageBuckets}
                onBucket={b => openDetail({ kind: 'age', minDays: b.minDays, maxDays: b.maxDays, label: b.label })}
                activeMinDays={activeDetailMinDays}
              />
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Reporting organisation <span className="font-normal normal-case text-[9px]">· click to view</span>
              </p>
              <OrgWidget data={orgBreakdown} onOrg={org => openDetail({ kind: 'org', org, label: org })} activeOrg={activeDetailOrg} />
            </div>
          </div>
          {isAnalysisFilter && detailFilter && (
            <div className="mt-2">
              <CaseAccordion {...sharedAccordionProps} />
            </div>
          )}
          </>)}
        </div>

        {/* alerts */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-[12px] text-brand-muted">
          <span className="font-medium" style={{ color: '#A32D2D' }}>Alerts</span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {criticalCount} critical case{criticalCount !== 1 ? 's' : ''} in period
            </span>
          )}
          {(() => {
            const repeat = [...employerCounts.entries()].filter(([, n]) => n >= 3)
            return repeat.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                {repeat.length} repeat employer{repeat.length !== 1 ? 's' : ''} (3+ cases)
              </span>
            ) : null
          })()}
        </div>

      </div>
    </div>
  )
}
