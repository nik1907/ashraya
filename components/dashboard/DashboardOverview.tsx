import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  HandHeart,
  Layers,
  Send,
  Users,
} from 'lucide-react'
import Link from 'next/link'

import type { DashboardStats } from '@/lib/stats'

import { ActivityPanel } from './ActivityPanel'
import { CaseCharts } from './CaseCharts'

export type ActivityItem = {
  id: string
  case_row_id: string
  label: string
  event_type: string
  to_status: string | null
  created_at: string
}

type StatTone = 'navy' | 'amber' | 'green' | 'saffron'
const TONE: Record<StatTone, string> = {
  navy: 'bg-brand-navy/10 text-brand-navy',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  saffron: 'bg-orange-100 text-orange-600',
}

function StatCard({
  icon,
  value,
  label,
  tone,
  href,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  tone: StatTone
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none text-brand-navy">{value}</div>
        <div className="mt-1 text-xs text-brand-muted">{label}</div>
      </div>
    </Link>
  )
}

export function DashboardOverview({
  stats,
  activity,
  basePath,
  extraStat,
  intro,
  simple = false,
}: {
  stats: DashboardStats
  activity: ActivityItem[]
  /** The role's list page (e.g. "/admin"), used to build filtered links. */
  basePath: string
  extraStat?: { label: string; value: number }
  intro?: string
  /** Compact mode: just clickable summary cards (no intro/charts/activity). */
  simple?: boolean
}) {
  const cards = (
    <>
      <StatCard icon={<Layers size={20} />} value={stats.total} label="Total cases" tone="navy" href={`${basePath}#cases`} />
      <StatCard icon={<CircleDot size={20} />} value={stats.open} label="Currently open" tone="amber" href={`${basePath}?status=open#cases`} />
      <StatCard icon={<CheckCircle2 size={20} />} value={stats.resolved} label="Helped / resolved" tone="green" href={`${basePath}?status=resolved#cases`} />
      <StatCard icon={<CalendarDays size={20} />} value={stats.thisMonth} label="This month" tone="saffron" href={`${basePath}?range=month#cases`} />
      {extraStat ? (
        <StatCard icon={<Users size={20} />} value={extraStat.value} label={extraStat.label} tone="navy" href={`${basePath}#pending`} />
      ) : (
        <StatCard icon={<Send size={20} />} value={stats.emailsSent} label="Sent to embassy" tone="navy" href={`${basePath}?emailed=1#cases`} />
      )}
    </>
  )

  if (simple) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards}
        </div>
        {stats.total > 0 && (
          <CaseCharts stats={stats} basePath={basePath} showTrend={false} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compassionate intro */}
      <div className="flex items-start gap-4 rounded-2xl border border-brand-border bg-gradient-to-r from-brand-navy to-brand-navy-light p-5 text-white shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <HandHeart size={22} className="text-brand-saffron" />
        </div>
        <div>
          <p className="font-semibold">
            {stats.open > 0
              ? `${stats.open} ${stats.open === 1 ? 'case' : 'cases'} need attention`
              : 'All cases are up to date'}
          </p>
          <p className="mt-0.5 text-sm text-white/75">
            {intro ??
              'Every entry here is a person your community is standing with. Thank you for the care you bring to this work.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column: stats + charts */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{cards}</div>

          {stats.total > 0 && <CaseCharts stats={stats} basePath={basePath} />}
        </div>

        {/* Sidebar: collapsible activity feed */}
        <ActivityPanel items={activity} />
      </div>
    </div>
  )
}
