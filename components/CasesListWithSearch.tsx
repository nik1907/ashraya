'use client'

import Fuse from 'fuse.js'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { ADMIN_STATUS_OPTIONS, CASE_STATUS_LABELS } from '@/lib/types'

export type AdminCaseRow = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
  reporter_name: string | null
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

export function CasesListWithSearch({ cases }: { cases: AdminCaseRow[] }) {
  const [query,  setQuery]  = useState('')
  const [status, setStatus] = useState('')

  const fuse = useMemo(() => new Fuse(cases, {
    keys: ['name', 'reporter_name', 'case_id', 'case_type', 'assigned_emirate'],
    threshold: 0.4,
    minMatchCharLength: 2,
    includeScore: true,
  }), [cases])

  const filtered = useMemo(() => {
    let rows = query.trim().length >= 2
      ? fuse.search(query).map(r => r.item)
      : [...cases]
    if (status) rows = rows.filter(c => c.status === status)
    return rows
  }, [cases, fuse, query, status])

  return (
    <div>
      {/* fuzzy search + status filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: 240 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Fuzzy search — name, reporter, employer, case ID…"
            className="w-full rounded-lg border border-brand-border bg-brand-card py-1.5 pl-8 pr-7 text-sm text-brand-navy placeholder:text-brand-muted focus:border-brand-navy focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy">
              <X size={12} />
            </button>
          )}
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-lg border border-brand-border bg-brand-card px-3 py-1.5 text-sm text-brand-navy"
        >
          <option value="">All statuses</option>
          {ADMIN_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {CASE_STATUS_LABELS[s as keyof typeof CASE_STATUS_LABELS] ?? s}
            </option>
          ))}
        </select>

        {(query || status) && (
          <button
            onClick={() => { setQuery(''); setStatus('') }}
            className="text-sm text-brand-muted underline hover:text-brand-navy"
          >
            Clear
          </button>
        )}

        <span className="text-xs text-brand-muted">
          {filtered.length} case{filtered.length !== 1 ? 's' : ''}
          {query.trim().length >= 2 ? ' (fuzzy match)' : ''}
        </span>
      </div>

      {/* table */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-6 text-sm text-brand-muted">
          No matching cases.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
              <tr>
                <th className="px-4 py-2.5">Case ID</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Affected</th>
                <th className="px-4 py-2.5">Reporter</th>
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
                      <Link href={`/cases/${c.id}`} className="font-medium text-brand-navy-light hover:underline">
                        {c.case_id ?? 'pending'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm">{c.case_type}</td>
                    <td className="px-4 py-2.5 font-medium text-brand-navy">{c.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-brand-muted">{c.reporter_name ?? '—'}</td>
                    <td className="px-4 py-2.5">{c.assigned_emirate}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] ?? c.status}
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
