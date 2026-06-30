import Link from 'next/link'

import { approveOrganization, setProfileRole, setProfileStatus } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { BulkPendingApprovals } from '@/components/BulkPendingApprovals'
import { CasesListWithSearch, type AdminCaseRow } from '@/components/CasesListWithSearch'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { FilterBanner } from '@/components/dashboard/FilterBanner'
import { TeamMembersTable } from '@/components/TeamMembersTable'
import { requireProfile } from '@/lib/auth'
import { applyCaseFilters, readCaseFilterParams } from '@/lib/caseFilters'
import { getDashboardData } from '@/lib/dashboardData'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { type ProfileStatus, type Role } from '@/lib/types'
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

  // Run all independent queries in parallel to cut ~3 round-trips of latency
  const [
    { activity },
    { data: pending },
    { data: pendingOrgs },
    { data: team },
    listUsersRes,
  ] = await Promise.all([
    getDashboardData(supabase),
    supabase.from('profiles').select('id, full_name, role').eq('status', 'pending'),
    supabase
      .from('organizations')
      .select('id, name, abbreviation, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, role, status, suspension_reason, phone, designation')
      .order('created_at', { ascending: true }),
    createAdminClient().auth.admin.listUsers({ perPage: 200 }),
  ])
  const authUsers = listUsersRes.data?.users ?? []
  const emailByUserId = Object.fromEntries(authUsers.map((u) => [u.id, u.email ?? null]))

  // Fetch full case data for overview dashboard
  let overviewCases: PanelCase[] = []
  if (tab === 'overview') {
    const { data } = await supabase
      .from('cases')
      .select('id, case_id, case_type, status, name, assigned_emirate, reporting_emirate, created_at, updated_at, polished_summary, case_brief, outcome, date_of_incident, passport, eid, phone, gender, age, reporter_name, reporter_phone, company_name')
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
            <Link href="/admin/comms" className="text-sm text-brand-muted underline hover:text-brand-navy">
              Communications →
            </Link>
            <Link href="/admin/settings" className="text-sm text-brand-muted underline hover:text-brand-navy">
              Settings →
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
              {t.key === 'access' && ((pending?.length ?? 0) + (pendingOrgs?.length ?? 0)) > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {(pending?.length ?? 0) + (pendingOrgs?.length ?? 0)}
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

            {/* Pending communities */}
            {(pendingOrgs?.length ?? 0) > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-brand-navy">
                  Pending communities ({pendingOrgs!.length})
                </h2>
                <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-200 text-left text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        <th className="px-4 py-2.5">Community name</th>
                        <th className="px-4 py-2.5">Abbreviation</th>
                        <th className="px-4 py-2.5">Submitted</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrgs!.map((org) => (
                        <tr key={org.id} className="border-b border-amber-100 last:border-0">
                          <td className="px-4 py-3 font-medium text-brand-navy">{org.name}</td>
                          <td className="px-4 py-3 font-mono text-brand-muted">{org.abbreviation}</td>
                          <td className="px-4 py-3 text-brand-muted">
                            {new Date(org.created_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <form action={approveOrganization}>
                              <input type="hidden" name="org_id" value={org.id} />
                              <button
                                type="submit"
                                className="rounded bg-brand-navy px-3 py-1 text-xs font-semibold text-white hover:bg-brand-navy-hover transition-colors"
                              >
                                Approve
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Pending approvals */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-brand-navy">
                Pending approvals {(pending?.length ?? 0) > 0 && `(${pending!.length})`}
              </h2>
              <BulkPendingApprovals pending={(pending ?? []) as PendingProfile[]} />
            </section>

            {/* Team members */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-brand-navy">Team members</h2>
              <TeamMembersTable
                team={((team ?? []) as unknown as TeamMember[]).map((m) => ({
                  ...m,
                  email: emailByUserId[m.id] ?? null,
                }))}
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
  suspension_reason?: string | null
  phone?: string | null
  email?: string | null
}
