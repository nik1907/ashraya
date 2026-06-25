import { unstable_cache } from 'next/cache'
import { AppHeader } from '@/components/AppHeader'
import { AmbassadorDashboard } from '@/components/dashboard/AmbassadorDashboard'
import type { ExecutiveData } from '@/components/dashboard/AmbassadorExecutive'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { requireProfile } from '@/lib/auth'
import { computeAIRiskScore } from '@/lib/ai/ambassador'
import { createAdminClient } from '@/lib/supabase/admin'
import { daysOpen, getPriority } from '@/lib/caseUtils'

// ── category config ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Labour':               '#185FA5',
  'Medical':              '#1D9E75',
  'Legal':                '#7F77DD',
  'Financial':            '#EF9F27',
  'Family':               '#D4537E',
  'Death & Repatriation': '#E24B4A',
  'Missing Person':       '#D85A30',
  'Documents':            '#888780',
  'Other':                '#B4B2A9',
}

function toCategory(t: string): string {
  const l = t.toLowerCase()
  if (l.includes('death') || l.includes('dead') || l.includes('repatriat')) return 'Death & Repatriation'
  if (l.includes('medical') || l.includes('health') || l.includes('hospital') || l.includes('accident') || l.includes('injur')) return 'Medical'
  if (l.includes('salary') || l.includes('labour') || l.includes('labor') || l.includes('employ') || l.includes('wage')) return 'Labour'
  if (l.includes('legal') || l.includes('court') || l.includes('arrest') || l.includes('police') || l.includes('detent') || l.includes('criminal')) return 'Legal'
  if (l.includes('family') || l.includes('marital') || l.includes('divorce') || l.includes('child') || l.includes('domestic')) return 'Family'
  if (l.includes('financial') || l.includes('fraud') || l.includes('scam') || l.includes('theft')) return 'Financial'
  if (l.includes('missing')) return 'Missing Person'
  if (l.includes('passport') || l.includes('document') || l.includes('visa') || l.includes('overstay')) return 'Documents'
  return 'Other'
}

const isLabour      = (t: string) => /salary|labour|labor|employ|wage/i.test(t)
const isMedical     = (t: string) => /medical|health|hospital|accident/i.test(t)
const isRepatriation = (t: string) => /repatriat|death|dead/i.test(t)

function getSlaHoursServer(caseType: string): number {
  const crit = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  return crit.some(k => caseType.toLowerCase().includes(k)) ? 48 : 7 * 24
}

// ── page ──────────────────────────────────────────────────────────────────────

const fetchAmbassadorData = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [casesRes, resEventsRes, ackEventsRes] = await Promise.all([
      admin.from('cases')
        .select(
          'id, case_id, case_type, status, name, assigned_emirate, reporting_emirate, created_at, updated_at,' +
          'polished_summary, case_brief, outcome, date_of_incident, passport, eid, phone, gender, age,' +
          'reporter_name, reporter_phone, company_name, resolved_by, resolution_note, email_sent_at',
        )
        .order('created_at', { ascending: false }),
      admin.from('case_events')
        .select('case_id, created_at')
        .in('to_status', ['resolved', 'closed'])
        .order('created_at', { ascending: true }),
      admin.from('case_events')
        .select('case_id, created_at')
        .eq('to_status', 'acknowledged')
        .order('created_at', { ascending: true }),
    ])
    return {
      cases:     casesRes.data     ?? [],
      resEvents: resEventsRes.data ?? [],
      ackEvents: ackEventsRes.data ?? [],
    }
  },
  ['ambassador-data'],
  { revalidate: 60, tags: ['ambassador-data'] },
)

