'use client'

import { useState, useTransition } from 'react'

import { fmtShortDate, fmtTime } from '@/lib/dates'

export type EmailIntake = {
  id: string
  message_id: string
  received_at: string
  from_email: string
  from_name: string | null
  subject: string | null
  body_text: string | null
  ai_confidence: number | null
  ai_extracted: {
    name?: string | null
    phone?: string | null
    emirate?: string | null
    issue_type?: string | null
    urgency?: string | null
    summary?: string | null
  }
  status: string
  case_id: string | null
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-brand-muted text-xs">—</span>
  const pct = Math.round(value * 100)
  const cls = value >= 0.85
    ? 'bg-green-100 text-green-700'
    : value >= 0.5
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {pct}%
    </span>
  )
}

function UrgencyBadge({ value }: { value?: string | null }) {
  if (!value) return null
  const map: Record<string, string> = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  )
}

function IntakeRow({ intake, onAction }: {
  intake: EmailIntake
  onAction: (id: string, action: 'approve' | 'reject', overrides?: Record<string, string>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName,   setEditName]   = useState(intake.ai_extracted.name ?? '')
  const [editPhone,  setEditPhone]  = useState(intake.ai_extracted.phone ?? '')
  const [editEmirate, setEditEmirate] = useState(intake.ai_extracted.emirate ?? 'Abu Dhabi')
  const [editType,   setEditType]   = useState(intake.ai_extracted.issue_type ?? 'Other')

  const receivedLabel = `${fmtShortDate(intake.received_at)}, ${fmtTime(intake.received_at)}`

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-sm text-brand-navy truncate max-w-xs">
              {intake.subject || '(no subject)'}
            </span>
            <ConfidenceBadge value={intake.ai_confidence} />
            <UrgencyBadge value={intake.ai_extracted.urgency} />
          </div>
          <p className="text-xs text-brand-muted">
            {intake.from_name ? `${intake.from_name} · ` : ''}{intake.from_email}
            <span className="mx-1">·</span>{receivedLabel} GST
          </p>
          {intake.ai_extracted.summary && (
            <p className="mt-1.5 text-xs text-brand-fg leading-relaxed line-clamp-2">
              {intake.ai_extracted.summary}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-muted">
            {intake.ai_extracted.name && (
              <span><span className="font-medium">Name:</span> {intake.ai_extracted.name}</span>
            )}
            {intake.ai_extracted.phone && (
              <span><span className="font-medium">Phone:</span> {intake.ai_extracted.phone}</span>
            )}
            {intake.ai_extracted.emirate && (
              <span><span className="font-medium">Mission:</span> {intake.ai_extracted.emirate}</span>
            )}
            {intake.ai_extracted.issue_type && (
              <span><span className="font-medium">Type:</span> {intake.ai_extracted.issue_type}</span>
            )}
          </div>
        </div>

        {intake.status === 'pending' && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { setEditing(true); setExpanded(true) }}
              className="rounded bg-brand-navy px-3 py-1 text-xs font-semibold text-white hover:bg-brand-navy-hover transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onAction(intake.id, 'reject')}
              className="rounded border border-brand-border px-3 py-1 text-xs font-medium text-brand-muted hover:text-brand-navy transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {intake.status !== 'pending' && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            intake.status === 'approved' || intake.status === 'auto_created'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {intake.status === 'auto_created' ? 'Auto-created' : intake.status}
          </span>
        )}

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 text-brand-muted hover:text-brand-navy text-xs px-2"
          aria-label="Toggle email body"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-brand-border bg-brand-surface px-4 py-3 space-y-3">
          {/* Raw body */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1">Email body</p>
            <pre className="text-xs text-brand-fg whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-white rounded border border-brand-border p-2">
              {intake.body_text?.slice(0, 1500) ?? '(empty)'}
            </pre>
          </div>

          {/* Edit fields for approval */}
          {editing && intake.status === 'pending' && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Confirm case details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-brand-muted mb-0.5">Name</label>
                  <input
                    className="w-full rounded border border-brand-border px-2 py-1 text-xs"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Affected person's name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-muted mb-0.5">Phone</label>
                  <input
                    className="w-full rounded border border-brand-border px-2 py-1 text-xs"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+971..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-muted mb-0.5">Mission</label>
                  <select
                    className="w-full rounded border border-brand-border px-2 py-1 text-xs"
                    value={editEmirate}
                    onChange={e => setEditEmirate(e.target.value)}
                  >
                    <option>Abu Dhabi</option>
                    <option>Dubai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-brand-muted mb-0.5">Case type</label>
                  <select
                    className="w-full rounded border border-brand-border px-2 py-1 text-xs"
                    value={editType}
                    onChange={e => setEditType(e.target.value)}
                  >
                    <option>Labour Dispute</option>
                    <option>Repatriation</option>
                    <option>Medical Emergency</option>
                    <option>Missing Person</option>
                    <option>Domestic Abuse</option>
                    <option>Passport/Document Issues</option>
                    <option>Imprisonment/Legal</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onAction(intake.id, 'approve', {
                    name:       editName,
                    phone:      editPhone,
                    emirate:    editEmirate,
                    issue_type: editType,
                  })}
                  className="rounded bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy-hover transition-colors"
                >
                  Confirm &amp; Create Case
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setExpanded(false) }}
                  className="rounded border border-brand-border px-3 py-1.5 text-xs text-brand-muted hover:text-brand-navy transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EmailIntakeQueue({
  initialIntakes,
}: {
  initialIntakes: EmailIntake[]
}) {
  const [intakes, setIntakes] = useState(initialIntakes)
  const [isPending, startTransition] = useTransition()
  const [pollingState, setPollingState] = useState<'idle' | 'polling' | 'done' | 'error'>('idle')
  const [pollResult, setPollResult] = useState<string | null>(null)

  async function handleAction(
    id: string,
    action: 'approve' | 'reject',
    overrides?: Record<string, string>,
  ) {
    const res = await fetch('/api/email-intake/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intakeId: id, action, overrides }),
    })

    if (res.ok) {
      const data = await res.json()
      startTransition(() => {
        setIntakes(prev => prev.map(i =>
          i.id === id
            ? { ...i, status: action === 'approve' ? 'approved' : 'rejected', case_id: data.caseRowId ?? null }
            : i,
        ))
      })
    }
  }

  async function handlePoll() {
    setPollingState('polling')
    setPollResult(null)
    try {
      const res = await fetch('/api/email-intake/poll', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPollingState('done')
        setPollResult(`Processed ${data.processed} email(s)`)
        // Refresh the page to show new intakes.
        window.location.reload()
      } else {
        setPollingState('error')
        setPollResult('Poll failed — check server logs')
      }
    } catch {
      setPollingState('error')
      setPollResult('Network error during poll')
    }
  }

  const pending     = intakes.filter(i => i.status === 'pending')
  const processed   = intakes.filter(i => i.status !== 'pending')

  return (
    <div className="space-y-6">

      {/* Header + poll trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-navy">Email Intake Queue</h2>
          <p className="text-xs text-brand-muted mt-0.5">
            Emails forwarded to the welfare inbox — review and convert to cases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pollResult && (
            <span className={`text-xs ${pollingState === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {pollResult}
            </span>
          )}
          <button
            type="button"
            onClick={handlePoll}
            disabled={pollingState === 'polling' || isPending}
            className="rounded border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-muted hover:text-brand-navy transition-colors disabled:opacity-50"
          >
            {pollingState === 'polling' ? 'Polling…' : '↻ Check inbox'}
          </button>
        </div>
      </div>

      {/* Pending */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Pending review{pending.length > 0 && ` (${pending.length})`}
        </h3>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-border py-8 text-center">
            <p className="text-sm text-brand-muted">No pending emails</p>
            <p className="mt-1 text-xs text-brand-muted">Use "Check inbox" to fetch new emails</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(i => (
              <IntakeRow key={i.id} intake={i} onAction={handleAction} />
            ))}
          </div>
        )}
      </section>

      {/* Processed */}
      {processed.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Recently processed ({processed.length})
          </h3>
          <div className="space-y-2">
            {processed.slice(0, 10).map(i => (
              <IntakeRow key={i.id} intake={i} onAction={handleAction} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
