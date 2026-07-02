export type PeriodKind = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL'

export type ReportPeriod = {
  kind: PeriodKind
  year: number
  label: string
  start: number
  end: number
}

export type Bucket = { label: string; start: number; end: number }

const QUARTER_NUM: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', 1 | 2 | 3 | 4> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }

/** Local-time [start, end) bounds for a calendar quarter. `end` is exclusive. */
export function getQuarterBounds(year: number, q: 1 | 2 | 3 | 4): { start: number; end: number } {
  const startMonth = (q - 1) * 3
  return {
    start: new Date(year, startMonth, 1).getTime(),
    end: new Date(year, startMonth + 3, 1).getTime(),
  }
}

/** Local-time [start, end) bounds for a calendar year. `end` is exclusive. */
export function getYearBounds(year: number): { start: number; end: number } {
  return { start: new Date(year, 0, 1).getTime(), end: new Date(year + 1, 0, 1).getTime() }
}

export function makePeriod(year: number, kind: PeriodKind): ReportPeriod {
  if (kind === 'ANNUAL') {
    const { start, end } = getYearBounds(year)
    return { kind, year, label: `Calendar Year ${year}`, start, end }
  }
  const { start, end } = getQuarterBounds(year, QUARTER_NUM[kind])
  const startLabel = new Date(start).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const endLabel = new Date(end - 86_400_000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  return { kind, year, label: `${kind} ${year} (${startLabel} – ${endLabel})`, start, end }
}

/** Defaults to the most recently completed calendar quarter, not the in-progress one. */
export function defaultPeriod(now: Date = new Date()): ReportPeriod {
  const currentQ = Math.floor(now.getMonth() / 3) + 1
  const year = now.getFullYear()
  if (currentQ === 1) return makePeriod(year - 1, 'Q4')
  return makePeriod(year, (`Q${currentQ - 1}`) as PeriodKind)
}

/** Years to offer in the period picker: from the earliest case's year through the current year. */
export function availableYears(cases: { created_at: string }[], now: Date = new Date()): number[] {
  const currentYear = now.getFullYear()
  let minYear = currentYear
  for (const c of cases) {
    const y = new Date(c.created_at).getFullYear()
    if (y < minYear) minYear = y
  }
  const years: number[] = []
  for (let y = currentYear; y >= minYear; y--) years.push(y)
  return years
}

/** Monthly buckets spanning the period — 3 for a quarter, 12 for a calendar year. */
export function makeCalendarBuckets(period: ReportPeriod): Bucket[] {
  const months = period.kind === 'ANNUAL' ? 12 : 3
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(period.start)
    d.setMonth(d.getMonth() + i)
    const start = d.getTime()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    const label = d.toLocaleDateString('en', { month: 'short', ...(i === 0 ? { year: '2-digit' } : {}) })
    return { label, start, end }
  })
}
