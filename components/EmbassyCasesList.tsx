'use client'

import Link from 'next/link'
import { useState } from 'react'

type CaseRow = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
  assigned_emirate: string
  created_at: string
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  sent:           { bg: '#E6F1FB', text: '#0C447C' },
  acknowledged:   { bg: '#EEEDFE', text: '#3C3489' },
  need_more_info: { bg: '#FBEAF0', text: '#4B1528' },
  in_progress:    { bg: '#FAEEDA', text: '#633806' },
  submitted:      { bg: '#F1EFE8', text: '#444441' },
  resolved:       { bg: '#EAF3DE', text: '#27500A' },
  closed:         { bg: '#F1EFE8', text: '#444441' },
}

const STATUS_DISPLAY: Record<string, string> = {
  submitted:      'Processing',
  sent:           'Received',
  acknowledged:   'Acknowledged',
  need_more_info: 'Info Requested',
  in_progress:    'In Progress',
  resolved:       'Resolved',
  closed:         'Closed',
}

type Pill = {
  label: string
  match: (s: string) => boolean
}

const PILLS: Pill[] = [
  { label: 'All',               match: () => true },
  { label: 'Received',          match: s => s === 'sent' },
  { label: 'Acknowledged',      match: s => s === 'acknowledged' },
  { label: 'Info Requested',    match: s => s === 'need_more_info' },
  { label: 'In Progress',       match: s => s === 'in_progress' },
  { label: 'Resolved / Closed', match: s => s === 'resolved' || s === 'closed' },
]

export function EmbassyCasesList({ cases }: { cases: CaseRow[] }) {
  const [activeIdx, setActiveIdx] = useState(0)

  const filtered = cases.filter(c => PILLS[activeIdx].match(c.status))

  return (
    <div>
      {/* Status filter pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        {PILLS.map((p, i) => {
          const count  = cases.filter(c => p.match(c.status)).length
          const active = activeIdx === i
          return (
            <button
              key={p.label}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-brand-border text-brand-muted hover:border-brand-navy hover:text-brand-navy'
              }`}
            >
              {p.label}
              <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-brand-muted'}`}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-6 text-sm text-brand-muted">
          No cases in this status.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
              <tr>
                <th className="px-4 py-2.5">Case ID</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Emirate</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Reported</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const style = STATUS_STYLE[c.status] ?? { bg: '#F1EFE8', text: '#444441' }
                return (
                  <tr key={c.id} className="border-t border-brand-border hover:bg-brand-navy/5">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-medium text-brand-navy-light hover:underline"
                      >
                        {c.case_id ?? <span className="text-brand-muted">—</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{c.case_type}</td>
                    <td className="px-4 py-2.5 font-medium text-brand-navy">{c.name ?? '—'}</td>
                    <td className="px-4 py-2.5">{c.assigned_emirate}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {STATUS_DISPLAY[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-brand-muted">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
