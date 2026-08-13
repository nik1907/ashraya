import { redirect } from 'next/navigation'

import { verifyActionToken } from '@/lib/email/action-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitRequestInfo } from '../actions'

export const dynamic = 'force-dynamic'

export default async function RequestInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  if (!token) redirect('/case-action/success?action=error&reason=missing-token')

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'request-info') {
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
            Request Additional Information
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
          <form action={submitRequestInfo} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />

            {error === 'empty' && (
              <p className="text-sm text-red-600">Please enter a message before submitting.</p>
            )}

            <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-fg">
              What information do you need from the reporter?
              <textarea
                name="message"
                rows={5}
                required
                placeholder="e.g. Please provide the exact dates of unpaid salary, the company trade licence number, and the HR contact details…"
                className="rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-fg placeholder:text-brand-muted focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-amber-700 px-5 py-3 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
            >
              Send Information Request
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-brand-muted">
          Powered by Ashraya · TFA Community Welfare Platform
        </p>
      </div>
    </main>
  )
}
