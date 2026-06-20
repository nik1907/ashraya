'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useState } from 'react'

import { CaseStatusForm } from '@/components/CaseStatusForm'
import { StatusBadge } from '@/components/CasesList'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'

export type PanelCase = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
  assigned_emirate: string
  reporting_emirate: string | null
  created_at: string
  polished_summary: string | null
  case_brief: string | null
  outcome: string | null
  date_of_incident: string | null
  passport: string | null
  eid: string | null
  phone: string | null
  gender: string | null
  age: number | null
  reporter_name: string | null
  reporter_phone: string | null
  company_name: string | null
  resolved_by: string | null
  resolution_note: string | null
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function firstParagraph(text: string | null, max = 300): string {
  if (!text) return ''
  const para = text.split(/\n+/)[0].trim()
  return para.length > max ? para.slice(0, max) + '…' : para
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-brand-border py-2 text-sm last:border-0">
      <span className="text-brand-muted">{label}</span>
      <span className="text-brand-navy">{value}</span>
    </div>
  )
}

export function CaseSidePanel({
  c,
  onClose,
  userFullName,
  hideStatusForm = false,
}: {
  c: PanelCase
  onClose: () => void
  userFullName: string
  hideStatusForm?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const days = daysAgo(c.created_at)
  const summary = c.polished_summary
  const preview = firstParagraph(summary)
  const hasMore = summary ? summary.length > preview.length || summary.includes('\n') : false

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-brand-border bg-brand-card">
      {/* header */}
      <div className="flex items-start justify-between border-b border-brand-border px-5 py-4">
        <div>
          <p className="font-mono text-xs text-brand-muted">{c.case_id ?? 'Pending ID'}</p>
          <h2 className="mt-0.5 text-sm font-semibold text-brand-navy">{c.name ?? '—'}</h2>
          <p className="mt-0.5 text-xs text-brand-muted">{c.case_type}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 rounded p-1 text-brand-muted hover:bg-brand-navy/5"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* status + age */}
        <div className="flex items-center gap-3 border-b border-brand-border px-5 py-3">
          <StatusBadge status={c.status} />
          <span className={`text-xs ${days >= 14 ? 'font-medium text-red-600' : days >= 7 ? 'text-amber-600' : 'text-brand-muted'}`}>
            {days === 0 ? 'Today' : `${days}d open`}
          </span>
        </div>

        {/* summary */}
        <div className="border-b border-brand-border px-5 py-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">Summary</p>
          {preview ? (
            <>
              <p className="text-sm leading-relaxed text-brand-navy">
                {expanded ? summary : preview}
              </p>
              {hasMore && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1.5 text-xs text-brand-navy-light underline"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-brand-muted">Summary pending…</p>
          )}
        </div>

        {/* key fields */}
        <div className="border-b border-brand-border px-5 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-muted">Details</p>
          <Field label="Date of incident" value={c.date_of_incident} />
          <Field label="Gender / age" value={[c.gender, c.age ? `${c.age} yrs` : null].filter(Boolean).join(', ') || null} />
          <Field label="Passport" value={c.passport} />
          <Field label="Emirates ID" value={c.eid} />
          <Field label="Phone" value={c.phone} />
          <Field label="Employer" value={c.company_name} />
        </div>

        {/* reporter */}
        <div className="border-b border-brand-border px-5 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-muted">Reported by</p>
          <Field label="Name" value={c.reporter_name} />
          <Field label="Phone" value={c.reporter_phone} />
        </div>

        {/* resolution info (if closed/resolved) */}
        {(c.resolved_by || c.resolution_note) && (
          <div className="border-b border-brand-border px-5 py-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-muted">Resolution</p>
            <Field label="Handled by" value={c.resolved_by} />
            <Field label="Note" value={c.resolution_note} />
          </div>
        )}

        {/* status update — hidden when inline dropdown is used instead */}
        {!hideStatusForm && (
          <div className="px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">Update status</p>
            <CaseStatusForm
              caseId={c.id}
              current={c.status}
              options={EMBASSY_STATUS_OPTIONS}
              defaultHandledBy={userFullName}
            />
          </div>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-brand-border px-5 py-3">
        <Link
          href={`/cases/${c.id}`}
          className="text-sm text-brand-navy-light underline"
        >
          View full case & attachments →
        </Link>
      </div>
    </aside>
  )
}
