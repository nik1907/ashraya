'use client'

import { useState } from 'react'

import { updateCaseStatus } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'
import { CASE_STATUS_LABELS } from '@/lib/types'

const OUTCOME_OPTIONS = [
  'Salary recovered',
  'Person released',
  'Visa renewed / regularized',
  'Legal referral made',
  'Deported / left UAE',
  'Case withdrawn by reporter',
  'No resolution',
  'Other',
]

/** Status control. When the chosen status is Resolved/Closed, it reveals
 *  an outcome dropdown, handled-by name, and an optional note. */
export function CaseStatusForm({
  caseId,
  current,
  options,
  defaultHandledBy,
}: {
  caseId: string
  current: string
  options: readonly string[]
  defaultHandledBy: string
}) {
  const [status, setStatus] = useState(current)
  const needsResolution = status === 'resolved' || status === 'closed'

  return (
    <form action={updateCaseStatus} className="flex flex-col gap-3">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-brand-muted">Status</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-brand-border px-2 py-1 text-sm"
        >
          {!(options as readonly string[]).includes(status) && (
            <option value={status} disabled>{CASE_STATUS_LABELS[status] ?? status}</option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {CASE_STATUS_LABELS[o] ?? o}
            </option>
          ))}
        </select>
        <SubmitButton
          pendingText="Updating…"
          className="rounded bg-brand-navy px-3 py-1 text-sm text-white transition-colors hover:bg-brand-navy-hover"
        >
          Update
        </SubmitButton>
      </div>

      {needsResolution && (
        <div className="flex flex-col gap-3 rounded-lg border border-brand-border bg-brand-card p-3">
          <label className="flex flex-col gap-1 text-sm">
            Outcome
            <select name="outcome" className="rounded border border-brand-border px-2 py-1 text-sm">
              <option value="">Select outcome…</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Handled by
            <input
              name="resolved_by"
              defaultValue={defaultHandledBy}
              placeholder="Your name"
              className="rounded border border-brand-border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Note <span className="text-xs text-brand-muted">(optional)</span>
            <textarea
              name="resolution_note"
              rows={2}
              className="rounded border border-brand-border px-2 py-1"
            />
          </label>
        </div>
      )}
    </form>
  )
}
