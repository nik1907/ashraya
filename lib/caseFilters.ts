export type CaseFilterParams = {
  status?: string
  type?: string
  range?: string
  emailed?: string
  q?: string
}

function startOfMonthISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Read the supported dashboard/list filters out of a page's searchParams. */
export function readCaseFilterParams(
  sp: Record<string, string | string[] | undefined>,
): CaseFilterParams {
  const get = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  return {
    status: get('status'),
    type: get('type'),
    range: get('range'),
    emailed: get('emailed'),
    q: get('q'),
  }
}

/**
 * Apply the supported filters to a Supabase cases query builder.
 * - status: 'open' (not resolved/closed), 'resolved' (resolved or closed), or an exact status
 * - type: exact case_type
 * - range: 'month' → created this calendar month
 * - emailed: '1' → has been emailed to the embassy
 * - q: search by name or case_id
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCaseFilters<T>(query: T, p: CaseFilterParams): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any
  if (p.status === 'open') q = q.not('status', 'in', '(resolved,closed)')
  else if (p.status === 'resolved') q = q.in('status', ['resolved', 'closed'])
  else if (p.status) q = q.eq('status', p.status)
  if (p.type) q = q.eq('case_type', p.type)
  if (p.range === 'month') q = q.gte('created_at', startOfMonthISO())
  if (p.emailed === '1') q = q.not('email_sent_at', 'is', null)
  if (p.q) q = q.or(`name.ilike.%${p.q}%,case_id.ilike.%${p.q}%`)
  return q as T
}
