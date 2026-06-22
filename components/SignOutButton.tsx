'use client'

import { SubmitButton } from '@/components/SubmitButton'

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <SubmitButton
        pendingText="Signing out…"
        className="rounded border border-white/30 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
      >
        Sign out
      </SubmitButton>
    </form>
  )
}
