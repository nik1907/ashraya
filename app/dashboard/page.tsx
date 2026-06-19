import Link from 'next/link'

import { AppHeader, PendingNotice } from '@/components/AppHeader'
import { CasesList, type CaseRow } from '@/components/CasesList'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { requireProfile } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'

export default async function VolunteerDashboard() {
  const profile = await requireProfile(['volunteer'])

  if (profile.status !== 'active') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader profile={profile} />
        <PendingNotice />
      </div>
    ) }

  const supabase = await createClient()
  const { stats, activity } = await getDashboardData(supabase)
  const { data } = await supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-navy">My dashboard</h1>
          <Link
            href="/cases/new"
            className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
          >
            + Report a case
          </Link>
        </div>

        <DashboardOverview stats={stats} activity={activity} />

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-navy">
            My reported cases
          </h2>
          <CasesList cases={(data ?? []) as CaseRow[]} />
        </section>
      </main>
    </div>
  )
}
