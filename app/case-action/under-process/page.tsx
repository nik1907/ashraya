import { redirect } from 'next/navigation'

import { verifyActionToken } from '@/lib/email/action-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmUnderProcess } from '../actions'

export const dynamic = 'force-dynamic'

export default async function UnderProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/case-action/success?action=error&reason=missing-token')

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'under-process') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_id, case_type, name, status')
    .eq('id', payload.caseRowId)
    .single()

  const isTerminal = c?.status === 'resolved' || c?.status === 'closed'
  const alreadyInProgress = c?.status === 'in_progress'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 border-b border-brand-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Embassy of India · UAE
          </p>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Mark Case as Under Process
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
        ) : alreadyInProgress ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
            This case is already marked as under process with the embassy.
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-brand-fg leading-relaxed">
              Clicking confirm will update this case status to{' '}
              <strong>Under Process</strong> and notify the welfare team that
              the embassy is handling it.
            </p>

            <form action={confirmUnderProcess}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-navy-hover focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2"
              >
                Confirm — Mark as Under Process
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
