'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Export PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1 rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy print:hidden"
    >
      <Printer size={11} /> {label}
    </button>
  )
}
