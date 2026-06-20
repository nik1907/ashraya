import { redirect } from 'next/navigation'

import { LandingPage } from '@/components/LandingPage'
import { getProfile } from '@/lib/auth'
import { landingPathForRole } from '@/lib/types'

export default async function Home() {
  const profile = await getProfile()
  if (profile) redirect(landingPathForRole(profile.role))
  return <LandingPage />
}
