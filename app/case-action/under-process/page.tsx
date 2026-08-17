import { redirect } from 'next/navigation'

import { verifyActionToken } from '@/lib/email/action-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLE_LABELS, type Role } from '@/lib/types'
import { confirmUnderProcess } from '../actions'

export const dynamic = 'force-dynamic'

const EMBASSY_ROLES: Role[] = ['ifs_officer', 'embassy_abu_dhabi', 'embassy_dubai']

type OfficerProfile = {
  id: string
  full_name: string | null
  designation: string | null
  role: Role
}

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

  const [{ data: c }, { data: officersRaw }] = await Promise.all([
    admin
      .from('cases')
      .select('case_id, case_type, name, status')
      .eq('id', payload.caseRowId)
      .single(),
    admin
      .from('profiles')
      .select('id, full_name, designation, role')
      .in('role', EMBASSY_ROLES)
      .eq('status', 'active')
      .order('full_name'),
  ])

  const officers = (officersRaw ?? []) as OfficerProfile[]

  // Group officers by office for display
  const grouped: Record<string, OfficerProfile[]> = {}
  for (const o of officers) {
    const label = ROLE_LABELS[o.role] ?? o.role
    ;(grouped[label] ??= []).push(o)
  }

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
            <p className="mb-5 text-sm text-brand-fg leading-relaxed">
              Clicking confirm will update this case to{' '}
              <strong>Under Process</strong> and notify the welfare team.
              Optionally assign it to a specific officer below.
            </p>

            <form action={confirmUnderProcess} className="space-y-5">
              <input type="hidden" name="token" value={token} />

              {/* Officer picker */}
              {officers.length > 0 && (
                <fieldset className="rounded-lg border border-brand-border bg-brand-card p-4">
                  <legend className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-brand-muted">
                    Assign to officer (optional)
                  </legend>

                  {/* Unassigned option */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-brand-surface">
                    <input
                      type="radio"
                      name="assigned_officer"
                      value=""
                      defaultChecked
                      className="h-4 w-4 accent-brand-navy"
                    />
                    <span className="text-sm text-brand-muted">No specific officer</span>
                  </label>

                  {/* Group by office */}
                  {Object.entries(grouped).map(([groupLabel, members]) => (
                    <div key={groupLabel} className="mt-3">
                      <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-brand-muted/70">
                        {groupLabel}
                      </p>
                      {members.map((o) => (
                        <label
                          key={o.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-brand-surface"
                        >
                          <input
                            type="radio"
                            name="assigned_officer"
                            value={o.id}
                            className="h-4 w-4 accent-brand-navy"
                          />
                          <span className="text-sm text-brand-navy">
                            {o.full_name ?? 'Unnamed officer'}
                            {o.designation && (
                              <span className="ml-1.5 text-xs text-brand-muted">
                                · {o.designation}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </fieldset>
              )}

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
