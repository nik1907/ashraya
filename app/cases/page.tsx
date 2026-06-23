import Link from 'next/link'

import { AppHeader } from '@/components/AppHeader'
import { CasesListWithSearch, type AdminCaseRow } from '@/components/CasesListWithSearch'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function MyCasesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const profile = await requireProfile(['volunteer'])
  const sp = props.searchParams ? await props.searchParams : {}
  const initialStatus = typeof sp?.status === 'string' ? sp.status : ''

  const supabase = await createClient()
  const { data } = await supabase
    .from('cases')
    .select('id, case_id, case_type, status, name, reporter_name, assigned_emirate, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">My cases</h1>
            <p className="mt-0.5 text-sm text-brand-muted">
              All cases you have reported
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-brand-muted hover:text-brand-navy"
            >
              ← Dashboard
            </Link>
            <Link
              href="/cases/new"
              className="rounded bg-brand-navy px-4 py-2 text-sm text-white transition-colors hover:bg-brand-navy-hover"
            >
              + Report a case
            </Link>
          </div>
        </div>

        <CasesListWithSearch
          cases={(data ?? []) as AdminCaseRow[]}
          initialStatus={initialStatus}
          hideReporter
        />

      </main>
    </div>
  )
}
