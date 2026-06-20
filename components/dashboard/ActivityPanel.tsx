'use client'

import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock,
  FilePlus2,
  Mail,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import type { ActivityItem } from './DashboardOverview'

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

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  const [open, setOpen] = useState(true)

  return (
    <aside className="self-start rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm lg:col-span-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-brand-navy"
      >
        <span className="flex items-center gap-2">
          <Clock size={16} className="text-brand-saffron" />
          Recent activity
        </span>
        <ChevronDown
          size={16}
          className={`text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        (items.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted">
            No activity yet — as cases come in, they&apos;ll appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {items.map((a) => {
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
        ))}
    </aside>
  )
}
