'use client'

import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  Layers,
  MessageCircleQuestion,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { fmtDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/CasesList'
import type { DashboardStats } from '@/lib/stats'

type CaseRow = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
  assigned_emirate: string
  created_at: string
}

type CardDef = {
  key: string
  icon: React.ReactNode
  label: string
  value: (s: DashboardStats) => number
  tone: string
  iconBg: string
  filter: (q: ReturnType<ReturnType<typeof createClient>['from']>) => ReturnType<ReturnType<typeof createClient>['from']>
}

function startOfMonthISO() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

const CARDS: CardDef[] = [
  {
    key: 'total',
    icon: <Layers size={20} />,
    label: 'Total cases',
    value: (s) => s.total,
    tone: 'text-brand-navy',
    iconBg: 'bg-brand-navy/10 text-brand-navy',
    filter: (q) => q,
  },
  {
    key: 'month',
    icon: <CalendarDays size={20} />,
    label: 'This month',
    value: (s) => s.thisMonth,
    tone: 'text-orange-600',
    iconBg: 'bg-orange-100 text-orange-600',
    filter: (q) => (q as any).gte('created_at', startOfMonthISO()),
  },
  {
    key: 'submitted',
    icon: <CircleDot size={20} />,
    label: 'Open / with Embassy',
    value: (s) => s.submitted,
    tone: 'text-amber-700',
    iconBg: 'bg-amber-100 text-amber-700',
    filter: (q) => (q as any).in('status', ['submitted', 'sent']),
  },
  {
    key: 'acknowledged',
    icon: <Eye size={20} />,
    label: 'Acknowledged',
    value: (s) => s.acknowledged,
    tone: 'text-brand-navy',
    iconBg: 'bg-brand-navy/10 text-brand-navy',
    filter: (q) => (q as any).eq('status', 'acknowledged'),
  },
  {
    key: 'moreInfo',
    icon: <MessageCircleQuestion size={20} />,
    label: 'More info requested',
    value: (s) => s.moreInfo,
    tone: 'text-amber-700',
    iconBg: 'bg-amber-100 text-amber-700',
    filter: (q) => (q as any).eq('status', 'more_info_requested'),
  },
  {
    key: 'inProgress',
    icon: <Clock size={20} />,
    label: 'In progress',
    value: (s) => s.inProgress,
    tone: 'text-orange-600',
    iconBg: 'bg-orange-100 text-orange-600',
    filter: (q) => (q as any).eq('status', 'in_progress'),
  },
  {
    key: 'resolved',
    icon: <CheckCircle2 size={20} />,
    label: 'Resolved',
    value: (s) => s.resolved,
    tone: 'text-green-700',
    iconBg: 'bg-green-100 text-green-700',
    filter: (q) => (q as any).in('status', ['resolved', 'closed']),
  },
]

export function VolunteerStatCards({ stats }: { stats: DashboardStats }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(false)

  async function handleClick(card: CardDef) {
    if (activeKey === card.key) {
      setActiveKey(null)
      setCases([])
      return
    }
    setActiveKey(card.key)
    setLoading(true)
    const supabase = createClient()
    const baseQuery = supabase
      .from('cases')
      .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (card.filter(baseQuery as any) as any)
    setCases((result?.data ?? []) as CaseRow[])
    setLoading(false)
  }

  const activeCard = CARDS.find((c) => c.key === activeKey)

  return (
    <div className="space-y-3">
      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map((card) => {
          const isActive = activeKey === card.key
          return (
            <button
              key={card.key}
              onClick={() => handleClick(card)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
                isActive
                  ? 'border-brand-navy bg-brand-navy/5 ring-2 ring-brand-navy/20'
                  : 'border-brand-border bg-brand-card'
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <div className="text-2xl font-bold leading-none text-brand-navy">
                  {card.value(stats)}
                </div>
                <div className="mt-1 text-xs text-brand-muted">{card.label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Inline cases panel — pops open below the cards */}
      {activeKey && (
        <div className="rounded-xl border border-brand-navy/20 bg-brand-card shadow-sm">
          <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
            <span className="text-sm font-semibold text-brand-navy">
              {activeCard?.label}
            </span>
            <button
              onClick={() => { setActiveKey(null); setCases([]) }}
              className="rounded p-1 text-brand-muted hover:text-brand-navy"
            >
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-brand-muted">Loading…</p>
          ) : cases.length === 0 ? (
            <p className="px-4 py-6 text-sm text-brand-muted">No cases in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
                  <tr>
                    <th className="px-4 py-2.5">Case ID</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Person</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-t border-brand-border hover:bg-brand-navy/5">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-medium text-brand-navy-light hover:underline"
                        >
                          {c.case_id ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-brand-muted">{c.case_type}</td>
                      <td className="px-4 py-2.5">{c.name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2.5 text-brand-muted">
                        {fmtDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
