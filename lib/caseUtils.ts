// Shared case utilities used by embassy and ambassador dashboards.

export type Priority = 'critical' | 'high' | 'medium' | 'normal'

export const PRIORITY_DOT: Record<Priority, string> = {
  critical: '#E24B4A',
  high:     '#EF9F27',
  medium:   '#EEA82A',
  normal:   '#639922',
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  normal:   3,
}

export function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function getPriority(caseType: string, status: string, createdAt: string): Priority {
  const t = caseType.toLowerCase(), age = daysOpen(createdAt)
  if (
    t.includes('police') || t.includes('detent') || t.includes('arrest') ||
    t.includes('death')  || t.includes('traffick') || t.includes('medical') ||
    t.includes('missing')
  ) return 'critical'
  if (status === 'sent') { if (age >= 3) return 'critical'; if (age >= 1) return 'high' }
  if (
    t.includes('passport') || t.includes('harass') || t.includes('abscond') ||
    t.includes('exit')     || t.includes('human')  || t.includes('overstay')
  ) return 'high'
  if (age >= 21) return 'critical'
  if (age >= 14) return 'high'
  if (age >= 7)  return 'medium'
  return 'normal'
}

export function getTypeColor(t: string): string {
  const s = t.toLowerCase()
  if (s.includes('police') || s.includes('detent') || s.includes('death') || s.includes('traffick')) return '#E24B4A'
  if (s.includes('harass') || s.includes('employer') || s.includes('salary'))                        return '#1D9E75'
  if (s.includes('missing'))                                                                          return '#7F77DD'
  if (s.includes('overstay') || s.includes('illegal'))                                               return '#EF9F27'
  if (s.includes('abscond'))                                                                          return '#378ADD'
  if (s.includes('passport'))                                                                         return '#EEA82A'
  if (s.includes('exit') || s.includes('amnesty'))                                                   return '#888780'
  return '#B4B2A9'
}

export function getOrg(caseId: string | null): string {
  return caseId?.split('-')[0] ?? 'Unknown'
}

export function sortByPriority<T extends { case_type: string; status: string; created_at: string }>(
  a: T,
  b: T,
): number {
  return (
    PRIORITY_ORDER[getPriority(a.case_type, a.status, a.created_at)] -
    PRIORITY_ORDER[getPriority(b.case_type, b.status, b.created_at)]
  )
}