export default async function AmbassadorHome() {
  const profile = await requireProfile(['ambassador', 'tfa_admin'])
  const { cases: rawCases, resEvents, ackEvents } = await fetchAmbassadorData()
  const casesRes = { data: rawCases }

  const cases = rawCases as unknown as Array<Record<string, unknown>>

  // ── Existing overview stats (unchanged) ──────────────────────────────────

  const open = cases.filter(c => !['resolved', 'closed'].includes(c.status as string))

  const typeMap = new Map<string, number>()
  for (const c of open) typeMap.set(c.case_type as string, (typeMap.get(c.case_type as string) ?? 0) + 1)
  const topType = [...typeMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

  const slaBreaches = open.filter(c => {
    const hrs = (Date.now() - new Date(c.created_at as string).getTime()) / 3_600_000
    return hrs > getSlaHoursServer(c.case_type as string)
  }).length

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

  const oneLinerInput = { status, totalOpen: open.length, crisisCount, topType, slaBreaches, employerAlerts, avgDaysOpen }

  // ── Executive stats ──────────────────────────────────────────────────────

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const activeCases   = cases.filter(c => !['resolved', 'closed'].includes(c.status as string))
  const criticalCases = activeCases.filter(c => getPriority(c.case_type as string, c.status as string, c.created_at as string) === 'critical')

  const thisMonthNew = cases.filter(c => new Date(c.created_at as string) >= thisMonthStart).length
  const lastMonthNew = cases.filter(c => { const d = new Date(c.created_at as string); return d >= lastMonthStart && d <= lastMonthEnd }).length
  const volumeTrend  = lastMonthNew > 0 ? Math.round((thisMonthNew - lastMonthNew) / lastMonthNew * 100) : 0

  const thisMonthCrit = cases.filter(c => new Date(c.created_at as string) >= thisMonthStart && getPriority(c.case_type as string, c.status as string, c.created_at as string) === 'critical').length
  const lastMonthCrit = cases.filter(c => { const d = new Date(c.created_at as string); return d >= lastMonthStart && d <= lastMonthEnd && getPriority(c.case_type as string, c.status as string, c.created_at as string) === 'critical' }).length
  const criticalTrend = lastMonthCrit > 0 ? Math.round((thisMonthCrit - lastMonthCrit) / lastMonthCrit * 100) : 0

  // Avg resolution time
  const firstResolutionByCase = new Map<string, string>()
  for (const e of resEvents) {
    if (!firstResolutionByCase.has(e.case_id)) firstResolutionByCase.set(e.case_id, e.created_at)
  }
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)
  const sixtyDaysAgo  = new Date(now.getTime() - 60 * 86_400_000)
  const allResolutionTimes: number[] = [], recentTimes: number[] = [], olderTimes: number[] = []
  for (const c of cases) {
    const resolvedAt = firstResolutionByCase.get(c.id as string)
    if (!resolvedAt) continue
    const days = (new Date(resolvedAt).getTime() - new Date(c.created_at as string).getTime()) / 86_400_000
    allResolutionTimes.push(days)
    const rd = new Date(resolvedAt)
    if (rd >= thirtyDaysAgo) recentTimes.push(days)
    else if (rd >= sixtyDaysAgo) olderTimes.push(days)
  }
  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
  const avgResolutionDays = Math.round(avg(allResolutionTimes) * 10) / 10
  const resolutionTrend   = olderTimes.length > 0
    ? Math.round((avg(recentTimes) - avg(olderTimes)) / avg(olderTimes) * 100) : 0

  // Response rate — % forwarded cases acknowledged within 48h
  const firstAckByCase = new Map<string, string>()
  for (const e of ackEvents) {
    if (!firstAckByCase.has(e.case_id)) firstAckByCase.set(e.case_id, e.created_at)
  }
  const sentCases = cases.filter(c => c.email_sent_at)
  const ackWithin48 = sentCases.filter(c => {
    const ackAt = firstAckByCase.get(c.id as string)
    if (!ackAt || !c.email_sent_at) return false
    return (new Date(ackAt).getTime() - new Date(c.email_sent_at as string).getTime()) / 3_600_000 <= 48
  })
  const responseRate    = sentCases.length > 0 ? Math.round(ackWithin48.length / sentCases.length * 100) : 100
  const sentLastMonth   = sentCases.filter(c => { const d = new Date(c.email_sent_at as string); return d >= lastMonthStart && d <= lastMonthEnd }).length
  const ackLastMonth    = sentLastMonth > 0
    ? Math.round(ackEvents.filter(e => { const d = new Date(e.created_at); return d >= lastMonthStart && d <= lastMonthEnd }).length / sentLastMonth * 100) : responseRate
  const responseTrend   = ackLastMonth > 0 ? responseRate - ackLastMonth : 0

  // 12-month pulse
  const pulse = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1)
    const mc    = cases.filter(c => { const d = new Date(c.created_at as string); return d >= start && d < end })
    const y = start.getFullYear()
    const m = String(start.getMonth() + 1).padStart(2, '0')
    return {
      month:     start.toLocaleDateString('en-GB', { month: 'short' }),
      monthKey:  `${y}-${m}`,
      total:     mc.length,
      labour:    mc.filter(c => toCategory(c.case_type as string) === 'Labour').length,
      medical:   mc.filter(c => toCategory(c.case_type as string) === 'Medical').length,
      legal:     mc.filter(c => toCategory(c.case_type as string) === 'Legal').length,
      death:     mc.filter(c => toCategory(c.case_type as string) === 'Death & Repatriation').length,
      family:    mc.filter(c => toCategory(c.case_type as string) === 'Family').length,
      financial: mc.filter(c => toCategory(c.case_type as string) === 'Financial').length,
      missing:   mc.filter(c => toCategory(c.case_type as string) === 'Missing Person').length,
      documents: mc.filter(c => toCategory(c.case_type as string) === 'Documents').length,
      other:     mc.filter(c => toCategory(c.case_type as string) === 'Other').length,
    }
  })

  // Categories
  const catMap = new Map<string, number>()
  for (const c of cases) {
    const cat = toCategory(c.case_type as string)
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }
  const total = cases.length || 1
  const categories = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label, value,
      pct:   Math.round(value / total * 100),
      color: CATEGORY_COLORS[label] ?? '#B4B2A9',
    }))

  // Mission split
  const abuDhabi    = cases.filter(c => c.assigned_emirate === 'Abu Dhabi')
  const dubai       = cases.filter(c => c.assigned_emirate !== 'Abu Dhabi')
  const adThisMonth = abuDhabi.filter(c => new Date(c.created_at as string) >= thisMonthStart).length
  const adLastMonth = abuDhabi.filter(c => { const d = new Date(c.created_at as string); return d >= lastMonthStart && d <= lastMonthEnd }).length
  const dbThisMonth = dubai.filter(c => new Date(c.created_at as string) >= thisMonthStart).length
  const dbLastMonth = dubai.filter(c => { const d = new Date(c.created_at as string); return d >= lastMonthStart && d <= lastMonthEnd }).length

  const mission = {
    abuDhabi: {
      count: abuDhabi.length,
      pct:   Math.round(abuDhabi.length / total * 100),
      trend: adLastMonth > 0 ? Math.round((adThisMonth - adLastMonth) / adLastMonth * 100) : 0,
    },
    dubai: {
      count: dubai.length,
      pct:   Math.round(dubai.length / total * 100),
      trend: dbLastMonth > 0 ? Math.round((dbThisMonth - dbLastMonth) / dbLastMonth * 100) : 0,
    },
    total: cases.length,
  }

  // Funnel
  const funnel = [
    { label: 'Cases received', count: cases.filter(c => c.status !== 'submitted').length,                                                              color: '#185FA5' },
    { label: 'Acknowledged',   count: cases.filter(c => ['acknowledged','need_more_info','in_progress','resolved','closed'].includes(c.status as string)).length, color: '#0C447C' },
    { label: 'Embassy action', count: cases.filter(c => ['in_progress','resolved','closed'].includes(c.status as string)).length,                      color: '#EF9F27' },
    { label: 'Resolved',       count: cases.filter(c => ['resolved','closed'].includes(c.status as string)).length,                                    color: '#1D9E75' },
  ]

  const resolutionEfficiency = total > 1
    ? Math.round(cases.filter(c => ['resolved','closed'].includes(c.status as string)).length / total * 100) : 0

  // AI context
  const topCat  = categories[0] ?? { label: 'Labour', pct: 0 }
  const slaBreachCount = activeCases.filter(c => daysOpen(c.created_at as string) > 10).length

  const medicalThisMonth = cases.filter(c => isMedical(c.case_type as string) && new Date(c.created_at as string) >= thisMonthStart).length
  const medicalLastMonth = cases.filter(c => { const d = new Date(c.created_at as string); return isMedical(c.case_type as string) && d >= lastMonthStart && d <= lastMonthEnd }).length
  const medicalTrend     = medicalLastMonth > 0 ? Math.round((medicalThisMonth - medicalLastMonth) / medicalLastMonth * 100) : null

  const repatThisMonth    = cases.filter(c => isRepatriation(c.case_type as string) && new Date(c.created_at as string) >= thisMonthStart).length
  const repatLastMonth    = cases.filter(c => { const d = new Date(c.created_at as string); return isRepatriation(c.case_type as string) && d >= lastMonthStart && d <= lastMonthEnd }).length
  const repatriationRising = repatThisMonth > repatLastMonth && repatLastMonth > 0

  const companyMap = new Map<string, number>()
  for (const c of activeCases) {
    if (c.company_name) companyMap.set(c.company_name as string, (companyMap.get(c.company_name as string) ?? 0) + 1)
  }
  const topCompany          = [...companyMap.entries()].sort((a, b) => b[1] - a[1])[0]
  const recentEmployerAlert = topCompany && topCompany[1] >= 3 ? topCompany[0] : null

  const avgDaysOpenActive = activeCases.length
    ? Math.round(activeCases.reduce((s, c) => s + daysOpen(c.created_at as string), 0) / activeCases.length * 10) / 10
    : 0

  const aiContext = {
    activeCases:          activeCases.length,
    criticalCases:        criticalCases.length,
    avgResolutionDays,
    responseRate,
    topCategory:          topCat.label,
    topCategoryPct:       topCat.pct,
    dubaiPct:             mission.dubai.pct,
    dubaiTrend:           mission.dubai.trend,
    medicalTrend,
    recentEmployerAlert,
    repatriationRising,
    slaBreaches:          slaBreachCount,
    avgDaysOpen:          avgDaysOpenActive,
  }

  const riskScore = computeAIRiskScore(aiContext)

  const executiveData: ExecutiveData = {
    kpis: {
      activeCases:     activeCases.length,
      volumeTrend,
      criticalCases:   criticalCases.length,
      criticalTrend,
      avgResolutionDays,
      resolutionTrend,
      responseRate,
      responseTrend,
    },
    riskScore,
    pulse,
    categories,
    mission,
    funnel,
    resolutionEfficiency,
    aiContext,
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <AmbassadorDashboard
          cases={rawCases as unknown as PanelCase[]}
          oneLinerInput={oneLinerInput}
          serverStatus={status}
          executiveData={executiveData}
        />
      </main>
    </div>
  )
}
