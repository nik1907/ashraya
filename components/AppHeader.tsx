import Image from 'next/image'
import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'
import { ROLE_LABELS, type Profile } from '@/lib/types'

import { SignOutButton } from './SignOutButton'

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="print:hidden">
      <div className="tricolour" />
      <div className="bg-brand-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 hover:opacity-80 transition-opacity sm:gap-3">
            <Image
              src="/tfa-logo.jpg"
              alt="Telangana Friends Association"
              width={42}
              height={42}
              className="h-8 w-8 flex-shrink-0 rounded-full sm:h-[42px] sm:w-[42px]"
            />
            <div className="h-6 w-px flex-shrink-0 bg-white/20" />
            <div className="flex-shrink-0 sm:hidden"><Logo size={28} /></div>
            <div className="hidden flex-shrink-0 sm:block"><Logo size={36} /></div>
            <div className="min-w-0 leading-tight">
              <div className="text-base font-semibold tracking-wide sm:text-lg">Ashraya</div>
              <div className="hidden text-xs text-white/70 sm:block">
                Community Welfare Case Reporting · UAE
              </div>
            </div>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2 text-sm sm:gap-3">
            <div className="hidden text-right sm:block">
              <div className="font-medium">{profile.full_name ?? 'User'}</div>
              <div className="text-xs text-brand-saffron">
                {profile.role === 'ifs_officer' && profile.designation
                  ? profile.designation
                  : ROLE_LABELS[profile.role]}
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
