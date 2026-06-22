import { AppHeader } from '@/components/AppHeader'
import { AmbassadorDashboard } from '@/components/dashboard/AmbassadorDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { generateMissionOneLiner } from '@/lib/ai/polish'
import { createAdminClient } from '@/lib/supabase/admin'

function getSlaHoursServer(caseType: string): number {
  const crit = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  return crit.some(k => caseType.toLowerCase().includes(k)) ? 48 : 7 * 24
}

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

  const raw = (cases ?? []) as unknown as Array<Record<string, unknown>>
  const open = raw.filter(c => !['resolved', 'closed'].includes(c.status as string))

  // Top case type
  const typeMap = new Map<string, number>()
  for (const c of open) typeMap.set(c.case_type as string, (typeMap.get(c.case_type as string) ?? 0) + 1)
  const topType = [...typeMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

  // SLA breaches
  const slaBreaches = open.filter(c => {
    const hrs = (Date.now() - new Date(c.created_at as string).getTime()) / 3_600_000
    return hrs > getSlaHoursServer(c.case_type as string)
  }).length

  // Employer alerts
  const empMap = new Map<string, number>()
  for (const c of open) {
    if (c.company_name) empMap.set(c.company_name as string, (empMap.get(c.company_name as string) ?? 0) + 1)
  }
  const employerAlerts = [...empMap.values()].filter(n => n >= 3).length

  const crisisTypes = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  const crisisCount = open.filter(c => crisisTypes.some(k => (c.case_type as string).toLowerCase().includes(k))).length

  const avgDaysOpen = open.length
    ? Math.round(open.reduce((s, c) => s + Math.floor((Date.now() - new Date(c.created_at as string).getTime()) / 86_400_000), 0) / open.length)
    : 0

  const status: 'UNDER_CONTROL' | 'ELEVATED' | 'CRITICAL' =
    slaBreaches > 0 || crisisCount >= 3 || employerAlerts >= 2 ? 'CRITICAL' :
    crisisCount >= 1 || employerAlerts >= 1 ? 'ELEVATED' :
    'UNDER_CONTROL'

  const missionOneLiner = await generateMissionOneLiner({
    status, totalOpen: open.length, crisisCount, topType, slaBreaches, employerAlerts, avgDaysOpen,
  })

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <AmbassadorDashboard
          cases={(cases ?? []) as unknown as PanelCase[]}
          missionOneLiner={missionOneLiner}
          serverStatus={status}
        />
      </main>
    </div>
  )
}
