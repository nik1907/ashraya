import { fmtDate } from '@/lib/dates'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  submitted:      { label: 'Received',          color: 'blue',   description: 'Your case has been received and is awaiting embassy review.' },
  sent:           { label: 'With Embassy',       color: 'blue',   description: 'Your case has been forwarded to the Embassy welfare team.' },
  acknowledged:   { label: 'Acknowledged',       color: 'amber',  description: 'An embassy officer has reviewed your case and will be in touch.' },
  need_more_info: { label: 'Information Needed', color: 'amber',  description: 'The embassy needs more information. Please check your email or phone.' },
  in_progress:    { label: 'Under Process',      color: 'blue',   description: 'Your case is actively being handled by an embassy officer.' },
  resolved:       { label: 'Resolved',           color: 'green',  description: 'Your case has been resolved. Contact the embassy if you need further assistance.' },
  closed:         { label: 'Closed',             color: 'gray',   description: 'This case has been closed.' },
}

const COLOR_CLASSES: Record<string, string> = {
  blue:  'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-green-100 text-green-800',
  gray:  'bg-gray-100 text-gray-600',
}

export default async function CaseStatusPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const admin = createAdminClient()

  const { data: c } = await admin
    .from('cases')
    .select('case_id, case_type, status, name, created_at, assigned_emirate')
    .eq('case_id', caseId.toUpperCase())
    .single()

  const statusInfo = c ? (STATUS_LABELS[c.status] ?? { label: c.status, color: 'gray', description: '' }) : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
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
            Case Status
          </h1>
        </div>

        {!c ? (
          <div className="rounded-xl border border-brand-border bg-brand-card p-6 text-center">
            <p className="text-sm font-medium text-brand-navy">Case not found</p>
            <p className="mt-1 text-xs text-brand-muted">
              Please check the reference number and try again.
            </p>
            <p className="mt-3 font-mono text-xs text-brand-muted">{caseId.toUpperCase()}</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Case reference card */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                Case Reference
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-brand-navy">
                {c.case_id}
              </p>
              <p className="mt-0.5 text-sm text-brand-muted">{c.case_type}</p>
            </div>

            {/* Status card */}
            <div className="rounded-xl border border-brand-border bg-brand-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted mb-2">
                Current Status
              </p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${COLOR_CLASSES[statusInfo!.color]}`}>
                {statusInfo!.label}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-brand-fg">
                {statusInfo!.description}
              </p>
            </div>

            {/* Basic details */}
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
                <span className="font-medium text-brand-navy">
                  {fmtDate(c.created_at)}
                </span>
              </div>
            </div>

            {/* Footer note */}
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
