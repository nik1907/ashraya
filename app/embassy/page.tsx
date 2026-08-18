import { AppHeader } from '@/components/AppHeader'
import { EmbassyTabs } from '@/components/EmbassyTabs'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function EmbassyHome() {
  const profile = await requireProfile(['embassy_abu_dhabi', 'embassy_dubai', 'ifs_officer'])

  const isOfficer   = profile.role === 'ifs_officer'
  const assignedOnly = isOfficer && profile.cases_scope === 'assigned'

  const emirateName =
    profile.role === 'embassy_abu_dhabi'
      ? 'Indian Embassy — Abu Dhabi'
      : profile.role === 'embassy_dubai'
      ? 'Indian Consulate General — Dubai'
      : assignedOnly
      ? 'My Assigned Cases'
      : 'All Cases'

  // Officers with "assigned only" scope use the admin client + manual filter.
  // Embassy roles use the regular client — RLS auto-restricts by emirate.
  const db = assignedOnly ? createAdminClient() : await createClient()

  let casesQuery = db
    .from('cases')
    .select(
      'id, case_id, case_type, status, name, assigned_emirate, reporting_emirate, created_at,' +
        'polished_summary, case_brief, outcome, date_of_incident, passport, eid, phone, gender, age,' +
        'reporter_name, reporter_phone, company_name, resolved_by, resolution_note,' +
        'org_id, organizations(name)',
    )
    .order('created_at', { ascending: false })

  if (assignedOnly) {
    casesQuery = casesQuery.eq('assigned_officer', profile.id)
  }

  const { data: cases } = await casesQuery

  // Fetch latest info_provided event per case so the Action Center can show
  // a "Reporter replied" lane for in_progress cases that came back via reporter reply.
  const { data: replyRows } = await db
    .from('case_events')
    .select('case_id, created_at')
    .eq('event_type', 'info_provided')
    .order('created_at', { ascending: false })

  // Keep only the most-recent reply per case (rows are already desc-ordered)
  const repliedAt = new Map<string, string>()
  for (const row of replyRows ?? []) {
    if (!repliedAt.has(row.case_id)) repliedAt.set(row.case_id, row.created_at)
  }

  const typedCases = (cases ?? []) as unknown as PanelCase[]

  const actionCount = typedCases.filter(
    c => !['resolved', 'closed', 'submitted'].includes(c.status),
  ).length

  const employerCounts = new Map(
    Object.entries(
      typedCases.reduce<Record<string, number>>((acc, c) => {
        if (c.company_name) acc[c.company_name] = (acc[c.company_name] ?? 0) + 1
        return acc
      }, {}),
    ),
  )

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader profile={profile} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">

        <div className="mb-4 overflow-hidden rounded-2xl bg-brand-navy px-4 py-4 sm:mb-6 sm:px-6 sm:py-5">
          <div className="tricolour absolute top-0 inset-x-0 pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Ashraya Welfare Command Center
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-white sm:text-xl">{emirateName}</h1>
          <p className="mt-0.5 text-xs text-white/60">
            Embassy welfare case coordination for Indian nationals in the UAE
          </p>
        </div>

        <EmbassyTabs
          cases={typedCases}
          userFullName={profile.full_name ?? ''}
          emirateName={emirateName}
          showEmirateSplit={profile.role === 'embassy_abu_dhabi'}
          actionCount={actionCount}
          employerCounts={employerCounts}
          repliedAt={repliedAt}
        />

      </main>
    </div>
  )
}
