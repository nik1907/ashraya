import Link from 'next/link'

import { AppHeader } from '@/components/AppHeader'
import { EmbassyCasesList } from '@/components/EmbassyCasesList'
import { EmbassyDashboard } from '@/components/dashboard/EmbassyDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'cases',    label: 'Cases' },
] as const

type Tab = (typeof TABS)[number]['key']

export default async function EmbassyHome(props: PageProps<'/embassy'>) {
  const profile = await requireProfile(['embassy_abu_dhabi', 'embassy_dubai'])
  const sp = await props.searchParams
  const tab: Tab = (sp?.tab as Tab) ?? 'overview'

  const emirateName =
    profile.role === 'embassy_abu_dhabi'
      ? 'Indian Embassy — Abu Dhabi'
      : 'Indian Consulate — Dubai'

  const supabase = await createClient()
  // RLS restricts rows to this user's assigned emirate automatically.
  const { data: cases } = await supabase
    .from('cases')
    .select(
      'id, case_id, case_type, status, name, assigned_emirate, reporting_emirate, created_at,' +
        'polished_summary, case_brief, outcome, date_of_incident, passport, eid, phone, gender, age,' +
        'reporter_name, reporter_phone, company_name, resolved_by, resolution_note',
    )
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader profile={profile} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-brand-navy">{emirateName}</h1>
        </div>

        {/* Tab navigation */}
        <div className="mb-6 flex border-b border-brand-border">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/embassy?tab=${t.key}`}
              className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-brand-navy text-brand-navy'
                  : 'border-transparent text-brand-muted hover:text-brand-navy'
              }`}
            >
              {t.label}
              {t.key === 'cases' && (
                <span className="ml-2 text-brand-muted">({cases?.length ?? 0})</span>
              )}
            </Link>
          ))}
        </div>

        {tab === 'overview' && (
          <EmbassyDashboard
            cases={(cases ?? []) as unknown as PanelCase[]}
            userFullName={profile.full_name ?? ''}
            emirateName={emirateName}
            showEmirateSplit={profile.role === 'embassy_abu_dhabi'}
          />
        )}

        {tab === 'cases' && (
          <EmbassyCasesList
            cases={(cases ?? []) as unknown as PanelCase[]}
            userFullName={profile.full_name ?? ''}
          />
        )}

      </main>
    </div>
  )
}
