'use client'

import { useState, useTransition } from 'react'

import { setProfileStatus } from '@/app/admin/actions'
import { ROLE_LABELS, type Role } from '@/lib/types'

type PendingProfile = { id: string; full_name: string | null; role: Role }

export function BulkPendingApprovals({ pending }: { pending: PendingProfile[] }) {
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [, startTransition]       = useTransition()

  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-5 text-sm text-brand-muted">
        No accounts awaiting approval.
      </p>
    )
  }

  const allSelected = selected.size === pending.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pending.map(p => p.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function approveSelected() {
    if (selected.size === 0) return
    const ids = [...selected]
    setSelected(new Set())
    startTransition(async () => {
      for (const id of ids) {
        const fd = new FormData()
        fd.set('profile_id', id)
        fd.set('status', 'active')
        await setProfileStatus(fd)
      }
    })
  }

  return (
    <div className="space-y-2">
      {/* Bulk action bar — appears when any item is selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-brand-navy/5 px-4 py-2.5">
          <span className="text-sm text-brand-navy">
            {selected.size} account{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={approveSelected}
            className="rounded bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Approve {selected.size}
          </button>
        </div>
      )}

      {/* Select all */}
      <label className="flex cursor-pointer items-center gap-3 px-1 py-1 text-xs text-brand-muted">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-3.5 w-3.5 rounded accent-brand-navy"
        />
        Select all ({pending.length})
      </label>

      {pending.map(p => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => toggle(p.id)}
            className="h-3.5 w-3.5 rounded accent-brand-navy"
          />
          <span className="flex-1 text-brand-navy">
            {p.full_name ?? 'Unnamed'}{' '}
            <span className="text-brand-muted">— {ROLE_LABELS[p.role]}</span>
          </span>
          <form action={setProfileStatus}>
            <input type="hidden" name="profile_id" value={p.id} />
            <input type="hidden" name="status" value="active" />
            <button className="rounded bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              Approve
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}
