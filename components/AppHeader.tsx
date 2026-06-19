import { Logo } from '@/components/brand/Logo'
import { ROLE_LABELS, type Profile } from '@/lib/types'

import { SignOutButton } from './SignOutButton'

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header>
      <div className="tricolour" />
      <div className="bg-brand-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo size={42} />
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-wide">Ashraya</div>
              <div className="text-xs text-white/70">
                Community Welfare Case Reporting · UAE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <div className="font-medium">{profile.full_name ?? 'User'}</div>
              <div className="text-xs text-brand-saffron">
                {ROLE_LABELS[profile.role]}
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export function PendingNotice() {
  return (
    <div className="mx-auto mt-6 max-w-6xl px-6">
      <div className="rounded-lg border-l-4 border-brand-saffron bg-amber-50 p-4 text-sm text-amber-900">
        Your account is <strong>pending approval</strong>. A TFA admin needs to
        activate it before you can submit or view cases.
      </div>
    </div>
  )
}
