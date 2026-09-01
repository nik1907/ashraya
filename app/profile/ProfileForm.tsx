'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/SubmitButton'
import { updateOwnProfile, type ProfileFormState } from './actions'

const initialState: ProfileFormState = {}

export function ProfileForm({
  fullName,
  phone,
  passport,
  eid,
}: {
  fullName: string
  phone: string
  passport: string
  eid: string
}) {
  const [state, dispatch] = useActionState(updateOwnProfile, initialState)

  return (
    <form action={dispatch} className="flex flex-col gap-4">

      <label className="flex flex-col gap-1 text-sm">
        <span>Full name<span className="text-red-600"> *</span></span>
        <input
          name="full_name"
          defaultValue={fullName}
          required
          className="rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Phone</span>
        <input
          name="phone"
          defaultValue={phone}
          placeholder="+971 50 123 4567"
          className="rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Passport number</span>
          <input
            name="passport"
            defaultValue={passport}
            placeholder="e.g. A1234567"
            className="rounded border border-brand-border px-3 py-2 uppercase outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Emirates ID</span>
          <input
            name="eid"
            defaultValue={eid}
            placeholder="784-1990-1234567-1"
            className="rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
          />
        </label>
      </div>

      {state.error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <div>
        <SubmitButton
          pendingText="Saving…"
          className="rounded bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy-hover"
        >
          Save profile
        </SubmitButton>
      </div>
    </form>
  )
}
