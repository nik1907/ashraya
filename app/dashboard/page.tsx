import Link from 'next/link'

import { AppHeader, PendingNotice } from '@/components/AppHeader'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { requireProfile } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'

type DraftRow = { id: string; label: string | null; updated_at: string }

export default async function VolunteerDashboard() {
  const profile = await requireProfile(['volunteer'])

  if (profile.status !== 'active') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader profile={profile} />
        <PendingNotice />
      </div>
    )
  }

  const supabase = await createClient()
  const { stats, activity } = await getDashboardData(supabase)

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
          <div className="flex items-center gap-3">
            <Link
              href="/cases"
              className="rounded border border-brand-navy px-4 py-2 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              My cases
            </Link>
            <Link
              href="/cases/new"
              className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
            >
              + Report a case
            </Link>
          </div>
        </div>

        {/* Stat cards link to /cases?status=X */}
        <DashboardOverview
          stats={stats}
          activity={activity}
          basePath="/cases"
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

      </main>
    </div>
  )
}
