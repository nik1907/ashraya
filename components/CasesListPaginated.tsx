'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CASE_STATUS_LABELS } from '@/lib/types'
import { StatusBadge, type CaseRow } from './CasesList'

const PAGE_SIZE = 25

export function CasesListPaginated({ cases }: { cases: CaseRow[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE))
  const paged = cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (cases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-6 text-sm text-brand-muted">
        No cases yet.
      </p>
    )
  }

  return (
    <div>
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
            {paged.map((c) => (
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
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-xs text-brand-muted">
            Page {page} of {totalPages} · {cases.length} case{cases.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="px-1 text-brand-muted">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`rounded border px-2.5 py-1 text-xs transition-all ${
                      page === p
                        ? 'border-brand-navy bg-brand-navy font-medium text-white'
                        : 'border-brand-border text-brand-muted hover:text-brand-navy'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
