'use client'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'
import { daysOpen, getPriority, PRIORITY_DOT, PRIORITY_ORDER, sortByPriority } from '@/lib/caseUtils'
import type { PanelCase } from './CaseSidePanel'

// ─── constants ────────────────────────────────────────────────────────────────

const NEXT_ACTION: Record<string, string> = {
  sent:           'Acknowledge this case and assign an officer',
  acknowledged:   'Review and begin embassy follow-up',
  need_more_info: 'Waiting for reporter to provide additional information',
  in_progress:    'Continue embassy follow-up and update status when resolved',
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MEDIUM',
  normal:   'NORMAL',
}

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fee2e2', text: '#991b1b' },
  high:     { bg: '#fef3c7', text: '#92400e' },
  medium:   { bg: '#fef9c3', text: '#713f12' },
  normal:   { bg: '#f0fdf4', text: '#14532d' },
}

const LANES = [
  {
    status:      'sent',
    label:       'Received',
    sublabel:    'Awaiting embassy acknowledgement',
    borderColor: '#E24B4A',
    headerBg:    '#0b2545',
  },
  {
    status:      'acknowledged',
    label:       'Acknowledged',
    sublabel:    'Officer action required',
    borderColor: '#EF9F27',
    headerBg:    '#0b2545',
  },
  {
    status:      'need_more_info',
    label:       'Awaiting Reporter Response',
    sublabel:    'More information requested from reporter',
    borderColor: '#7F77DD',
    headerBg:    '#0b2545',
  },
  {
    status:      'in_progress',
    label:       'Under Embassy Action',
    sublabel:    'Active embassy follow-up in progress',
    borderColor: '#378ADD',
    headerBg:    '#0b2545',
  },
] as const

// ─── helpers ──────────────────────────────────────────────────────────────────

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
  return c.polished_summary
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30)
    .slice(0, 3)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function CaseRow({
  c,
  expanded,
  onToggle,
  userFullName,
  employerCounts,
}: {
  c: PanelCase
  expanded: boolean
  onToggle: () => void
  userFullName: string
  employerCounts: Map<string, number>
}) {
  const priority = getPriority(c.case_type, c.status, c.created_at)
  const days     = daysOpen(c.created_at)
  const bullets  = toBullets(c)
  const badge    = PRIORITY_BADGE[priority]
  const empCount = c.company_name ? (employerCounts.get(c.company_name) ?? 0) : 0
  const wa       = toWhatsApp(c.phone)

  return (
    <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-card transition-shadow hover:shadow-sm">
      {/* row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: PRIORITY_DOT[priority] }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-navy">{c.name ?? '—'}</p>
          <p className="truncate text-[11px] text-brand-muted">{c.case_type}</p>
        </div>
        <span className="hidden font-mono text-[10px] text-brand-muted sm:block">{c.case_id ?? '—'}</span>
        <span
          className={`w-8 flex-shrink-0 text-right text-xs font-semibold tabular-nums ${
            days >= 7 ? 'text-red-600' : days >= 3 ? 'text-amber-600' : 'text-brand-muted'
          }`}
        >
          {days}d
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: badge.bg, color: badge.text }}
        >
          {PRIORITY_LABEL[priority]}
        </span>
        <span className="text-[10px] text-brand-muted/60">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* inline brief */}
      {expanded && (
        <div className="border-t border-brand-border/40 space-y-3 px-4 pb-4 pt-3">

          {/* key facts */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-brand-muted">
            {c.assigned_emirate  && <span><span className="font-medium text-brand-navy">Emirate</span> {c.assigned_emirate}</span>}
            {c.date_of_incident  && <span><span className="font-medium text-brand-navy">Incident</span> {c.date_of_incident}</span>}
            {c.gender            && <span><span className="font-medium text-brand-navy">Gender</span> {c.gender}</span>}
            {c.age != null       && <span><span className="font-medium text-brand-navy">Age</span> {c.age}</span>}
            {c.passport          && <span><span className="font-medium text-brand-navy">Passport</span> {c.passport}</span>}
            {c.phone && (
              <span className="flex items-center gap-1">
                <span className="font-medium text-brand-navy">Phone</span> {c.phone}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-600">
                    <MessageCircle size={11} />
                  </a>
                )}
              </span>
            )}
            {c.company_name && (
              <span className="flex items-center gap-1">
                <span className="font-medium text-brand-navy">Employer</span> {c.company_name}
                {empCount >= 3 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
                    ⚠ {empCount} cases
                  </span>
                )}
              </span>
            )}
          </div>

          {/* next action */}
          <p className="text-[11px] text-brand-muted">
            <span className="font-semibold text-brand-navy">Next action: </span>
            {NEXT_ACTION[c.status] ?? '—'}
          </p>

          {/* situation bullets */}
          {bullets.length > 0 && (
            <ul className="space-y-1.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-muted">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* status update */}
          <div className="rounded-xl border border-brand-border bg-brand-bg p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Update status</p>
            <CaseStatusForm
              caseId={c.id}
              current={c.status}
              options={EMBASSY_STATUS_OPTIONS}
              defaultHandledBy={userFullName}
            />
          </div>

          <Link href={`/cases/${c.id}`} className="text-[11px] text-brand-navy-light underline hover:text-brand-navy">
            View full case &amp; attachments →
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function EmbassyActionCenter({
  cases,
  userFullName,
  employerCounts,
}: {
  cases: PanelCase[]
  userFullName: string
  employerCounts: Map<string, number>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Only open (non-resolved) cases, sorted critical-first within each lane
  const openCases = useMemo(
    () => cases.filter(c => !['resolved', 'closed', 'submitted'].includes(c.status)),
    [cases],
  )

  const laneMap = useMemo(() => {
    const m = new Map<string, PanelCase[]>()
    for (const lane of LANES) m.set(lane.status, [])
    for (const c of openCases) {
      if (m.has(c.status)) m.get(c.status)!.push(c)
    }
    for (const [, rows] of m) rows.sort(sortByPriority)
    return m
  }, [openCases])

  const totalOpen = openCases.length

  return (
    <div className="flex flex-col gap-5">

      {/* header summary */}
      <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-bg px-4 py-3">
        <p className="text-sm font-semibold text-brand-navy">
          {totalOpen === 0 ? 'All cases resolved — no open actions' : `${totalOpen} open case${totalOpen !== 1 ? 's' : ''} across all lanes`}
        </p>
        <p className="text-[11px] text-brand-muted">Sorted critical-first within each lane · click a case to expand</p>
      </div>

      {/* lanes */}
      {LANES.map(lane => {
        const laneCases = laneMap.get(lane.status) ?? []
        const isEmpty   = laneCases.length === 0

        return (
          <div key={lane.status} className="flex flex-col gap-2">
            {/* lane header */}
            <div
              className="flex items-center justify-between rounded-lg px-4 py-2.5"
              style={{ background: lane.headerBg }}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                  {lane.label}
                </span>
                <span className="ml-2 text-[10px] text-white/50">{lane.sublabel}</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isEmpty ? 'bg-white/10 text-white/50' : 'bg-white text-[#0b2545]'
                }`}
              >
                {isEmpty ? 'clear' : laneCases.length}
              </span>
            </div>

            {/* cases */}
            {isEmpty ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-brand-border px-4 py-3 text-[11px] text-brand-muted">
                <span className="text-green-500">✓</span> No cases in this lane
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {laneCases.map(c => (
                  <CaseRow
                    key={c.id}
                    c={c}
                    expanded={expandedId === c.id}
                    onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    userFullName={userFullName}
                    employerCounts={employerCounts}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}
