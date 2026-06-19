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

  // Route to the role-appropriate landing page.
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .single()
  const role = (data?.role as Role) ?? 'volunteer'
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, org_id: orgId } },
  })
  if (error) {
    return { error: error.message }
  }

  // New accounts land as pending volunteers until an admin activates them.
  redirect('/dashboard')
}
