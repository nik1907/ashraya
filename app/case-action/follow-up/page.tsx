import { redirect } from 'next/navigation'

import { EXPIRY_SECONDS, verifyActionToken } from '@/lib/email/action-token'
import { followUpDelayDays } from '@/lib/cases/follow-up-delays'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitReporterFollowUp } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ReporterFollowUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/case-action/success?action=error&reason=missing-token')

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'reporter-follow-up') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_id, case_type, name, status, reporter_name')
    .eq('id', payload.caseRowId)
    .single()

  if (!c) redirect('/case-action/success?action=error&reason=case-not-found')

  const isTerminal = c?.status === 'resolved' || c?.status === 'closed'

  // Derive issuedAt from the expiry embedded in the token.
  // Token format: base64url(payload)|base64url(sig)
  // payload = "{caseRowId}|{action}|{expiry}"
  const dot = token.lastIndexOf('.')
  const payloadStr = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')
  const expiry = parseInt(payloadStr.split('|')[2] ?? '0', 10)
  const issuedAt = expiry - EXPIRY_SECONDS

  const delayDays = followUpDelayDays(c?.case_type ?? '')
  const availableAt = issuedAt + delayDays * 86400
  const nowSec = Math.floor(Date.now() / 1000)
  const tooEarly = nowSec < availableAt

  const availableDate = new Date(availableAt * 1000).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 border-b border-brand-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Ashraya · TFA Community Welfare
          </p>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Case Follow-Up
          </h1>
        </div>

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
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-sm text-green-800">
            <p className="font-semibold">Case already resolved</p>
            <p className="mt-1">This case has been marked as <strong>{c?.status}</strong>. No further follow-up is needed.</p>
          </div>
        ) : tooEarly ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800">Follow-up not yet available</p>
            <p className="mt-2 text-sm text-amber-700">
              The standard review period for a <strong>{c?.case_type}</strong> case is{' '}
              <strong>{delayDays} {delayDays === 1 ? 'day' : 'days'}</strong>.
              This follow-up button will activate on:
            </p>
            <p className="mt-2 text-base font-bold text-amber-900">{availableDate}</p>
            <p className="mt-3 text-xs text-amber-600">
              Please check back after that date. If this is an emergency, contact the TFA admin team directly at{' '}
              <a href="mailto:tfa.abudhabi@gmail.com" className="underline">tfa.abudhabi@gmail.com</a>.
            </p>
          </div>
        ) : (
          <form action={submitReporterFollowUp} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="rounded-lg border border-brand-border bg-brand-card p-4 text-sm text-brand-fg">
              <p>
                Clicking the button below will notify the TFA welfare team that you are requesting
                a status update on this case. They will review it and get back to you.
              </p>
              {c?.reporter_name && (
                <p className="mt-2 text-xs text-brand-muted">Reporter: {c.reporter_name}</p>
              )}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-navy-hover focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2"
            >
              Request Status Update
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
