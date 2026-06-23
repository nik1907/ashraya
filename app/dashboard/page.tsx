import Link from 'next/link'

import { AppHeader, PendingNotice } from '@/components/AppHeader'
import { CasesListPaginated } from '@/components/CasesListPaginated'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { FilterBanner } from '@/components/dashboard/FilterBanner'
import { requireProfile } from '@/lib/auth'
import { applyCaseFilters, readCaseFilterParams } from '@/lib/caseFilters'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'
import type { CaseRow } from '@/components/CasesList'

type DraftRow = { id: string; label: string | null; updated_at: string }

export default async function VolunteerDashboard(props: PageProps<'/dashboard'>) {
  const profile = await requireProfile(['volunteer'])

  if (profile.status !== 'active') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader profile={profile} />
        <PendingNotice />
      </div>
    )
  }

  const sp = await props.searchParams
  const filterParams = readCaseFilterParams(sp)

  const supabase = await createClient()
  const { stats, activity } = await getDashboardData(supabase)

  const baseQuery = supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })
  const { data } = await applyCaseFilters(baseQuery, filterParams)

  const { data: drafts } = await supabase
    .from('case_drafts')
    .select('id, label, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-brand-navy">My dashboard</h1>
          <Link
            href="/cases/new"
            className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
          >
            + Report a case
          </Link>
        </div>

        {/* Stats + charts + activity */}
        <DashboardOverview
          stats={stats}
          activity={activity}
          basePath="/dashboard"
          volunteerView
        />

        {/* Saved drafts */}
        {(drafts?.length ?? 0) > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-brand-navy">
              Saved drafts ({drafts!.length})
            </h2>
            <div className="space-y-2">
              {(drafts as DraftRow[]).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-card px-4 py-3 text-sm"
                >
                  <span className="text-brand-navy">
                    {d.label || 'Untitled draft'}
                    <span className="ml-2 text-xs text-brand-muted">
                      — saved {new Date(d.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                  <Link
                    href={`/cases/draft/${d.id}`}
                    className="ml-4 shrink-0 rounded border border-brand-navy px-3 py-1 text-xs text-brand-navy hover:bg-brand-navy/5"
                  >
                    Resume
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cases list — filtered by whichever stat card was clicked */}
        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-brand-navy">My cases</h2>
          <FilterBanner params={filterParams} basePath="/dashboard" />
          <CasesListPaginated cases={(data ?? []) as CaseRow[]} />
        </section>

      </main>
    </div>
  )
}
