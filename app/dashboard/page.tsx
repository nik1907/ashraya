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

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'cases',    label: 'My cases' },
] as const

type Tab = (typeof TABS)[number]['key']

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
  const tab: Tab = (sp?.tab as Tab) ?? 'overview'

  const supabase = await createClient()
  const { stats, activity } = await getDashboardData(supabase)

  const baseQuery = supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })
  const { data } = await applyCaseFilters(baseQuery, readCaseFilterParams(sp))

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

        {/* Tab navigation */}
        <div className="mb-6 flex border-b border-brand-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/dashboard?tab=${t.key}`}
              className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-brand-navy text-brand-navy'
                  : 'border-transparent text-brand-muted hover:text-brand-navy'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <DashboardOverview stats={stats} activity={activity} basePath="/dashboard" />

            {(drafts?.length ?? 0) > 0 && (
              <section>
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
          </div>
        )}

        {/* Cases tab */}
        {tab === 'cases' && (
          <div className="space-y-4">
            <FilterBanner params={readCaseFilterParams(sp)} basePath="/dashboard?tab=cases" />
            <CasesListPaginated cases={(data ?? []) as CaseRow[]} />
          </div>
        )}

      </main>
    </div>
  )
}
