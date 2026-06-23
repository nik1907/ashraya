export type StatsCaseRow = {
  status: string
  case_type: string
  assigned_emirate: string
  created_at: string
  email_sent_at: string | null
}

export type DashboardStats = {
  total: number
  open: number
  resolved: number
  thisMonth: number
  emailsSent: number
  // per-status breakdown (for volunteer view)
  submitted: number
  acknowledged: number
  moreInfo: number
  inProgress: number
  byType: { label: string; value: number }[]
  byStatus: { label: string; value: number }[]
  byEmirate: { label: string; value: number }[]
  trend: { date: string; value: number }[]
}

const RESOLVED_STATUSES = new Set(['resolved', 'closed'])

function tally(items: string[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const i of items) map.set(i, (map.get(i) ?? 0) + 1)
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate the (already RLS-scoped) visible cases into dashboard numbers. */
export function computeStats(
  cases: StatsCaseRow[],
  now: Date = new Date(),
): DashboardStats {
  const monthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`

  // Last 14 days, oldest → newest, zero-filled.
  const trendDays: { date: string; value: number }[] = []
  const dayIndex = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dayIndex.set(key, trendDays.length)
    trendDays.push({ date: key.slice(5), value: 0 })
  }

  let open = 0
  let resolved = 0
  let thisMonth = 0
  let emailsSent = 0
  let submitted = 0
  let acknowledged = 0
  let moreInfo = 0
  let inProgress = 0

  for (const c of cases) {
    if (RESOLVED_STATUSES.has(c.status)) {
      resolved++
    } else {
      open++
      if (c.status === 'submitted' || c.status === 'sent') submitted++
      else if (c.status === 'acknowledged') acknowledged++
      else if (c.status === 'more_info_requested') moreInfo++
      else if (c.status === 'in_progress') inProgress++
    }
    if (c.email_sent_at) emailsSent++

    const created = new Date(c.created_at)
    if (`${created.getUTCFullYear()}-${created.getUTCMonth()}` === monthKey) {
      thisMonth++
    }
    const dKey = c.created_at.slice(0, 10)
    const idx = dayIndex.get(dKey)
    if (idx !== undefined) trendDays[idx].value++
  }

  return {
    total: cases.length,
    open,
    resolved,
    thisMonth,
    emailsSent,
    submitted,
    acknowledged,
    moreInfo,
    inProgress,
    byType: tally(cases.map((c) => c.case_type)),
    byStatus: tally(cases.map((c) => c.status)),
    byEmirate: tally(cases.map((c) => c.assigned_emirate)),
    trend: trendDays,
  }
}
