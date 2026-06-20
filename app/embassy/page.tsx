import { AppHeader } from '@/components/AppHeader'
import { CasesList, type CaseRow } from '@/components/CasesList'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { FilterBanner } from '@/components/dashboard/FilterBanner'
import { requireProfile } from '@/lib/auth'
import { applyCaseFilters, readCaseFilterParams } from '@/lib/caseFilters'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'

export default async function EmbassyHome(props: PageProps<'/embassy'>) {
  const profile = await requireProfile(['embassy_abu_dhabi', 'embassy_dubai'])
  const isHeadMission = profile.role === 'embassy_abu_dhabi'
  const sp = await props.searchParams
  const statusFilter = typeof sp.status === 'string' ? sp.status : ''

  const supabase = await createClient()
  const { stats, activity } = await getDashboardData(supabase)
  // RLS already restricts these rows to this user's emirate.
  const baseQuery = supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })
  const { data: cases } = await applyCaseFilters(baseQuery, readCaseFilterParams(sp))

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">
            {isHeadMission ? 'All UAE cases' : 'Cases — Dubai'}
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            {isHeadMission
              ? 'All community welfare cases reported across the UAE.'
              : 'Community welfare cases routed to Dubai.'}
          </p>
        </div>

        <DashboardOverview stats={stats} activity={activity} basePath="/embassy" simple />

        <section id="cases" className="scroll-mt-6">
        <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded border border-brand-border px-3 py-1.5"
          >
            <option value="">All statuses</option>
            {['submitted', 'sent', 'acknowledged', 'in_progress', 'resolved', 'closed'].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
          <button className="rounded border border-brand-border px-3 py-1.5">
            Filter
          </button>
        </form>

        <FilterBanner params={readCaseFilterParams(sp)} basePath="/embassy" />
        <CasesList cases={(cases ?? []) as CaseRow[]} />
        </section>
      </main>
    </div>
  )
}
