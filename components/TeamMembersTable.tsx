'use client'

import { useState } from 'react'

import { deleteUser, suspendWithReason } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'
import { EMBASSY_OFFICERS } from '@/lib/embassy-officers'
import { ROLE_LABELS, ROLES, type ProfileStatus, type Role } from '@/lib/types'

const PAGE_SIZE = 10

const DIPLOMATIC_ROLES: Role[] = ['ambassador', 'ifs_officer', 'embassy_abu_dhabi', 'embassy_dubai']

function officersForRole(role: Role) {
  if (role === 'embassy_abu_dhabi') return EMBASSY_OFFICERS.filter(o => o.mission === 'abu-dhabi')
  if (role === 'embassy_dubai')     return EMBASSY_OFFICERS.filter(o => o.mission === 'dubai')
  return EMBASSY_OFFICERS // ambassador / ifs_officer: show all
}

function RoleForm({
  m,
  setProfileRole,
}: {
  m: { id: string; role: Role; designation?: string | null; dashboard_view?: string | null; gender?: string | null }
  setProfileRole: (formData: FormData) => Promise<void>
}) {
  const [selectedRole,        setSelectedRole]        = useState<Role>(m.role)
  const [selectedOfficerName, setSelectedOfficerName] = useState<string>('')
  const [designation,         setDesignation]         = useState(m.designation ?? '')
  const [dashboardView,       setDashboardView]       = useState<'embassy_all' | 'embassy_assigned' | 'ambassador'>((m.dashboard_view as 'embassy_all' | 'embassy_assigned' | 'ambassador') ?? 'embassy_all')
  const [gender,              setGender]              = useState<'male' | 'female' | null>((m.gender as 'male' | 'female' | null) ?? null)

  const isDiplomatic = (DIPLOMATIC_ROLES as Role[]).includes(selectedRole)
  const officers     = officersForRole(selectedRole)

  function handleRoleChange(role: Role) {
    setSelectedRole(role)
    setSelectedOfficerName('')
    setDesignation('')
    setGender(null)
  }

  function handleOfficerPick(name: string) {
    setSelectedOfficerName(name)
    const officer = EMBASSY_OFFICERS.find(o => o.name === name)
    if (officer) {
      setDesignation(officer.designation)
      setGender(officer.gender)
    }
  }

  return (
    <form action={setProfileRole} className="flex flex-col gap-1.5">
      <input type="hidden" name="profile_id" value={m.id} />
      <input type="hidden" name="dashboard_view" value={dashboardView} />
      {gender && <input type="hidden" name="gender" value={gender} />}
      {selectedOfficerName && (
        <input type="hidden" name="full_name" value={selectedOfficerName} />
      )}

      {/* Role selector + Save */}
      <div className="flex items-center gap-2">
        <select
          name="role"
          value={selectedRole}
          onChange={e => handleRoleChange(e.target.value as Role)}
          className="rounded border border-brand-border bg-white px-2 py-1 text-sm text-brand-navy"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <SubmitButton
          pendingText="Saving…"
          className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
        >
          Save
        </SubmitButton>
      </div>

      {/* Officer picker + designation — only for diplomatic roles */}
      {isDiplomatic && (
        <>
          <select
            value={selectedOfficerName}
            onChange={e => handleOfficerPick(e.target.value)}
            className="rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy w-64"
          >
            <option value="">— Select officer (auto-fills name & designation) —</option>
            {officers.map(o => (
              <option key={o.name} value={o.name}>
                {o.name} · {o.designation}
              </option>
            ))}
          </select>
          <input
            name="designation"
            value={designation}
            onChange={e => setDesignation(e.target.value)}
            placeholder={
              selectedRole === 'ambassador'    ? 'e.g. Ambassador of India to the UAE' :
              selectedRole === 'embassy_dubai' ? 'e.g. Consul General' :
                                                'e.g. Deputy Chief of Mission'
            }
            className="rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy placeholder-brand-muted/60 w-64"
          />
          {selectedOfficerName && (
            <p className="text-[10px] text-green-700 font-medium">
              Will also set name to: {selectedOfficerName}
            </p>
          )}

          {/* Gender — controls Shri / Smt. honorific in the app header */}
          <div className="flex flex-col gap-1 pt-0.5">
            <span className="text-[10px] text-brand-muted">Honorific:</span>
            <div className="flex gap-3">
              {([
                ['male',   'Shri (Male)'],
                ['female', 'Smt. (Female)'],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`gender_ui_${m.id}`}
                    checked={gender === val}
                    onChange={() => setGender(val)}
                    className="accent-brand-navy"
                  />
                  <span className="text-[10px] text-brand-navy">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dashboard view — which page this user sees when they log in */}
          <div className="flex flex-col gap-1 pt-0.5">
            <span className="text-[10px] text-brand-muted">Dashboard on login:</span>
            <div className="flex flex-wrap gap-3">
              {([
                ['embassy_all',      'Embassy (all cases)'],
                ['embassy_assigned', 'Embassy (my cases only)'],
                ['ambassador',       'Ambassador overview'],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`dashboard_view_ui_${m.id}`}
                    checked={dashboardView === val}
                    onChange={() => setDashboardView(val)}
                    className="accent-brand-navy"
                  />
                  <span className="text-[10px] text-brand-navy">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </form>
  )
}

type Member = {
  id: string
  full_name: string | null
  role: Role
  status: ProfileStatus
  suspension_reason?: string | null
  email?: string | null
  phone?: string | null
  designation?: string | null
  cases_scope?: string | null
  dashboard_view?: string | null
  gender?: string | null
  valid_until?: string | null
}

function ValidityBadge({ validUntil, role }: { validUntil?: string | null; role: Role }) {
  if (role !== 'volunteer' || !validUntil) return null
  const expiry = new Date(validUntil)
  const now = new Date()
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
  if (daysLeft < 0) return (
    <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
      Expired
    </span>
  )
  if (daysLeft <= 30) return (
    <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      Expires in {daysLeft}d
    </span>
  )
  return (
    <span className="ml-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">
      Valid until {expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })}
    </span>
  )
}

export function TeamMembersTable({
  team,
  setProfileRole,
  setProfileStatus,
  updateProfileName,
}: {
  team: Member[]
  setProfileRole: (formData: FormData) => Promise<void>
  setProfileStatus: (formData: FormData) => Promise<void>
  updateProfileName: (formData: FormData) => Promise<void>
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(team.length / PAGE_SIZE))
  const paged = team.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Track which profile_id currently has the suspend-reason form open
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  // Track which profile_id has the delete-confirm prompt open
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Track which profile_id is having its name edited
  const [editingNameId, setEditingNameId] = useState<string | null>(null)

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
                  {editingNameId === m.id ? (
                    <form
                      action={async (fd) => {
                        await updateProfileName(fd)
                        setEditingNameId(null)
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="profile_id" value={m.id} />
                      <input
                        name="full_name"
                        defaultValue={m.full_name ?? ''}
                        required
                        autoFocus
                        className="rounded border border-brand-border bg-white px-2 py-1 text-sm text-brand-navy focus:border-brand-navy focus:outline-none w-36"
                      />
                      <SubmitButton
                        pendingText="…"
                        className="rounded bg-brand-navy px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Save
                      </SubmitButton>
                      <button
                        type="button"
                        onClick={() => setEditingNameId(null)}
                        className="rounded border border-brand-border px-2 py-1 text-xs text-brand-muted hover:text-brand-navy"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingNameId(m.id)}
                      className="group text-left"
                      title="Click to edit name"
                    >
                      <span className="font-medium text-brand-navy group-hover:underline">
                        {m.full_name ?? 'Unnamed'}
                      </span>
                      <span className="ml-1.5 text-[10px] text-brand-muted opacity-0 group-hover:opacity-100">
                        edit
                      </span>
                    </button>
                  )}
                  {m.email && (
                    <p className="mt-0.5 text-[11px] text-brand-muted">{m.email}</p>
                  )}
                  {m.phone && (
                    <p className="text-[11px] text-brand-muted">{m.phone}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <RoleForm key={`${m.id}-${m.role}-${m.designation ?? ''}`} m={m} setProfileRole={setProfileRole} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      m.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : m.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.status}
                    </span>
                    <ValidityBadge validUntil={m.valid_until} role={m.role} />
                  </div>
                  {m.status === 'suspended' && m.suspension_reason && (
                    <p className="mt-1 max-w-[180px] text-[10px] leading-tight text-brand-muted">
                      {m.suspension_reason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {deletingId === m.id ? (
                    /* Inline delete-confirm prompt */
                    <form
                      action={async (fd) => {
                        await deleteUser(fd)
                        setDeletingId(null)
                      }}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="profile_id" value={m.id} />
                      <p className="text-[11px] font-medium text-red-700">
                        Permanently delete {m.full_name ?? 'this user'}? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <SubmitButton
                          pendingText="Deleting…"
                          className="rounded bg-red-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-800"
                        >
                          Yes, delete
                        </SubmitButton>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : m.status !== 'active' ? (
                    /* Pending / suspended: Activate + Delete */
                    <div className="flex items-center gap-2">
                      <form action={setProfileStatus}>
                        <input type="hidden" name="profile_id" value={m.id} />
                        <input type="hidden" name="status" value="active" />
                        <SubmitButton
                          pendingText="Activating…"
                          className="rounded bg-brand-green px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                        >
                          Activate
                        </SubmitButton>
                      </form>
                      <button
                        type="button"
                        onClick={() => { setSuspendingId(null); setDeletingId(m.id) }}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:border-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
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
                    /* Active: Suspend + Delete */
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setDeletingId(null); setSuspendingId(m.id) }}
                        className="rounded border border-brand-border px-2.5 py-1 text-xs text-brand-muted hover:text-brand-navy"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSuspendingId(null); setDeletingId(m.id) }}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:border-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
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
