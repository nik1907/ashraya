import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  FilePlus2,
  HandHeart,
  Layers,
  Mail,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react'
import Link from 'next/link'

import type { DashboardStats } from '@/lib/stats'

import { CaseCharts } from './CaseCharts'

export type ActivityItem = {
  id: string
  case_row_id: string
  label: string
  event_type: string
  to_status: string | null
  created_at: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
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
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  tone: StatTone
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none text-brand-navy">{value}</div>
        <div className="mt-1 text-xs text-brand-muted">{label}</div>
      </div>
    </div>
  )
}

const EVENT_META: Record<
  string,
  { icon: React.ReactNode; tone: string; verb: string }
> = {
  submitted: { icon: <FilePlus2 size={15} />, tone: 'bg-blue-100 text-blue-700', verb: 'New case submitted' },
  status_changed: { icon: <RefreshCw size={15} />, tone: 'bg-amber-100 text-amber-700', verb: 'Status updated' },
  email_sent: { icon: <Mail size={15} />, tone: 'bg-green-100 text-green-700', verb: 'Emailed to embassy' },
  acknowledged: { icon: <CheckCircle2 size={15} />, tone: 'bg-indigo-100 text-indigo-700', verb: 'Acknowledged' },
  edited: { icon: <RefreshCw size={15} />, tone: 'bg-slate-100 text-slate-700', verb: 'Edited' },
}

export function DashboardOverview({
  stats,
  activity,
  extraStat,
  intro,
}: {
  stats: DashboardStats
  activity: ActivityItem[]
  extraStat?: { label: string; value: number }
  intro?: string
}) {
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={<Layers size={20} />} value={stats.total} label="Total cases" tone="navy" />
            <StatCard icon={<CircleDot size={20} />} value={stats.open} label="Currently open" tone="amber" />
            <StatCard icon={<CheckCircle2 size={20} />} value={stats.resolved} label="Helped / resolved" tone="green" />
            <StatCard icon={<CalendarDays size={20} />} value={stats.thisMonth} label="This month" tone="saffron" />
            {extraStat ? (
              <StatCard icon={<Users size={20} />} value={extraStat.value} label={extraStat.label} tone="navy" />
            ) : (
              <StatCard icon={<Send size={20} />} value={stats.emailsSent} label="Sent to embassy" tone="navy" />
            )}
          </div>

          {stats.total > 0 && <CaseCharts stats={stats} />}
        </div>

        {/* Sidebar: activity feed */}
        <aside className="rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Clock size={16} className="text-brand-saffron" />
            Recent activity
          </h3>
          {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted">
            No activity yet — as cases come in, they'll appear here.
          </p>
        ) : (
          <ul className="space-y-1">
            {activity.map((a) => {
              const meta = EVENT_META[a.event_type] ?? {
                icon: <CircleDot size={15} />,
                tone: 'bg-slate-100 text-slate-700',
                verb: a.event_type,
              }
              return (
                <li key={a.id}>
                  <Link
                    href={`/cases/${a.case_row_id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-brand-navy/5"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-brand-navy">{meta.verb}</span>
                      {a.to_status && (
                        <span className="text-sm text-brand-muted"> → {a.to_status.replace('_', ' ')}</span>
                      )}
                      <span className="block truncate text-xs text-brand-muted">{a.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-brand-muted">
                      {relativeTime(a.created_at)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        </aside>
      </div>
    </div>
  )
}
