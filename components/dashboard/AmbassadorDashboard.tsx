'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { daysOpen, getPriority, PRIORITY_DOT, sortByPriority } from '@/lib/caseUtils'
import { getMissionOneLiner, type OneLinerInput } from '@/app/ambassador/actions'
import { TrendsTab } from './TrendsTab'
import { AmbassadorExecutive } from './AmbassadorExecutive'
import type { ExecutiveData } from './AmbassadorExecutive'
import type { PanelCase } from './CaseSidePanel'

// ─── types ────────────────────────────────────────────────────────────────────

type MissionStatus = 'UNDER_CONTROL' | 'ELEVATED' | 'CRITICAL'
type ActionLabel   = 'URGENT' | 'ESCALATE' | 'FOLLOW UP' | 'CONTACT'

type MissionAction = {
  label:          ActionLabel
  title:          string
  subtitle:       string
  recommendation: string
  caseId?:        string
  employerName?:  string
}

type DeadlineCase = PanelCase & { hoursRemaining: number; isBreached: boolean }

type EmployerAlert = {
  employer:       string
  cases:          PanelCase[]
  hasCritical:    boolean
  hasTrafficking: boolean
}


// ─── helpers ─────────────────────────────────────────────────────────────────

function getSlaHours(caseType: string): number {
  const crit = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  return crit.some(k => caseType.toLowerCase().includes(k)) ? 48 : 7 * 24
}

function computeTop3(
  open:      PanelCase[],
  deadlines: DeadlineCase[],
  employers: EmployerAlert[],
): MissionAction[] {
  const seen    = new Set<string>()
  const results: (MissionAction & { prio: number })[] = []

  // 1. SLA breaches / imminent
  for (const c of deadlines.filter(d => d.isBreached || d.hoursRemaining <= 24)) {
    if (seen.has(c.id) || results.length >= 3) break
    seen.add(c.id)
    results.push({
      prio: c.isBreached ? 0 : 1,
      label: 'URGENT',
      title: `${c.name ?? 'Individual'} — ${c.case_type}`,
      subtitle: `${c.assigned_emirate} · ${c.isBreached ? 'SLA BREACHED' : `SLA breach in ${Math.round(c.hoursRemaining)}h`}`,
      recommendation: c.isBreached
        ? 'Immediate embassy intervention required — diplomatic SLA exceeded'
        : 'Ensure consular contact before deadline today',
      caseId: c.id,
    })
  }

  // 2. Employer escalations
  for (const a of employers) {
    if (results.length >= 3) break
    results.push({
      prio: a.hasTrafficking ? 1 : 2,
      label: 'ESCALATE',
      title: `${a.employer} — ${a.cases.length} case${a.cases.length !== 1 ? 's' : ''}`,
      subtitle: `${a.cases.length} cases in 90 days · ${a.cases[0]?.assigned_emirate ?? ''}`,
      recommendation: a.hasTrafficking
        ? 'Coordinate with UAE Police — trafficking indicators present'
        : 'Raise formally with UAE Ministry of Human Resources',
      employerName: a.employer,
    })
  }

  // 3. Stale critical cases
  const staleCrit = open
    .filter(c => !seen.has(c.id) && getPriority(c.case_type, c.status, c.created_at) === 'critical' && daysOpen(c.created_at) >= 3 && ['sent', 'submitted'].includes(c.status))
    .sort((a, b) => daysOpen(b.created_at) - daysOpen(a.created_at))

  for (const c of staleCrit) {
    if (results.length >= 3) break
    seen.add(c.id)
    results.push({
      prio: 3,
      label: 'FOLLOW UP',
      title: `${c.name ?? 'Individual'} — ${c.case_type}`,
      subtitle: `${c.assigned_emirate} · ${daysOpen(c.created_at)} days · awaiting embassy acknowledgement`,
      recommendation: 'Request immediate acknowledgement and assign an officer',
      caseId: c.id,
    })
  }

  // 4. Oldest open cases (fill)
  const oldest = [...open].filter(c => !seen.has(c.id)).sort((a, b) => daysOpen(b.created_at) - daysOpen(a.created_at))
  for (const c of oldest) {
    if (results.length >= 3) break
    seen.add(c.id)
    results.push({
      prio: 4,
      label: 'CONTACT',
      title: `${c.name ?? 'Individual'} — ${c.case_type}`,
      subtitle: `${c.assigned_emirate} · ${daysOpen(c.created_at)} days open · ${c.status.replace(/_/g, ' ')}`,
      recommendation: 'Verify current situation and provide welfare update to reporter',
      caseId: c.id,
    })
  }

  return results.sort((a, b) => a.prio - b.prio).slice(0, 3)
}

