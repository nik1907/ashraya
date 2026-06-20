'use client'

import { Activity, ListTree, PieChart as PieIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DashboardStats } from '@/lib/stats'

const TYPE_COLORS = ['#0b2545', '#13315c', '#1c4283', '#2f6fbf', '#5b93d6']

const STATUS_COLORS: Record<string, string> = {
  submitted: '#94a3b8',
  sent: '#3b82f6',
  acknowledged: '#6366f1',
  in_progress: '#f59e0b',
  resolved: '#16a34a',
  closed: '#64748b',
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <span className="text-brand-saffron">{icon}</span>
        {title}
      </h3>
      <div style={{ width: '100%', height: 220 }}>{children}</div>
    </div>
  )
}

export function CaseCharts({
  stats,
  basePath,
}: {
  stats: DashboardStats
  basePath: string
}) {
  const router = useRouter()
  const statusTotal = stats.byStatus.reduce((s, d) => s + d.value, 0)
  const topTypes = stats.byType.slice(0, 5)

  const goType = (i: number) => {
    const t = topTypes[i]?.label
    if (t) router.push(`${basePath}?type=${encodeURIComponent(t)}#cases`)
  }
  const goStatus = (i: number) => {
    const s = stats.byStatus[i]?.label
    if (s) router.push(`${basePath}?status=${encodeURIComponent(s)}#cases`)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ChartCard title="Cases by type" icon={<ListTree size={16} />}>
        <ResponsiveContainer>
          <BarChart data={topTypes} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: '#5b6677' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'rgba(11,37,69,0.04)' }} />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              barSize={18}
              style={{ cursor: 'pointer' }}
              onClick={(_, i) => goType(i)}
            >
              {topTypes.map((_, i) => (
                <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cases by status" icon={<PieIcon size={16} />}>
        <div className="relative h-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stats.byStatus}
                dataKey="value"
                nameKey="label"
                innerRadius={58}
                outerRadius={85}
                paddingAngle={2}
                stroke="none"
                style={{ cursor: 'pointer' }}
                onClick={(_, i) => goStatus(i)}
              >
                {stats.byStatus.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[d.label] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-brand-navy">{statusTotal}</span>
            <span className="text-xs text-brand-muted">total</span>
          </div>
        </div>
      </ChartCard>
      </div>

      <ChartCard title="Submissions · last 14 days" icon={<Activity size={16} />}>
        <ResponsiveContainer>
          <AreaChart data={stats.trend} margin={{ left: -22, right: 8, top: 6 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#13315c" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#13315c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5b6677' }} interval={2} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#5b6677' }} tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#13315c"
              strokeWidth={2.5}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
