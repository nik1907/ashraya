'use client'

import { useState } from 'react'

import { ROLE_LABELS, ROLES, type ProfileStatus, type Role } from '@/lib/types'

const PAGE_SIZE = 10

type Member = { id: string; full_name: string | null; role: Role; status: ProfileStatus }

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
                <td className="px-4 py-2.5 font-medium text-brand-navy">
                  {m.full_name ?? 'Unnamed'}
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
                    <button className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy">
                      Save
                    </button>
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
                </td>
                <td className="px-4 py-2.5">
                  <form action={setProfileStatus} className="flex items-center gap-2">
                    <input type="hidden" name="profile_id" value={m.id} />
                    {m.status !== 'active' ? (
                      <button
                        name="status"
                        value="active"
                        className="rounded bg-brand-green px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        name="status"
                        value="suspended"
                        className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                      >
                        Suspend
                      </button>
                    )}
                  </form>
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
