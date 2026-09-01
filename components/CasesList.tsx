import Link from 'next/link'

import { fmtDate } from '@/lib/dates'
import { CASE_STATUS_LABELS } from '@/lib/types'

export type CaseRow = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
  assigned_emirate: string
  created_at: string
}

export function CasesList({ cases }: { cases: CaseRow[] }) {
  if (cases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-6 text-sm text-brand-muted">
        No cases yet.
      </p>
    )
  }

  return (
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
          {cases.map((c) => (
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
              <td className="px-4 py-2.5">{c.name ?? '—'}</td>
              <td className="px-4 py-2.5">{c.assigned_emirate}</td>
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
  )
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-indigo-100 text-indigo-800',
  need_more_info: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-green-100 text-green-800',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {CASE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
    </span>
  )
}
