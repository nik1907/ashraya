import Link from 'next/link'

import { AppHeader } from '@/components/AppHeader'
import { EmbassyCasesList } from '@/components/EmbassyCasesList'
import { EmbassyActionCenter } from '@/components/dashboard/EmbassyActionCenter'
import { EmbassyDashboard } from '@/components/dashboard/EmbassyDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const TABS = [
  { key: 'overview', label: 'Command Overview' },
  { key: 'action',   label: 'Action Center' },
  { key: 'cases',    label: 'Case Registry' },
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

  const typedCases = (cases ?? []) as unknown as PanelCase[]

  const actionCount = typedCases.filter(
    c => ['sent', 'acknowledged', 'need_more_info', 'in_progress'].includes(c.status),
  ).length

  const employerCounts = new Map(
    Object.entries(
      typedCases.reduce<Record<string, number>>((acc, c) => {
        if (c.company_name) acc[c.company_name] = (acc[c.company_name] ?? 0) + 1
        return acc
      }, {}),
    ),
  )

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader profile={profile} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">

        <div className="mb-4 overflow-hidden rounded-2xl bg-brand-navy px-4 py-4 sm:mb-6 sm:px-6 sm:py-5">
          <div className="tricolour absolute top-0 inset-x-0 pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Ashraya Welfare Command Center
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-white sm:text-xl">{emirateName}</h1>
          <p className="mt-0.5 text-xs text-white/60">
            Embassy welfare case coordination for Indian nationals in the UAE
          </p>
        </div>

        {/* Tab navigation — horizontally scrollable on mobile */}
        <div className="mb-4 flex overflow-x-auto border-b border-brand-border sm:mb-6">
          {TABS.map((t) => {
            return (
              <Link
                key={t.key}
                href={`/embassy?tab=${t.key}`}
                className={`-mb-px flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 ${
                  tab === t.key
                    ? 'border-brand-navy text-brand-navy'
                    : 'border-transparent text-brand-muted hover:text-brand-navy'
                }`}
              >
                {t.label}
                {t.key === 'action' && actionCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {actionCount}
                  </span>
                )}
                {t.key === 'cases' && (
                  <span className="ml-2 text-brand-muted">({cases?.length ?? 0})</span>
                )}
              </Link>
            )
          })}
        </div>

        {tab === 'overview' && (
          <EmbassyDashboard
            cases={typedCases}
            userFullName={profile.full_name ?? ''}
            emirateName={emirateName}
            showEmirateSplit={profile.role === 'embassy_abu_dhabi'}
          />
        )}

        {tab === 'action' && (
          <EmbassyActionCenter
            cases={typedCases}
            userFullName={profile.full_name ?? ''}
            employerCounts={employerCounts}
          />
        )}

        {tab === 'cases' && (
          <EmbassyCasesList
            cases={typedCases}
            userFullName={profile.full_name ?? ''}
          />
        )}

      </main>
    </div>
  )
}
