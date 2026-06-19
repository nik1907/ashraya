import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Role } from '@/lib/types'

/**
 * Returns the current user's profile, or null if not signed in.
 * Reads through RLS — a user can always read their own profile row.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (data as Profile) ?? null
}

/**
 * Server-side guard for pages and server actions. Redirects to /login if not
 * authenticated. If `allowed` roles are given, redirects an out-of-role user to
 * their own landing page. Returns the profile when access is granted.
 */
export async function requireProfile(allowed?: Role[]): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  if (allowed && !allowed.includes(profile.role)) {
    const { landingPathForRole } = await import('@/lib/types')
    redirect(landingPathForRole(profile.role))
  }

  return profile
}
