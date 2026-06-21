import Link from 'next/link'

import { setProfileRole, setProfileStatus } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { CasesListWithSearch, type AdminCaseRow } from '@/components/CasesListWithSearch'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { FilterBanner } from '@/components/dashboard/FilterBanner'
import { TeamMembersTable } from '@/components/TeamMembersTable'
import { requireProfile } from '@/lib/auth'
import { applyCaseFilters, readCaseFilterParams } from '@/lib/caseFilters'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'
import { ROLE_LABELS, type ProfileStatus, type Role } from '@/lib/types'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'

type PendingProfile = { id: string; full_name: string | null; role: Role }

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'cases',    label: 'Cases' },
  { key: 'access',   label: 'Access control' },
] as const

type Tab = (typeof TABS)[number]['key']

export default async function AdminHome(props: PageProps<'/admin'>) {
  const profile = await requireProfile(['tfa_admin'])
  const sp = await props.searchParams
  const tab: Tab = (sp?.tab as Tab) ?? 'overview'

  const supabase = await createClient()
  const { activity } = await getDashboardData(supabase)

  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('status', 'pending')

  const { data: team } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .order('created_at', { ascending: true })

  // Fetch full case data for overview dashboard
  let overviewCases: PanelCase[] = []
  if (tab === 'overview') {
    const { data } = await supabase
      .from('cases')
      .select('id, case_id, case_type, status, name, assigned_emirate, reporting_emirate, created_at, polished_summary, case_brief, outcome, date_of_incident, passport, eid, phone, gender, age, reporter_name, reporter_phone, company_name')
      .order('created_at', { ascending: false })
    overviewCases = (data ?? []) as unknown as PanelCase[]
  }

  // Fetch filtered cases for the Cases tab
  let cases: AdminCaseRow[] = []
  if (tab === 'cases') {
    const baseQuery = supabase
      .from('cases')
      .select('id, case_id, case_type, status, name, reporter_name, assigned_emirate, created_at')
      .order('created_at', { ascending: false })
    const { data } = await applyCaseFilters(baseQuery, readCaseFilterParams(sp))
    cases = (data ?? []) as AdminCaseRow[]
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-brand-navy">Admin dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin/audit" className="text-sm text-brand-muted underline hover:text-brand-navy">
              Audit log →
            </Link>
            <Link
              href="/cases/new"
              className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
            >
              + Report a case
            </Link>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mb-6 flex border-b border-brand-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin?tab=${t.key}`}
              className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-brand-navy text-brand-navy'
                  : 'border-transparent text-brand-muted hover:text-brand-navy'
              }`}
            >
              {t.label}
              {t.key === 'access' && (pending?.length ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {pending!.length}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <AdminDashboard
            cases={overviewCases}
            pendingApprovals={pending?.length ?? 0}
            activity={activity}
          />
        )}

        {/* Cases tab */}
        {tab === 'cases' && (
          <div className="space-y-4">
            <FilterBanner params={readCaseFilterParams(sp)} basePath="/admin?tab=cases" />
            <CasesListWithSearch cases={cases} />
          </div>
        )}

        {/* Access control tab */}
        {tab === 'access' && (
          <div className="space-y-8">

            {/* Pending approvals */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-brand-navy">
                Pending approvals {(pending?.length ?? 0) > 0 && `(${pending!.length})`}
              </h2>
              {(pending?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-5 text-sm text-brand-muted">
                  No accounts awaiting approval.
                </p>
              ) : (
                <div className="space-y-2">
                  {(pending as PendingProfile[]).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
                    >
                      <span className="text-brand-navy">
                        {p.full_name ?? 'Unnamed'}{' '}
                        <span className="text-brand-muted">— {ROLE_LABELS[p.role]}</span>
                      </span>
                      <form action={setProfileStatus}>
                        <input type="hidden" name="profile_id" value={p.id} />
                        <input type="hidden" name="status" value="active" />
                        <button className="rounded bg-brand-green px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                          Approve
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Team members */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-brand-navy">Team members</h2>
              <TeamMembersTable
                team={(team as TeamMember[] | null) ?? []}
                setProfileRole={setProfileRole}
                setProfileStatus={setProfileStatus}
              />
            </section>

          </div>
        )}

      </main>
    </div>
  )
}

type TeamMember = {
  id: string
  full_name: string | null
  role: Role
  status: ProfileStatus
}
