/**
 * Date/time formatting for the UAE.
 *
 * Every user-visible timestamp in Ashraya is rendered in Gulf Standard Time
 * (Asia/Dubai, UTC+4) regardless of where the server or the viewer's browser
 * sits. This is an Embassy requirement — a case timeline that shifts depending
 * on who opens it is not an audit trail.
 *
 * Always use these helpers instead of calling toLocaleDateString directly.
 */

export const UAE_TZ = 'Asia/Dubai'

/** "01 Sep 2025" */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: UAE_TZ,
  })
}

/** "1 Sep" — compact, for dense tables and timelines */
export function fmtShortDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', timeZone: UAE_TZ,
  })
}

/** "14:30" (24-hour) */
export function fmtTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: UAE_TZ,
  })
}

/** "01 Sep 2025 14:30 GST" */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return `${fmtDate(iso)} ${fmtTime(iso)} GST`
}

/** "01 Sep 2025 14:30" — no GST suffix, when the label already says it */
export function fmtDateTimeBare(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return `${fmtDate(iso)} ${fmtTime(iso)}`
}

/** "Monday, 1 September 2025" — for letterheads and formal headers */
export function fmtLongDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: UAE_TZ,
  })
}

/** "1 September 2025" — long form without the weekday */
export function fmtLongDateNoWeekday(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: UAE_TZ,
  })
}

/** "Sep" — month abbreviation only, for chart axes */
export function fmtMonth(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', timeZone: UAE_TZ })
}
