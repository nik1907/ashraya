'use client'

import { useActionState } from 'react'
import { lookupCaseStatus } from './actions'

export default function StatusLookupPage() {
  const [state, action, pending] = useActionState(lookupCaseStatus, null)

  const c = state?.case

  const COLOR_CLASSES: Record<string, string> = {
    blue:  'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
    gray:  'bg-gray-100 text-gray-600',
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-md">

        {/* Tricolour bar */}
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1 flex-1 bg-brand-saffron" />
          <div className="h-1 flex-1 bg-white border border-gray-200" />
          <div className="h-1 flex-1 bg-green-600" />
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">
            Embassy of India · UAE
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-brand-navy">
            Case Status Check
          </h1>
          <p className="mt-1 text-xs text-brand-muted">
            Enter your Case ID and passport number to view your case status.
          </p>
        </div>

        {/* Lookup form — always visible so they can search again */}
        <form action={action} className="rounded-xl border border-brand-border bg-brand-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-navy mb-1">
              Case ID <span className="text-red-500">*</span>
            </label>
            <input
              name="case_id"
              type="text"
              required
              placeholder="e.g. TFA-110926-PC-001"
              defaultValue={state?.inputs?.case_id ?? ''}
              className="w-full rounded border border-brand-border px-3 py-2 text-sm font-mono uppercase placeholder:normal-case placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-navy mb-1">
              Passport Number <span className="text-red-500">*</span>
            </label>
            <input
              name="passport"
              type="text"
              required
              placeholder="e.g. A1234567"
              defaultValue={state?.inputs?.passport ?? ''}
              className="w-full rounded border border-brand-border px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
            />
            <p className="mt-1 text-[10px] text-brand-muted">
              Must match the passport number provided when the case was registered.
            </p>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
          >
            {pending ? 'Checking…' : 'Check Status'}
          </button>
        </form>

        {/* Result card — shown only after a successful lookup */}
        {c && (
          <div className="mt-4 space-y-3">

            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                Case Reference
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-brand-navy">{c.case_id}</p>
              <p className="mt-0.5 text-sm text-brand-muted">{c.case_type}</p>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted mb-2">
                Current Status
              </p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${COLOR_CLASSES[c.statusColor]}`}>
                {c.statusLabel}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-brand-fg">
                {c.statusDescription}
              </p>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-card p-5 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                Details
              </p>
              {c.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Name</span>
                  <span className="font-medium text-brand-navy">{c.name}</span>
                </div>
              )}
              {c.assigned_emirate && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Mission</span>
                  <span className="font-medium text-brand-navy">{c.assigned_emirate}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Registered on</span>
                <span className="font-medium text-brand-navy">{c.created_at}</span>
              </div>
            </div>

            <p className="text-center text-[11px] text-brand-muted leading-relaxed">
              For urgent assistance, contact the Embassy of India directly.
              Please quote your case reference number in all communications.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] text-brand-muted">
          Ashraya · Embassy of India UAE · Welfare Platform
        </p>
      </div>
    </main>
  )
}