// ─── sub-components ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MissionStatus, { bg: string; border: string; dot: string; label: string }> = {
  UNDER_CONTROL: { bg: 'bg-green-50',  border: 'border-green-300', dot: 'bg-green-500',  label: '🟢 UNDER CONTROL' },
  ELEVATED:      { bg: 'bg-amber-50',  border: 'border-amber-400', dot: 'bg-amber-500',  label: '🟡 ELEVATED WATCH' },
  CRITICAL:      { bg: 'bg-red-50',    border: 'border-red-500',   dot: 'bg-red-500',    label: '🔴 CRITICAL' },
}

function StatusStrip({
  status, oneLiner, onRefresh, refreshing,
}: {
  status: MissionStatus; oneLiner: string | null; onRefresh: () => void; refreshing: boolean
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} px-5 py-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`h-3 w-3 flex-shrink-0 rounded-full ${cfg.dot} shadow-sm`} />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/70">{cfg.label}</p>
            <p className="mt-0.5 text-sm font-medium text-brand-navy leading-snug">
              {oneLiner ?? (status === 'UNDER_CONTROL'
                ? 'All cases within SLA. No critical signals active.'
                : status === 'ELEVATED'
                ? 'Active crisis cases require attention. Monitor closely.'
                : 'Multiple critical cases and SLA breaches require immediate action.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-shrink-0 text-[10px] font-medium text-brand-muted hover:text-brand-navy disabled:opacity-40 transition-colors"
        >
          {refreshing ? '…' : '↻ Refresh'}
        </button>
      </div>
    </div>
  )
}

const ACTION_LABEL_CONFIG: Record<ActionLabel, { bg: string; text: string }> = {
  URGENT:     { bg: 'bg-red-100',    text: 'text-red-700'    },
  ESCALATE:   { bg: 'bg-purple-100', text: 'text-purple-700' },
  'FOLLOW UP':{ bg: 'bg-amber-100',  text: 'text-amber-700'  },
  CONTACT:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
}

function ActionCard({ n, action }: { n: number; action: MissionAction }) {
  const cfg = ACTION_LABEL_CONFIG[action.label]
  return (
    <div className="flex gap-3 rounded-xl border border-brand-border bg-brand-card p-4">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
            {action.label}
          </span>
          <p className="text-sm font-bold text-brand-navy">{action.title}</p>
        </div>
        <p className="text-[11px] text-brand-muted mb-2">{action.subtitle}</p>
        <p className="text-[11px] font-medium text-brand-navy/80">
          → {action.recommendation}
        </p>
        {action.caseId && (
          <Link
            href={`/cases/${action.caseId}`}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-navy-light hover:underline"
          >
            Open case →
          </Link>
        )}
      </div>
    </div>
  )
}

