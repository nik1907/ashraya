'use client'

import { useActionState } from 'react'

import { inviteUser, type InviteUserState } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'
import { ROLE_LABELS, ROLES } from '@/lib/types'

const inputClass =
  'rounded border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

export function CreateUserForm() {
  const [state, formAction] = useActionState<InviteUserState, FormData>(inviteUser, null)

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      {state?.ok && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Invitation sent to <strong>{state.email}</strong>. They will receive an email to set their password.
        </p>
      )}
      {state && !state.ok && state.error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-brand-navy">Full name</span>
        <input
          name="full_name"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Ravi Kumar"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-brand-navy">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="user@example.com"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-brand-navy">Role</span>
        <select name="role" required defaultValue="volunteer" className={inputClass}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton
          pendingText="Sending…"
          className="rounded bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
        >
          Send invitation
        </SubmitButton>
        <p className="text-xs text-brand-muted">
          User will receive an email to set their own password.
        </p>
      </div>
    </form>
  )
}
