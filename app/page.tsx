import { redirect } from 'next/navigation'

import { getProfile } from '@/lib/auth'
import { landingPathForRole } from '@/lib/types'

export default async function Home() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  redirect(landingPathForRole(profile.role))
}