function DeadlineWatch({ cases }: { cases: DeadlineCase[] }) {
  if (cases.length === 0) return null
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      <div className="border-b border-brand-border bg-brand-navy/5 px-4 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy">Deadline Watch — Next 72 Hours</p>
      </div>
      <div className="divide-y divide-brand-border/50">
        {cases.map(c => {
          const isBreached = c.isBreached
          const hrs = Math.abs(Math.round(c.hoursRemaining))
          return (
            <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${isBreached ? 'bg-red-50' : ''}`}>
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${isBreached ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="min-w-0 flex-1 text-[11px]">
                <span className="font-semibold text-brand-navy">{c.name ?? 'Individual'}</span>
                <span className="text-brand-muted"> · {c.case_type} · {c.assigned_emirate}</span>
              </div>
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isBreached ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isBreached ? `BREACHED ${hrs}h ago` : `${hrs}h remaining`}
              </span>
              <Link href={`/cases/${c.id}`} className="text-[10px] text-brand-muted hover:text-brand-navy">→</Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MissionHealth({
  vitals,
  changeSummary,
}: {
  vitals: { open: number; critical: number; avgDays: number; newThisWeek: number }
  changeSummary: { newSince: number; timeLabel: string } | null
}) {
  const stats = [
    { label: 'Open Cases',     value: vitals.open,        color: '#0b2545' },
    { label: 'Critical',       value: vitals.critical,    color: '#E24B4A' },
    { label: 'Avg Days Open',  value: vitals.avgDays,     color: '#EF9F27' },
    { label: 'New (7 days)',   value: vitals.newThisWeek, color: '#138808' },
  ]
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      <div className="border-b border-brand-border bg-brand-navy/5 px-4 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy">Mission Health</p>
        {changeSummary && (
          <p className="text-[10px] text-brand-muted">
            Since your last visit ({changeSummary.timeLabel}):
            <span className="ml-1 font-semibold text-brand-navy">
              {changeSummary.newSince} new case{changeSummary.newSince !== 1 ? 's' : ''}
            </span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-brand-border/50 sm:grid-cols-4 sm:divide-y-0">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center px-4 py-4">
            <span className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-muted text-center">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmployerPatternWatch({ alerts, onDrill }: { alerts: EmployerAlert[]; onDrill: (emp: string) => void }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      <div className="border-b border-brand-border bg-brand-navy/5 px-4 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy">
          Employer Pattern Watch
          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-700">{alerts.length}</span>
        </p>
      </div>
      <div className="divide-y divide-brand-border/50">
        {alerts.map(a => {
          const typeBreakdown = [...a.cases.reduce<Map<string, number>>((m, c) => m.set(c.case_type, (m.get(c.case_type) ?? 0) + 1), new Map()).entries()].sort((x, y) => y[1] - x[1])
          const recommendation = a.hasTrafficking
            ? `Coordinate with UAE Police — trafficking indicators`
            : a.cases.length >= 5
            ? 'Raise with UAE Ministry of Human Resources'
            : 'Monitor · escalate if 2 more cases in 30 days'
          return (
            <button
              key={a.employer}
              type="button"
              onClick={() => onDrill(a.employer)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-bg transition-colors"
            >
              <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${a.hasCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-brand-navy">{a.employer}</p>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                    {a.cases.length} CASES · 90D
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted">
                  {typeBreakdown.slice(0, 3).map(([t, n]) => `${t} (${n})`).join(' · ')}
                </p>
                <p className="mt-1 text-[11px] font-medium text-brand-navy/70">→ {recommendation}</p>
              </div>
              <span className="flex-shrink-0 text-brand-muted/40 text-xs">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CasesTab({ cases }: { cases: PanelCase[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const sorted = useMemo(() => [...cases].sort(sortByPriority), [cases])

  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-5">
        <span className="text-green-500 text-xl">✓</span>
        <div>
          <p className="text-sm font-semibold text-green-800">No open cases</p>
          <p className="text-[11px] text-green-600">All cases have been resolved or closed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      <div className="border-b border-brand-border bg-brand-navy/5 px-4 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy">All Open Cases</p>
        <span className="text-[10px] text-brand-muted">{sorted.length} case{sorted.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="max-h-[560px] overflow-y-auto divide-y divide-brand-border/40">
        {sorted.map(c => {
          const priority = getPriority(c.case_type, c.status, c.created_at)
          const days     = daysOpen(c.created_at)
          const isOpen   = open === c.id
          return (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-bg transition-colors"
              >
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: PRIORITY_DOT[priority] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-navy">{c.name ?? 'Individual'}</p>
                  <p className="text-[11px] text-brand-muted">{c.case_type} · {c.assigned_emirate} · {c.status.replace(/_/g, ' ')}</p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  days >= 14 ? 'bg-red-100 text-red-700' : days >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {days}d
                </span>
                <span className="text-brand-muted/40 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-brand-border/30 bg-brand-bg px-4 pb-3 pt-2">
                  {c.case_brief ? (
                    <ul className="space-y-1 mb-2">
                      {c.case_brief.split('\n').filter(s => s.trim().length > 8).map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-brand-muted">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-saffron" />
                          {b.trim()}
                        </li>
                      ))}
                    </ul>
                  ) : c.polished_summary ? (
                    <p className="mb-2 text-[11px] text-brand-muted line-clamp-3">{c.polished_summary}</p>
                  ) : null}
                  <Link href={`/cases/${c.id}`} className="text-[11px] font-medium text-brand-navy-light hover:underline">
                    View full case →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── main component ───────────────────────────────────────────────────────────

export function AmbassadorDashboard({
  cases,
  oneLinerInput,
  serverStatus,
  executiveData,
  designation,
}: {
  cases:           PanelCase[]
  oneLinerInput:   OneLinerInput
  serverStatus:    'UNDER_CONTROL' | 'ELEVATED' | 'CRITICAL'
  executiveData?:  ExecutiveData
  designation?:    string
}) {
  const router = useRouter()
  const [tab, setTab]               = useState<'overview' | 'cases' | 'trends' | 'executive'>('executive')
  const [lastVisitTs, setLastVisit] = useState<number | null>(null)
  const [empDrill, setEmpDrill]     = useState<string | null>(null)
  const [refreshing, startRefresh]  = useTransition()
  const [oneLiner, setOneLiner]     = useState<string | null>(null)

  // Track last visit in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('amb_last_visit')
    setLastVisit(stored ? parseInt(stored, 10) : null)
    localStorage.setItem('amb_last_visit', String(Date.now()))
  }, [])

  // Load AI one-liner in background after page renders
  useEffect(() => {
    getMissionOneLiner(oneLinerInput).then(r => { if (r) setOneLiner(r) }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── computed ──────────────────────────────────────────────────────────────
  const openCases = useMemo(
    () => cases.filter(c => !['resolved', 'closed'].includes(c.status)),
    [cases],
  )

  const deadlineCases = useMemo<DeadlineCase[]>(() => {
    return openCases
      .map(c => {
        const slaH = getSlaHours(c.case_type)
        const hrOpen = (Date.now() - new Date(c.created_at).getTime()) / 3_600_000
        const hoursRemaining = slaH - hrOpen
        return { ...c, hoursRemaining, isBreached: hoursRemaining <= 0 }
      })
      .filter(c => c.hoursRemaining <= 72)
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining)
      .slice(0, 5)
  }, [openCases])

  const employerAlerts = useMemo<EmployerAlert[]>(() => {
    const cutoff90 = Date.now() - 90 * 86_400_000
    const recent   = openCases.filter(c => new Date(c.created_at).getTime() >= cutoff90)
    const m        = new Map<string, PanelCase[]>()
    for (const c of recent) {
      if (c.company_name) {
        if (!m.has(c.company_name)) m.set(c.company_name, [])
        m.get(c.company_name)!.push(c)
      }
    }
    return [...m.entries()]
      .filter(([, cs]) => cs.length >= 3)
      .map(([employer, cs]) => ({
        employer,
        cases: cs,
        hasCritical:    cs.some(c => getPriority(c.case_type, c.status, c.created_at) === 'critical'),
        hasTrafficking: cs.some(c => c.case_type.toLowerCase().includes('traffick')),
      }))
      .sort((a, b) => (b.hasCritical ? 1 : 0) - (a.hasCritical ? 1 : 0) || b.cases.length - a.cases.length)
  }, [openCases])

  const top3 = useMemo(
    () => computeTop3(openCases, deadlineCases, employerAlerts),
    [openCases, deadlineCases, employerAlerts],
  )

  const vitals = useMemo(() => ({
    open:        openCases.length,
    critical:    openCases.filter(c => getPriority(c.case_type, c.status, c.created_at) === 'critical').length,
    avgDays:     openCases.length
      ? Math.round(openCases.reduce((s, c) => s + daysOpen(c.created_at), 0) / openCases.length)
      : 0,
    newThisWeek: cases.filter(c => new Date(c.created_at).getTime() >= Date.now() - 7 * 86_400_000).length,
  }), [openCases, cases])

  const changeSummary = useMemo(() => {
    if (!lastVisitTs) return null
    const newSince   = cases.filter(c => new Date(c.created_at).getTime() > lastVisitTs).length
    const hoursAgo   = Math.round((Date.now() - lastVisitTs) / 3_600_000)
    const timeLabel  = hoursAgo < 1 ? 'just now'
      : hoursAgo === 1 ? '1 hour ago'
      : hoursAgo < 24  ? `${hoursAgo} hours ago`
      : `${Math.round(hoursAgo / 24)} days ago`
    return { newSince, timeLabel }
  }, [cases, lastVisitTs])

  const empDrillCases = useMemo(
    () => empDrill ? cases.filter(c => c.company_name === empDrill) : [],
    [cases, empDrill],
  )

  // ─────────────────────────────────────────────────────────────────────────
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Mission Command · Ashraya Welfare Platform</p>
          <h1 className="text-xl font-black text-brand-navy">Embassy of India — UAE</h1>
          <p className="text-[11px] text-brand-muted">
            {designation ? `${designation} · ` : ''}{dateStr}
          </p>
        </div>
        {/* Tab bar */}
        <div className="flex items-center gap-1 rounded-xl border border-brand-border bg-brand-card p-1">
          {(['executive', 'overview', 'cases', 'trends'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold capitalize transition-all ${
                tab === t ? 'bg-brand-navy text-white' : 'text-brand-muted hover:text-brand-navy'
              }`}
            >
              {t === 'executive'  ? 'Executive'
               : t === 'overview' ? 'Action Center'
               : t === 'cases'    ? `Cases${openCases.length > 0 ? ` (${openCases.length})` : ''}`
               :                    'Trends'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview tab ───────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          {/* 1. Mission Status Strip */}
          <StatusStrip
            status={serverStatus}
            oneLiner={oneLiner}
            onRefresh={() => startRefresh(() => { router.refresh() })}
            refreshing={refreshing}
          />

          {/* 2. Top 3 Actions Today */}
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-brand-muted">Top 3 Actions Today</p>
            {top3.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                <span className="text-green-500">✓</span>
                <p className="text-sm font-semibold text-green-800">No immediate actions required.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {top3.map((a, i) => <ActionCard key={i} n={i + 1} action={a} />)}
              </div>
            )}
          </section>

          {/* 3. Deadline Watch */}
          {deadlineCases.length > 0 && <DeadlineWatch cases={deadlineCases} />}

          {/* 4. Mission Health */}
          <MissionHealth vitals={vitals} changeSummary={changeSummary} />

          {/* 5. Employer Pattern Watch */}
          {employerAlerts.length > 0 && (
            <>
              <EmployerPatternWatch
                alerts={employerAlerts}
                onDrill={emp => setEmpDrill(empDrill === emp ? null : emp)}
              />
              {empDrill && empDrillCases.length > 0 && (
                <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-brand-border bg-brand-navy/5 px-4 py-2.5">
                    <p className="text-sm font-semibold text-brand-navy">Employer: {empDrill}</p>
                    <button type="button" onClick={() => setEmpDrill(null)} className="text-brand-muted hover:text-brand-navy text-sm">×</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-brand-border/40">
                    {[...empDrillCases].sort(sortByPriority).map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: PRIORITY_DOT[getPriority(c.case_type, c.status, c.created_at)] }} />
                        <div className="min-w-0 flex-1 text-[11px]">
                          <span className="font-semibold text-brand-navy">{c.name ?? '—'}</span>
                          <span className="text-brand-muted"> · {c.case_type} · {c.assigned_emirate} · {daysOpen(c.created_at)}d</span>
                        </div>
                        <Link href={`/cases/${c.id}`} className="text-[10px] text-brand-muted hover:text-brand-navy">→</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Cases tab ──────────────────────────────────────────────────────── */}
      {tab === 'cases' && <CasesTab cases={openCases} />}

      {/* ── Trends tab ─────────────────────────────────────────────────────── */}
      {tab === 'trends' && <TrendsTab cases={cases} />}

      {/* ── Executive tab ──────────────────────────────────────────────────── */}
      {tab === 'executive' && (
        executiveData
          ? <AmbassadorExecutive data={executiveData} cases={cases} />
          : <div className="rounded-xl border border-brand-border bg-brand-card px-6 py-8 text-center text-sm text-brand-muted">Executive data unavailable</div>
      )}

    </div>
  )
}
