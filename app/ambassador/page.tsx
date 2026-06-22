import { AppHeader } from '@/components/AppHeader'
import { AmbassadorDashboard } from '@/components/dashboard/AmbassadorDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { generateMissionBrief } from '@/lib/ai/polish'
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

  const allCases = (cases ?? []) as unknown as Array<Record<string, unknown>>

  // Compute brief inputs
  const openCases = allCases.filter(c => !['resolved', 'closed'].includes(c.status as string))
  const crisisTypes = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  const crisisCount = openCases.filter(c =>
    crisisTypes.some(k => (c.case_type as string).toLowerCase().includes(k)),
  ).length

  const typeMap = new Map<string, number>()
  for (const c of openCases) typeMap.set(c.case_type as string, (typeMap.get(c.case_type as string) ?? 0) + 1)

  const avgDaysOpen = openCases.length
    ? Math.round(
        openCases.reduce((s, c) => s + Math.floor((Date.now() - new Date(c.created_at as string).getTime()) / 86_400_000), 0) / openCases.length,
      )
    : 0

  const oldestDays = openCases.length
    ? Math.max(...openCases.map(c => Math.floor((Date.now() - new Date(c.created_at as string).getTime()) / 86_400_000)))
    : 0

  const week7 = allCases.filter(c => new Date(c.created_at as string).getTime() >= Date.now() - 7 * 86_400_000)
  const resolutionRate = week7.length
    ? Math.round(week7.filter(c => ['resolved', 'closed'].includes(c.status as string)).length / week7.length * 100)
    : 0

  const empMap = new Map<string, number>()
  for (const c of openCases) {
    if (c.company_name) empMap.set(c.company_name as string, (empMap.get(c.company_name as string) ?? 0) + 1)
  }

  const missionBrief = await generateMissionBrief({
    totalOpen: openCases.length,
    crisisCount,
    avgDaysOpen,
    resolutionRate,
    oldestDays,
    topTypes: [...typeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count })),
    employerAlerts: [...empMap.values()].filter(n => n >= 3).length,
    emirateSplit: {
      abu_dhabi: openCases.filter(c => (c.assigned_emirate as string) === 'Abu Dhabi').length,
      dubai:     openCases.filter(c => (c.assigned_emirate as string) === 'Dubai').length,
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <AmbassadorDashboard
          cases={(cases ?? []) as unknown as PanelCase[]}
          missionBrief={missionBrief}
        />
      </main>
    </div>
  )
}
