import { AppHeader } from '@/components/AppHeader'
import { AmbassadorDashboard } from '@/components/dashboard/AmbassadorDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AmbassadorHome() {
  const profile = await requireProfile(['ambassador'])
  const supabase = createAdminClient()

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
        <AmbassadorDashboard cases={(cases ?? []) as unknown as PanelCase[]} />
      </main>
    </div>
  )
}
