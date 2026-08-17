import { redirect } from 'next/navigation'

import { verifyActionToken } from '@/lib/email/action-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmResolved } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ResolvedPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  if (!token) redirect('/case-action/success?action=error&reason=missing-token')

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'resolved') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_id, case_type, name, status')
    .eq('id', payload.caseRowId)
    .single()

  const isTerminal = c?.status === 'resolved' || c?.status === 'closed'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 border-b border-brand-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Embassy of India · UAE
          </p>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Mark Case as Resolved
          </h1>
        </div>

        {/* Case reference */}
        {c && (
          <div className="mb-6 rounded-lg border border-brand-border bg-brand-card p-4">
            <p className="text-xs text-brand-muted">Case reference</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-brand-navy">
              {c.case_id ?? 'Pending ID'}
            </p>
            <p className="mt-1 text-sm text-brand-fg">
              {c.case_type}{c.name ? ` — ${c.name}` : ''}
            </p>
          </div>
        )}

        {isTerminal ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            This case has already been {c?.status}. No further action is needed.
          </div>
        ) : (
          <>
            {error === 'empty-resolution' && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Please describe the resolution before confirming.
              </div>
            )}

            <p className="mb-5 text-sm text-brand-fg leading-relaxed">
              Please provide details of how this case was resolved. The welfare team and
              the volunteer who reported it will be notified.
            </p>

            <form action={confirmResolved} className="space-y-4">
              <input type="hidden" name="token" value={token} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Resolution details <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="resolution_note"
                  required
                  rows={4}
                  placeholder="e.g. Salary arrears paid in full by employer on 14 Aug 2026 following embassy intervention. Individual has returned to India."
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder-brand-muted/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Resolved by
                </label>
                <input
                  name="resolved_by"
                  type="text"
                  placeholder="e.g. First Secretary (Labour) — Embassy of India, Abu Dhabi"
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder-brand-muted/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-green-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
              >
                Confirm — Mark as Resolved
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-xs text-brand-muted">
          Powered by Ashraya · TFA Community Welfare Platform
        </p>
      </div>
    </main>
  )
}
