import { X } from 'lucide-react'
import Link from 'next/link'

import type { CaseFilterParams } from '@/lib/caseFilters'

/** Shows what the case list is currently filtered by, with a Clear link. */
export function FilterBanner({
  params,
  basePath,
}: {
  params: CaseFilterParams
  basePath: string
}) {
  const parts: string[] = []
  if (params.status === 'open') parts.push('Open cases')
  else if (params.status === 'resolved') parts.push('Resolved / closed')
  else if (params.status) parts.push(`Status: ${params.status.replace('_', ' ')}`)
  if (params.type) parts.push(`Type: ${params.type}`)
  if (params.range === 'month') parts.push('This month')
  if (params.emailed === '1') parts.push('Emailed to embassy')
  if (params.q) parts.push(`Search: "${params.q}"`)

  if (parts.length === 0) return null

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-3 py-2 text-sm">
      <span className="text-brand-navy">
        <span className="font-medium">Showing:</span> {parts.join(' · ')}
      </span>
      <Link
        href={basePath}
        className="flex items-center gap-1 text-brand-navy-light hover:underline"
      >
        <X size={14} /> Clear
      </Link>
    </div>
  )
}
