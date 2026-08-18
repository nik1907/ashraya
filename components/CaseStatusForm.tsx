'use client'

import { startTransition, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateCaseStatus } from '@/app/admin/actions'
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

export function CaseStatusForm({
  caseId,
  current,
  options,
  defaultHandledBy,
  onSuccess,
}: {
  caseId: string
  current: string
  options: readonly string[]
  defaultHandledBy: string
  onSuccess?: (newStatus: string) => void
}) {
  const [status, setStatus]           = useState(current)
  const [showModal, setShowModal]     = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [showAckModal, setShowAckModal] = useState(false)
  const [ackName, setAckName]           = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const formRef                       = useRef<HTMLFormElement>(null)
  const router                        = useRouter()

  const needsResolution = status === 'resolved' || status === 'closed'
  const needsMoreInfo   = status === 'need_more_info'
  const needsAck        = status === 'acknowledged'

  function doSubmit(fd: FormData) {
    setSubmitting(true)
    setUpdateError(null)
    // Optimistic: flip the badge immediately without waiting for the server.
    if (onSuccess) onSuccess(status)
    startTransition(async () => {
      try {
        await updateCaseStatus(fd)
      } catch (e) {
        // Revert the optimistic update first.
        if (onSuccess) onSuccess(current)
        setStatus(current)
        // NEXT_REDIRECT means Next.js is redirecting (session expired → /login, role changed →
        // dashboard). Re-throw so the framework handles navigation instead of surfacing the raw
        // internal string to the user.
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
        setUpdateError(e instanceof Error ? e.message : 'Update failed. Please try again.')
      }
      setSubmitting(false)
      // Only refresh when there's no parent managing local state.
      if (!onSuccess) router.refresh()
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (needsMoreInfo) {
      setInfoMessage('')
      setShowModal(true)
      return
    }
    if (needsAck) {
      setAckName(defaultHandledBy)
      setShowAckModal(true)
      return
    }
    doSubmit(new FormData(formRef.current!))
  }

  function handleModalConfirm() {
    const msg = infoMessage.trim()
    if (!msg) return
    setShowModal(false)
    const fd = new FormData(formRef.current!)
    fd.set('info_request_message', msg)
    doSubmit(fd)
  }

  function handleAckConfirm() {
    setShowAckModal(false)
    const fd = new FormData(formRef.current!)
    if (ackName.trim()) fd.set('resolved_by', ackName.trim())
    doSubmit(fd)
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="case_id" value={caseId} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-brand-muted">Status</label>
          <select
            name="status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setUpdateError(null) }}
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
          {updateError && (
            <p className="text-xs font-medium text-red-600">{updateError}</p>
          )}
          {needsMoreInfo ? (
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Request info'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-navy px-3 py-1 text-sm text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
            >
              {submitting ? 'Updating…' : 'Update'}
            </button>
          )}
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

      {/* ── Acknowledge — who is handling modal ─────────────────────────────── */}
      {showAckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-blue-100 p-1.5">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Who is handling this case?</h2>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Enter the name of the embassy official taking responsibility for this case. This will be recorded in the case timeline.
            </p>
            <input
              autoFocus
              type="text"
              value={ackName}
              onChange={(e) => setAckName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ackName.trim() && handleAckConfirm()}
              placeholder="Full name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAckModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAckConfirm}
                disabled={!ackName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Information Requested modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 p-1.5">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h2 className="text-base font-bold text-gray-900">Information Requested</h2>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Specify exactly what information you need from the reporter. This will be emailed to them immediately with a link to respond.
            </p>
            <textarea
              autoFocus
              rows={4}
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="e.g. Please provide the exact dates of unpaid salary and the name of the HR manager you contacted…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                disabled={!infoMessage.trim()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
