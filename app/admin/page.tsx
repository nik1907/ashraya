import Link from 'next/link'

import { setProfileRole, setProfileStatus } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { CasesList, type CaseRow } from '@/components/CasesList'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { requireProfile } from '@/lib/auth'
import { applyCaseFilters, readCaseFilterParams } from '@/lib/caseFilters'
import { getDashboardData } from '@/lib/dashboardData'
import { createClient } from '@/lib/supabase/server'
import { ROLE_LABELS, ROLES, type ProfileStatus, type Role } from '@/lib/types'

const STATUS_OPTIONS = [
  'submitted',
  'sent',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]

type PendingProfile = { id: string; full_name: string | null; role: Role }

export default async function AdminHome(props: PageProps<'/admin'>) {
  const profile = await requireProfile(['tfa_admin'])
  const sp = await props.searchParams
  const statusFilter = typeof sp.status === 'string' ? sp.status : ''
  const q = typeof sp.q === 'string' ? sp.q : ''

  const supabase = await createClient()

  const baseQuery = supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })
  const { data: cases } = await applyCaseFilters(baseQuery, readCaseFilterParams(sp))

  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('status', 'pending')

  const { data: team } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .order('created_at', { ascending: true })

  const { stats, activity } = await getDashboardData(supabase)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-6">
        <h1 className="text-xl font-semibold text-brand-navy">Admin dashboard</h1>

        <DashboardOverview
          stats={stats}
          activity={activity}
          basePath="/admin"
          extraStat={{ label: 'Pending volunteers', value: pending?.length ?? 0 }}
        />

        {/* Pending approvals */}
        {(pending?.length ?? 0) > 0 && (
          <section id="pending" className="scroll-mt-6">

            <h2 className="mb-2 text-sm font-semibold text-brand-navy">
              Volunteers awaiting approval ({pending!.length})
            </h2>
            <div className="space-y-2">
              {(pending as PendingProfile[]).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm"
                >
                  <span>
                    {p.full_name ?? 'Unnamed'}{' '}
                    <span className="text-brand-muted">— {ROLE_LABELS[p.role]}</span>
                  </span>
                  <form action={setProfileStatus}>
                    <input type="hidden" name="profile_id" value={p.id} />
                    <input type="hidden" name="status" value="active" />
                    <button className="rounded bg-green-600 px-3 py-1 text-white">
                      Approve
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cases */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-brand-navy">All cases</h2>
            <Link
              href="/cases/new"
              className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
            >
              + Report a case
            </Link>
          </div>

          <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name or case ID…"
              className="rounded border border-brand-border px-3 py-1.5"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded border border-brand-border px-3 py-1.5"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="rounded border border-brand-border px-3 py-1.5">
              Filter
            </button>
            {(q || statusFilter) && (
              <Link
                href="/admin"
                className="rounded px-3 py-1.5 text-brand-navy-light underline"
              >
                Clear
              </Link>
            )}
          </form>

          <CasesList cases={(cases ?? []) as CaseRow[]} />
        </section>

        {/* Team members */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-navy">
            Team members
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-navy/5 text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(team as TeamMember[] | null)?.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{m.full_name ?? 'Unnamed'}</td>
                    <td className="px-4 py-2">
                      <form action={setProfileRole} className="flex items-center gap-2">
                        <input type="hidden" name="profile_id" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="rounded border border-brand-border px-2 py-1"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded border border-brand-border px-2 py-1 text-xs">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2">
                      <form action={setProfileStatus} className="flex items-center gap-2">
                        <input type="hidden" name="profile_id" value={m.id} />
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                          {m.status}
                        </span>
                        {m.status !== 'active' ? (
                          <button
                            name="status"
                            value="active"
                            className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            name="status"
                            value="suspended"
                            className="rounded border border-brand-border px-2 py-1 text-xs"
                          >
                            Suspend
                          </button>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
