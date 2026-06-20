import { AppHeader } from '@/components/AppHeader'
import { EmbassyDashboard } from '@/components/dashboard/EmbassyDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function EmbassyHome() {
  const profile = await requireProfile(['embassy_abu_dhabi', 'embassy_dubai'])
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
      <EmbassyDashboard
        cases={(cases ?? []) as unknown as PanelCase[]}
        userFullName={profile.full_name ?? ''}
        emirateName={emirateName}
        showEmirateSplit={profile.role === 'embassy_abu_dhabi'}
      />
    </div>
  )
}
