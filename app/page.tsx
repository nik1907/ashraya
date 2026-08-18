import { redirect } from 'next/navigation'

import { LandingPage } from '@/components/LandingPage'
import { getProfile } from '@/lib/auth'
import { landingPathForProfile } from '@/lib/types'

export default async function Home() {
  const profile = await getProfile()
  if (profile) redirect(landingPathForProfile(profile))
  return <LandingPage />
}
