'use client'

import Link from 'next/link'
import { FileText, Paperclip, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { escalateCase, referCaseToOfficer } from '@/app/admin/actions'
import { CaseStatusForm } from '@/components/CaseStatusForm'
import { StatusBadge } from '@/components/CasesList'
import { SubmitButton } from '@/components/SubmitButton'
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
  updated_at?: string | null
  org_id?: string | null
  organizations?: { name: string } | null
}

export type PanelOfficer = { id: string; full_name: string | null }

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function firstParagraph(text: string | null, max = 300): string {
  if (!text) return ''
  const para = text.split(/\n+/)[0].trim()
  return para.length > max ? para.slice(0, max) + '…' : para
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-brand-border/60 bg-brand-card px-5 py-4 last:border-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-muted/70">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border-b border-brand-border/40 py-2 text-sm last:border-0">
      <span className="text-brand-muted">{label}</span>
      <span className="font-medium text-brand-navy">{value}</span>
    </div>
  )
}

// ─── Attachments (lazy-fetched) ───────────────────────────────────────────────

type Attachment = { id: string; label: string; url: string | null }

function AttachmentsSection({ caseRowId }: { caseRowId: string }) {
  const [items, setItems]   = useState<Attachment[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/attachments/${caseRowId}`)
      .then((r) => r.json())
      .then((data: Attachment[]) => { setItems(data); setLoading(false) })
      .catch(() => { setItems([]); setLoading(false) })
  }, [caseRowId])

  if (loading) return (
    <Section title="Attachments">
      <p className="text-xs text-brand-muted/60">Loading…</p>
    </Section>
  )

  if (!items || items.length === 0) return (
    <Section title="Attachments">
      <p className="text-xs text-brand-muted/60">None uploaded</p>
    </Section>
  )

  return (
    <Section title="Attachments">
      <ul className="space-y-1.5">
        {items.map((a) =>
          a.url ? (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-brand-border px-2.5 py-1.5 text-xs text-brand-navy-light transition-colors hover:bg-brand-navy/5"
              >
                <FileText size={12} />
                {a.label}
              </a>
            </li>
          ) : (
            <li key={a.id} className="text-xs text-brand-muted">{a.label} (unavailable)</li>
          )
        )}
      </ul>
    </Section>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function CaseSidePanel({
  c,
  onClose,
  userFullName,
  hideStatusForm = false,
  officers = [],
}: {
  c: PanelCase
  onClose: () => void
  userFullName: string
  hideStatusForm?: boolean
  officers?: PanelOfficer[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [localStatus, setLocalStatus] = useState(c.status)
  const days = daysAgo(c.created_at)
  const summary = c.polished_summary
  const preview = firstParagraph(summary)
  const hasMore = summary ? summary.length > preview.length || summary.includes('\n') : false
  const targetEmirate = c.assigned_emirate === 'Abu Dhabi' ? 'Dubai' : 'Abu Dhabi'

  return (
    <aside className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-brand-bg md:static md:inset-auto md:z-auto md:w-[400px] md:shrink-0 md:border-l-2 md:border-brand-border">
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b-2 border-brand-border bg-brand-card px-5 py-4">
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

      <div className="flex-1 overflow-y-auto divide-y-2 divide-brand-border/40">
        {/* ── Status + age ── */}
        <div className="flex items-center gap-3 bg-brand-card px-5 py-3">
          <StatusBadge status={localStatus} />
          <span className={`text-xs ${days >= 14 ? 'font-medium text-red-600' : days >= 7 ? 'text-amber-600' : 'text-brand-muted'}`}>
            {days === 0 ? 'Today' : `${days}d open`}
          </span>
          <span className="ml-auto text-xs text-brand-muted">{c.assigned_emirate}</span>
        </div>

        {/* ── Summary ── */}
        <Section title="Summary">
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
        </Section>

        {/* ── Key fields ── */}
        <Section title="Details">
          <Field label="Date of incident" value={c.date_of_incident} />
          <Field label="Gender / age" value={[c.gender, c.age ? `${c.age} yrs` : null].filter(Boolean).join(', ') || null} />
          <Field label="Passport" value={c.passport} />
          <Field label="Emirates ID" value={c.eid} />
          <Field label="Phone" value={c.phone} />
          <Field label="Employer" value={c.company_name} />
        </Section>

        {/* ── Reporter ── */}
        <Section title="Reported by">
          <Field label="Name" value={c.reporter_name} />
          <Field label="Phone" value={c.reporter_phone} />
        </Section>

        {/* ── Attachments ── */}
        <AttachmentsSection caseRowId={c.id} />

        {/* ── Resolution info ── */}
        {(c.resolved_by || c.resolution_note) && (
          <Section title="Resolution">
            <Field label="Handled by" value={c.resolved_by} />
            <Field label="Note" value={c.resolution_note} />
          </Section>
        )}

        {/* ── Emirate reassignment ── */}
        <Section title="Emirate">
          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-navy">{c.assigned_emirate}</span>
            <form action={escalateCase} className="inline-flex">
              <input type="hidden" name="case_id" value={c.id} />
              <input type="hidden" name="target_emirate" value={targetEmirate} />
              <SubmitButton
                pendingText="Transferring…"
                className="rounded border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 transition-colors hover:bg-orange-100"
              >
                Transfer to {targetEmirate}
              </SubmitButton>
            </form>
          </div>
        </Section>

        {/* ── Officer assignment ── */}
        {officers.length > 0 && (
          <Section title="Assign officer">
            <form action={referCaseToOfficer} className="flex items-center gap-2">
              <input type="hidden" name="case_id" value={c.id} />
              <select
                name="officer_id"
                className="flex-1 rounded border border-brand-border bg-white px-2 py-1.5 text-xs text-brand-navy"
                defaultValue=""
              >
                <option value="" disabled>Select officer…</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>{o.full_name ?? 'Unknown'}</option>
                ))}
              </select>
              <SubmitButton
                pendingText="Assigning…"
                className="shrink-0 rounded border border-brand-border px-2.5 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:text-brand-navy"
              >
                Assign
              </SubmitButton>
            </form>
          </Section>
        )}

        {/* ── Status update ── */}
        {!hideStatusForm && (
          <Section title="Update status">
            <CaseStatusForm
              caseId={c.id}
              current={localStatus}
              options={EMBASSY_STATUS_OPTIONS}
              defaultHandledBy={userFullName}
              onSuccess={(ns) => setLocalStatus(ns)}
            />
          </Section>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t-2 border-brand-border bg-brand-card px-5 py-3">
        <Link
          href={`/cases/${c.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-navy-light underline"
        >
          <Paperclip size={13} />
          View full case →
        </Link>
      </div>
    </aside>
  )
}
