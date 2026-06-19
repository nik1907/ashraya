import { describe, expect, it } from 'vitest'

import { computeStats, type StatsCaseRow } from './stats'

const now = new Date('2026-06-19T12:00:00Z')

function makeCase(p: Partial<StatsCaseRow>): StatsCaseRow {
  return {
    status: 'submitted',
    case_type: 'Death',
    assigned_emirate: 'Abu Dhabi',
    created_at: '2026-06-19T08:00:00Z',
    email_sent_at: null,
    ...p,
  }
}

describe('dashboard stats', () => {
  it('counts totals, open vs resolved, and emails sent', () => {
    const s = computeStats(
      [
        makeCase({ status: 'submitted' }),
        makeCase({ status: 'sent', email_sent_at: '2026-06-19T09:00:00Z' }),
        makeCase({ status: 'resolved' }),
        makeCase({ status: 'closed' }),
      ],
      now,
    )
    expect(s.total).toBe(4)
    expect(s.open).toBe(2)
    expect(s.resolved).toBe(2)
    expect(s.emailsSent).toBe(1)
  })

  it('breaks down by type, status, and emirate', () => {
    const s = computeStats(
      [
        makeCase({ case_type: 'Death', assigned_emirate: 'Abu Dhabi' }),
        makeCase({ case_type: 'Death', assigned_emirate: 'Dubai' }),
        makeCase({ case_type: 'Missing Person', assigned_emirate: 'Dubai' }),
      ],
      now,
    )
    expect(s.byType[0]).toEqual({ label: 'Death', value: 2 })
    expect(s.byEmirate.find((e) => e.label === 'Dubai')?.value).toBe(2)
  })

  it('produces a 14-day trend with the case counted on its day', () => {
    const s = computeStats([makeCase({ created_at: '2026-06-19T08:00:00Z' })], now)
    expect(s.trend).toHaveLength(14)
    expect(s.trend[s.trend.length - 1]).toEqual({ date: '06-19', value: 1 })
  })

  it('counts cases created this month', () => {
    const s = computeStats(
      [
        makeCase({ created_at: '2026-06-01T08:00:00Z' }),
        makeCase({ created_at: '2026-05-31T08:00:00Z' }),
      ],
      now,
    )
    expect(s.thisMonth).toBe(1)
  })
})
