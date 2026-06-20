'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { landingPathForRole, type Role } from '@/lib/types'

export type AuthState = { error: string | null }

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }

  // Route to the role-appropriate landing page; pending accounts see the
  // verified/waiting page instead of their dashboard.
  const { data } = await supabase
    .from('profiles')
    .select('role, status')
    .single()
  const role = (data?.role as Role) ?? 'volunteer'
  if (data?.status === 'pending') redirect('/auth/verified')
  redirect(landingPathForRole(role))
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const orgId = String(formData.get('org_id') ?? '').trim()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (!orgId) {
    return { error: 'Please choose your organization.' }
  }

  const supabase = await createClient()
  const { data: signupData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, org_id: orgId } },
  })
  if (error) {
    return { error: error.message }
  }

  // When Supabase email confirmation is enabled, signUp returns no session.
  // Send the user to a "check your email" page. When disabled (dev/local),
  // session is present and we can go straight to dashboard.
  if (!signupData.session) {
    redirect('/auth/check-email')
  }
  redirect('/dashboard')
}
