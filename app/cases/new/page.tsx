import Link from 'next/link'

import { AppHeader, PendingNotice } from '@/components/AppHeader'
import { CaseForm } from '@/components/CaseForm'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

// Allow the background finalize (AI summary + email) up to 60s.
export const maxDuration = 60

export default async function NewCasePage() {
  const profile = await requireProfile(['volunteer', 'tfa_admin'])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      {profile.status !== 'active' ? (
        <PendingNotice />
      ) : (
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-brand-navy">
              Report a new case
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-brand-navy-light underline"
            >
              ← Back
            </Link>
          </div>
          {/*
            MoM item 6 — the volunteer's own details are captured once on their
            profile and frozen here, so they never re-type them per case. A field
            is only frozen when the profile actually has a value for it.
          */}
          <CaseForm
            frozenFields={{
              reporter_name:  profile.full_name ?? '',
              reporter_email: user?.email ?? '',
              ...(profile.phone    ? { reporter_phone:    profile.phone    } : {}),
              ...(profile.passport ? { reporter_passport: profile.passport } : {}),
              ...(profile.eid      ? { reporter_eid:      profile.eid      } : {}),
            }}
          />
        </main>
      )}
    </div>
  )
}
