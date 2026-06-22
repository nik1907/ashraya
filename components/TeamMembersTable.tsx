'use client'

import { useState } from 'react'

import { suspendWithReason } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'
import { ROLE_LABELS, ROLES, type ProfileStatus, type Role } from '@/lib/types'

const PAGE_SIZE = 10

type Member = {
  id: string
  full_name: string | null
  role: Role
  status: ProfileStatus
  suspension_reason?: string | null
  email?: string | null
  phone?: string | null
}

export function TeamMembersTable({
  team,
  setProfileRole,
  setProfileStatus,
}: {
  team: Member[]
  setProfileRole: (formData: FormData) => Promise<void>
  setProfileStatus: (formData: FormData) => Promise<void>
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(team.length / PAGE_SIZE))
  const paged = team.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Track which profile_id currently has the suspend-reason form open
  const [suspendingId, setSuspendingId] = useState<string | null>(null)

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((m) => (
              <tr key={m.id} className="border-t border-brand-border">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-brand-navy">{m.full_name ?? 'Unnamed'}</span>
                  {m.email && (
                    <p className="mt-0.5 text-[11px] text-brand-muted">{m.email}</p>
                  )}
                  {m.phone && (
                    <p className="text-[11px] text-brand-muted">{m.phone}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <form action={setProfileRole} className="flex items-center gap-2">
                    <input type="hidden" name="profile_id" value={m.id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      className="rounded border border-brand-border bg-white px-2 py-1 text-sm text-brand-navy"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <SubmitButton
                      pendingText="Saving…"
                      className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                    >
                      Save
                    </SubmitButton>
                  </form>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : m.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {m.status}
                  </span>
                  {m.status === 'suspended' && m.suspension_reason && (
                    <p className="mt-1 max-w-[180px] text-[10px] leading-tight text-brand-muted">
                      {m.suspension_reason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {m.status !== 'active' ? (
                    /* Activate button — unchanged */
                    <form action={setProfileStatus} className="flex items-center gap-2">
                      <input type="hidden" name="profile_id" value={m.id} />
                      <input type="hidden" name="status" value="active" />
                      <SubmitButton
                        pendingText="Activating…"
                        className="rounded bg-brand-green px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Activate
                      </SubmitButton>
                    </form>
                  ) : suspendingId === m.id ? (
                    /* Inline suspend-with-reason form */
                    <form
                      action={async (fd) => {
                        await suspendWithReason(fd)
                        setSuspendingId(null)
                      }}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="profile_id" value={m.id} />
                      <input
                        name="suspension_reason"
                        required
                        placeholder="e.g. Submitted false information, unresponsive to admin contact"
                        className="w-full rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy placeholder:text-brand-muted/60 focus:border-brand-navy focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <SubmitButton
                          pendingText="Suspending…"
                          className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm suspend
                        </SubmitButton>
                        <button
                          type="button"
                          onClick={() => setSuspendingId(null)}
                          className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Suspend trigger button */
                    <button
                      type="button"
                      onClick={() => setSuspendingId(m.id)}
                      className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-xs text-brand-muted">
            Page {page} of {totalPages} · {team.length} members
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded border px-2.5 py-1 text-xs transition-all ${
                  page === p
                    ? 'border-brand-navy bg-brand-navy font-medium text-white'
                    : 'border-brand-border text-brand-muted hover:text-brand-navy'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
