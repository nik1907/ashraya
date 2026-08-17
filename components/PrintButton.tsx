'use client'

import { Download, Printer } from 'lucide-react'

interface PrintButtonProps {
  label?: string
  /** When provided, downloads the case PDF. When omitted, falls back to window.print(). */
  caseRowId?: string
}

export function PrintButton({ label = 'Export PDF', caseRowId }: PrintButtonProps) {
  if (caseRowId) {
    return (
      <a
        href={`/api/cases/${caseRowId}/pdf`}
        download
        className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy transition-colors"
      >
        <Download size={11} /> {label}
      </a>
    )
  }

  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy transition-colors print:hidden"
    >
      <Printer size={11} /> {label}
    </button>
  )
}
