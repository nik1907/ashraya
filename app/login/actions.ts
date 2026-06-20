'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
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
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }

  // Log the sign-in event to the audit trail (non-fatal)
  if (signInData?.user) {
    try {
      const admin = createAdminClient()
      await admin.from('case_events').insert({
        case_id: null,
        actor: signInData.user.id,
        event_type: 'login',
      })
    } catch { /* non-fatal */ }
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

const VALID_ROLES: Role[] = ['volunteer', 'tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai']

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email    = String(formData.get('email')     ?? '').trim()
  const password = String(formData.get('password')  ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const orgId    = String(formData.get('org_id')    ?? '').trim()
  const roleRaw  = String(formData.get('role')      ?? 'volunteer').trim()
  const role: Role = VALID_ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : 'volunteer'

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (!orgId) {
    return { error: 'Please select your organization.' }
  }

  const supabase = await createClient()
  const { data: signupData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, org_id: orgId } },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('already registered') ||
      msg.includes('already in use') ||
      msg.includes('user already') ||
      msg.includes('email address already')
    ) {
      return {
        error:
          'An account with this email already exists. Click "Forgot password?" to recover your account, or contact TFA Admin at tfa.abudhabi@gmail.com.',
      }
    }
    return { error: error.message }
  }

  // Apply the requested role via admin client (trigger defaults to volunteer)
  const userId = signupData.user?.id
  if (userId && role !== 'volunteer') {
    try {
      const admin = createAdminClient()
      await admin.from('profiles').update({ role }).eq('id', userId)
    } catch { /* non-fatal — admin can fix role manually */ }
  }

  // When Supabase email confirmation is enabled, signUp returns no session.
  // Send the user to a "check your email" page. When disabled (dev/local),
  // session is present and we can go straight to dashboard.
  if (!signupData.session) {
    redirect('/auth/check-email')
  }
  redirect('/dashboard')
}
