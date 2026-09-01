import Link from 'next/link'

import { AppHeader } from '@/components/AppHeader'
import { requireProfile } from '@/lib/auth'
import { fmtDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { ROLE_LABELS, landingPathForProfile } from '@/lib/types'

import { ProfileForm } from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Volunteer records expire one year after creation (MoM item 7).
  const validUntil = profile.valid_until ? new Date(profile.valid_until) : null
  const daysLeft = validUntil
    ? Math.ceil((validUntil.getTime() - Date.now()) / 86_400_000)
    : null
  const showValidity = profile.role === 'volunteer' && validUntil !== null

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-navy">My profile</h1>
          <Link
            href={landingPathForProfile(profile)}
            className="text-sm text-brand-navy-light underline"
          >
            ← Back
          </Link>
        </div>

        {/* Read-only account facts — these are admin-controlled */}
        <div className="mb-6 rounded-xl border border-brand-border bg-brand-surface p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-brand-muted">Email</span>
            <span className="font-medium text-brand-navy">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-brand-muted">Role</span>
            <span className="font-medium text-brand-navy">
              {profile.designation ?? ROLE_LABELS[profile.role]}
            </span>
          </div>
          {showValidity && (
            <div className="flex justify-between py-1">
              <span className="text-brand-muted">Record valid until</span>
              <span className={`font-medium ${
                daysLeft! < 0 ? 'text-red-700' : daysLeft! <= 30 ? 'text-amber-700' : 'text-brand-navy'
              }`}>
                {fmtDate(validUntil!)}
                {daysLeft! < 0 && ' · Expired'}
                {daysLeft! >= 0 && daysLeft! <= 30 && ` · ${daysLeft} days left`}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-card p-5">
          <h2 className="mb-1 text-sm font-semibold text-brand-navy">Your details</h2>
          <p className="mb-4 text-xs text-brand-muted">
            These are filled in automatically whenever you report a case, so you
            never have to type them again.
          </p>
          <ProfileForm
            fullName={profile.full_name ?? ''}
            phone={profile.phone ?? ''}
            passport={profile.passport ?? ''}
            eid={profile.eid ?? ''}
          />
        </div>

      </main>
    </div>
  )
}
