import { shortCodeFor } from './caseConfig'

/** ddmmyy in a fixed timezone (Gulf Standard Time, UTC+4 — where TFA operates). */
export function ddmmyy(date: Date): string {
  // Shift to UTC+4 without depending on the server's local timezone.
  const gst = new Date(date.getTime() + 4 * 60 * 60 * 1000)
  const dd = String(gst.getUTCDate()).padStart(2, '0')
  const mm = String(gst.getUTCMonth() + 1).padStart(2, '0')
  const yy = String(gst.getUTCFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

/**
 * Build a case ID: {ABBR}-ddmmyy-XX-NNN where ABBR is the NGO's abbreviation,
 * XX is the case-type short code, and NNN is that NGO's day sequence (1-based).
 */
export function formatCaseId(
  abbreviation: string,
  caseType: string,
  sequenceForDay: number,
  date: Date,
): string {
  const code = shortCodeFor(caseType)
  const seq = String(sequenceForDay).padStart(3, '0')
  return `${abbreviation}-${ddmmyy(date)}-${code}-${seq}`
}
