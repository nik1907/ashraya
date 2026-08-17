'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { daysOpen, getPriority, PRIORITY_DOT, sortByPriority } from '@/lib/caseUtils'
import { ReportTab } from './ReportTab'
import { AmbassadorExecutive } from './AmbassadorExecutive'
import { PragyaDashboard } from './PragyaDashboard'
import type { ExecutiveData } from './AmbassadorExecutive'
import type { PanelCase } from './CaseSidePanel'

// ─── sub-components ───────────────────────────────────────────────────────────

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
  executiveData,
  designation,
}: {
  cases:          PanelCase[]
  executiveData?: ExecutiveData
  designation?:   string
}) {
  const [tab, setTab] = useState<'cases' | 'trends' | 'executive' | 'pragya'>('executive')

  const openCases = useMemo(
    () => cases.filter(c => !['resolved', 'closed'].includes(c.status)),
    [cases],
  )

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
        <div className="flex items-center gap-1 rounded-xl border border-brand-border bg-brand-card p-1 print:hidden">
          {(['executive', 'pragya', 'cases', 'trends'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                tab === t ? 'bg-brand-navy text-white' : 'text-brand-muted hover:text-brand-navy'
              }`}
            >
              {t === 'executive' ? 'Executive'
               : t === 'pragya'  ? 'Pragya · Insights'
               : t === 'cases'   ? `Cases${openCases.length > 0 ? ` (${openCases.length})` : ''}`
               :                   'Reports'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pragya tab ─────────────────────────────────────────────────────── */}
      {tab === 'pragya' && (
        <div>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">Deep Intelligence Engine</p>
            <h2 className="text-lg font-black text-brand-navy">Pragya</h2>
            <p className="text-[11px] text-brand-muted">AI-grounded patterns · No hallucination · Mission &amp; period filterable</p>
          </div>
          <PragyaDashboard />
        </div>
      )}

      {/* ── Cases tab ──────────────────────────────────────────────────────── */}
      {tab === 'cases' && <CasesTab cases={openCases} />}

      {/* ── Trends tab ─────────────────────────────────────────────────────── */}
      {tab === 'trends' && <ReportTab cases={cases} designation={designation} />}

      {/* ── Executive tab ──────────────────────────────────────────────────── */}
      {tab === 'executive' && (
        executiveData
          ? <AmbassadorExecutive data={executiveData} cases={cases} />
          : <div className="rounded-xl border border-brand-border bg-brand-card px-6 py-8 text-center text-sm text-brand-muted">Executive data unavailable</div>
      )}

    </div>
  )
}
