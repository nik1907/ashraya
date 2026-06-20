'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Shown on a freshly-submitted case until the background job finishes
 *  (stamps the case ID + flips status to "sent"). Refreshes the page itself. */
export function CaseProcessing() {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [router])

  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-border bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Loader2 size={16} className="animate-spin" />
      Your case is being processed and emailed to the mission. This page updates
      automatically.
    </div>
  )
}
