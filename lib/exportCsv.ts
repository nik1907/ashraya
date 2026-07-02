import { daysOpen } from './caseUtils'

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

type CsvCase = {
  case_id: string | null
  name: string | null
  case_type: string
  status: string
  outcome: string | null
  reporting_emirate: string | null
  created_at: string
}

/** Per-case row export. `statusLabel` lets callers map raw status to their own display labels. */
export function casesToCsvRows(
  cases: CsvCase[],
  statusLabel: (status: string) => string = s => s,
): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['Case ID', 'Name', 'Type', 'Status', 'Outcome', 'Reporting emirate', 'Days open', 'Submitted']
  const rows = cases.map(c => [
    c.case_id ?? '', c.name ?? '', c.case_type, statusLabel(c.status),
    c.outcome ?? '', c.reporting_emirate ?? '', String(daysOpen(c.created_at)), c.created_at.slice(0, 10),
  ])
  return { headers, rows }
}
