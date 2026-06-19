import type { SupabaseClient } from '@supabase/supabase-js'

import type { ActivityItem } from '@/components/dashboard/DashboardOverview'
import { computeStats, type StatsCaseRow } from '@/lib/stats'

/**
 * Load dashboard data through the given (RLS-scoped) client, so each role sees
 * stats and activity only for the cases it's allowed to see.
 */
export async function getDashboardData(supabase: SupabaseClient) {
  const { data: caseRows } = await supabase
    .from('cases')
    .select('status, case_type, assigned_emirate, created_at, email_sent_at')

  const stats = computeStats((caseRows ?? []) as StatsCaseRow[])

  const { data: events } = await supabase
    .from('case_events')
    .select('id, case_id, event_type, to_status, created_at, cases(case_id, name)')
    .order('created_at', { ascending: false })
    .limit(8)

  const activity: ActivityItem[] = (events ?? []).map((e) => {
    const c = (e.cases ?? {}) as { case_id?: string | null; name?: string | null }
    return {
      id: e.id as string,
      case_row_id: e.case_id as string,
      label: c.case_id ?? c.name ?? 'Case',
      event_type: e.event_type as string,
      to_status: (e.to_status as string | null) ?? null,
      created_at: e.created_at as string,
    }
  })

  return { stats, activity }
}
