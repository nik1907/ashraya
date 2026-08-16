'use client'

import { useState } from 'react'

import { approveCase, returnCase } from '@/app/admin/actions'

export type PrescreeningResult = {
  completeness: { pass: boolean; issues: string[] }
  consistency:  { pass: boolean; issues: string[] }
  documents:    { pass: boolean; issues: string[] }
  redFlags:     { pass: boolean; issues: string[] }
  summary:      string
  confidence:   'high' | 'medium' | 'low'
}

export type QueueCase = {
  id: string
  case_id: string | null
  case_type: string
  name: string | null
  reporter_name: string | null
  created_at: string
  prescreening_result: PrescreeningResult | null
}

function AiNotes({ result }: { result: PrescreeningResult }) {
  const checks = [
    { key: 'completeness', label: 'Completeness', data: result.completeness },
    { key: 'consistency',  label: 'Consistency',  data: result.consistency  },
    { key: 'documents',    label: 'Documents',    data: result.documents    },
    { key: 'redFlags',     label: 'Red flags',    data: result.redFlags     },
  ] as const

  return (
    <div className="mt-3 rounded-md border border-brand-border bg-brand-surface p-3 font-mono text-xs leading-relaxed text-brand-fg">
      {checks.map(({ key, label, data }) => (
        <div key={key}>
          <span className={data.pass ? 'text-green-700' : 'text-amber-700'}>
            {data.pass ? '✓' : '⚠'} {label}
          </span>
          {data.issues.length > 0 && (
            <span className="text-brand-muted"> — {data.issues.join('; ')}</span>
          )}
        </div>
      ))}
      <p className="mt-2 font-sans not-italic text-brand-muted">{result.summary}</p>
    </div>
  )
}

function QueueRow({ c }: { c: QueueCase }) {
  const [showReturn, setShowReturn] = useState(false)

  const flagCount = c.prescreening_result
    ? [
        c.prescreening_result.completeness,
        c.prescreening_result.consistency,
        c.prescreening_result.documents,
        c.prescreening_result.redFlags,
      ].filter((x) => !x.pass).length
    : 0

  const ago = (() => {
    const mins = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  })()

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-brand-muted">{c.case_id ?? 'ID pending'}</p>
          <p className="mt-0.5 font-semibold text-brand-navy">
            {c.case_type}{c.name ? ` — ${c.name}` : ''}
          </p>
          <p className="text-xs text-brand-muted">
            Submitted by {c.reporter_name ?? 'volunteer'} · {ago}
          </p>
        </div>
        {c.prescreening_result ? (
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
            flagCount === 0
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {flagCount === 0 ? 'All checks passed' : `${flagCount} item${flagCount > 1 ? 's' : ''} flagged`}
          </span>
        ) : (
          <span className="text-xs italic text-brand-muted">AI review pending…</span>
        )}
      </div>

      {c.prescreening_result && <AiNotes result={c.prescreening_result} />}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={approveCase}>
          <input type="hidden" name="case_id" value={c.id} />
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-navy-hover"
          >
            Approve &amp; Send to Embassy
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReturn((v) => !v)}
          className="rounded-lg border border-amber-600 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
        >
          Return to Volunteer
        </button>

        <a
          href={`/cases/${c.id}`}
          className="rounded-lg border border-brand-border px-4 py-2 text-xs text-brand-muted transition-colors hover:text-brand-navy"
        >
          View full case →
        </a>
      </div>

      {showReturn && (
        <form action={returnCase} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="case_id" value={c.id} />
          <textarea
            name="note"
            required
            rows={3}
            placeholder="Tell the volunteer exactly what needs to be added or corrected before this case can be forwarded…"
            className="rounded border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Send back to volunteer
            </button>
            <button
              type="button"
              onClick={() => setShowReturn(false)}
              className="text-xs text-brand-muted underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export function ReviewQueue({ cases }: { cases: QueueCase[] }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-card p-8 text-center text-sm text-brand-muted">
        No cases awaiting review.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <QueueRow key={c.id} c={c} />
      ))}
    </div>
  )
}
