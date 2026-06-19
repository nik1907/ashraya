import { describe, expect, it } from 'vitest'

import { ddmmyy, formatCaseId } from './caseId'

describe('case ID', () => {
  it('formats ddmmyy in Gulf time', () => {
    // 2026-06-19 10:00 UTC → still the 19th in UTC+4
    expect(ddmmyy(new Date('2026-06-19T10:00:00Z'))).toBe('190626')
  })

  it('rolls the date forward for late-UTC times that are next-day in GST', () => {
    // 2026-06-19 21:00 UTC → 01:00 on the 20th in UTC+4
    expect(ddmmyy(new Date('2026-06-19T21:00:00Z'))).toBe('200626')
  })

  it('builds the {ABBR}-ddmmyy-XX-NNN format', () => {
    const d = new Date('2026-06-19T08:00:00Z')
    expect(formatCaseId('TFA', 'Death', 1, d)).toBe('TFA-190626-DE-001')
    expect(formatCaseId('TFA', 'Missing Person', 42, d)).toBe('TFA-190626-MP-042')
  })

  it('uses the NGO abbreviation as the prefix', () => {
    const d = new Date('2026-06-19T08:00:00Z')
    expect(formatCaseId('ABC', 'Death', 1, d)).toBe('ABC-190626-DE-001')
  })

  it('uses XX for an unknown case type (matching the old script)', () => {
    const d = new Date('2026-06-19T08:00:00Z')
    expect(formatCaseId('TFA', 'Nonexistent', 7, d)).toBe('TFA-190626-XX-007')
  })

  it('zero-pads the sequence to three digits', () => {
    const d = new Date('2026-01-05T08:00:00Z')
    expect(formatCaseId('TFA', 'Absconding', 5, d)).toBe('TFA-050126-AB-005')
    expect(formatCaseId('TFA', 'Absconding', 123, d)).toBe('TFA-050126-AB-123')
  })
})
