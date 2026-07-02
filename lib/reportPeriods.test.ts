import { describe, expect, it } from 'vitest'

import {
  availableYears,
  defaultPeriod,
  getQuarterBounds,
  getYearBounds,
  makeCalendarBuckets,
  makePeriod,
} from './reportPeriods'

const now = new Date('2026-07-02T12:00:00Z')

describe('reportPeriods', () => {
  it('computes quarter boundaries and rolls over year correctly', () => {
    const q4_2025 = getQuarterBounds(2025, 4)
    const q1_2026 = getQuarterBounds(2026, 1)
    expect(q4_2025.end).toBe(q1_2026.start)
    expect(new Date(q4_2025.start).getMonth()).toBe(9) // October
    expect(new Date(q1_2026.start).getMonth()).toBe(0) // January
  })

  it('computes calendar year boundaries', () => {
    const y = getYearBounds(2026)
    expect(new Date(y.start).getFullYear()).toBe(2026)
    expect(new Date(y.start).getMonth()).toBe(0)
    expect(new Date(y.end).getFullYear()).toBe(2027)
  })

  it('defaults to the most recently completed quarter, not the in-progress one', () => {
    const p = defaultPeriod(now)
    expect(p.kind).toBe('Q2')
    expect(p.year).toBe(2026)
  })

  it('rolls the default back to Q4 of the prior year when currently in Q1', () => {
    const p = defaultPeriod(new Date('2026-02-15T12:00:00Z'))
    expect(p.kind).toBe('Q4')
    expect(p.year).toBe(2025)
  })

  it('derives available years from case data plus the current year', () => {
    const years = availableYears(
      [{ created_at: '2024-03-01T00:00:00Z' }, { created_at: '2025-06-01T00:00:00Z' }],
      now,
    )
    expect(years).toEqual([2026, 2025, 2024])
  })

  it('builds 3 monthly buckets for a quarter and 12 for a calendar year', () => {
    const q = makePeriod(2026, 'Q2')
    const yearBuckets = makeCalendarBuckets(makePeriod(2026, 'ANNUAL'))
    expect(makeCalendarBuckets(q)).toHaveLength(3)
    expect(yearBuckets).toHaveLength(12)
    expect(new Date(yearBuckets[0].start).getMonth()).toBe(0)
    expect(new Date(yearBuckets[11].start).getMonth()).toBe(11)
  })
})
