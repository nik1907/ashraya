export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, { title: string; body: string; color: string }> = {
  'request-info': {
    title: 'Information Request Sent',
    body:  'The welfare team has been notified. The reporter will be contacted for the additional information you requested, and the case has been updated to "Information Requested".',
    color: 'amber',
  },
  'under-process': {
    title: 'Case Marked as Under Process',
    body:  'The case status has been updated to "Under Process with Embassy". The welfare team has been notified that your mission is handling this case.',
    color: 'navy',
  },
  'resolved': {
    title: 'Case Marked as Resolved',
    body:  'The resolution has been recorded and the welfare team has been notified. The volunteer who submitted this case will also receive a closure notification.',
    color: 'green',
  },
  'reporter-follow-up': {
    title: 'Follow-Up Request Sent',
    body:  'The TFA welfare team has been notified that you are requesting a status update. They will review the case and get back to you as soon as possible.',
    color: 'navy',
  },
  'error': {
    title: 'Link Not Valid',
    body:  'This link has expired or is invalid. Action links are valid for 90 days from case submission. Please contact the TFA welfare team if you need assistance.',
    color: 'red',
  },
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; reason?: string }>
}) {
  const { action = 'error', reason } = await searchParams
  const msg = MESSAGES[action] ?? MESSAGES['error']

  const isError = action === 'error'
  const reasonMap: Record<string, string> = {
    'invalid-token':  'The link signature is invalid or has expired.',
    'missing-token':  'No action token was provided.',
    'case-not-found': 'The case could not be found.',
    'case-closed':    'This case has already been closed or resolved.',
    'too-early':      'The follow-up period for this case type has not yet passed.',
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 border-b border-brand-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Embassy of India · UAE
          </p>
        </div>

        <div
          className={`rounded-xl border p-6 ${
            isError
              ? 'border-red-200 bg-red-50'
              : msg.color === 'amber'
              ? 'border-amber-200 bg-amber-50'
              : 'border-blue-100 bg-blue-50'
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            {isError ? (
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <h1 className={`text-base font-bold ${isError ? 'text-red-800' : 'text-brand-navy'}`}>
              {msg.title}
            </h1>
          </div>
          <p className={`text-sm leading-relaxed ${isError ? 'text-red-700' : 'text-brand-fg'}`}>
            {msg.body}
          </p>
          {isError && reason && reasonMap[reason] && (
            <p className="mt-2 text-xs text-red-500">{reasonMap[reason]}</p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-brand-muted">
          Powered by Ashraya · TFA Community Welfare Platform
        </p>
      </div>
    </main>
  )
}
