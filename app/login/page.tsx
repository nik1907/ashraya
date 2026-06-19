'use client'

import { useActionState, useEffect, useState } from 'react'

import { Logo } from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/lib/types'

import { login, signup, type AuthState } from './actions'

const initialState: AuthState = { error: null }

const inputClass =
  'rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const action = mode === 'signup' ? signup : login
  const [state, formAction, pending] = useActionState(action, initialState)
  const [orgs, setOrgs] = useState<Organization[]>([])

  // Forgot-password (client-side, so the PKCE verifier lives in this browser).
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotPending, setForgotPending] = useState(false)

  useEffect(() => {
    if (mode !== 'signup') return
    const supabase = createClient()
    supabase
      .from('organizations')
      .select('id, name, abbreviation')
      .order('name')
      .then(({ data }) => setOrgs((data as Organization[]) ?? []))
  }, [mode])

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotPending(true)
    setForgotMsg('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setForgotPending(false)
    setForgotMsg('If an account exists for that email, a reset link is on its way. Please check your inbox.')
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-2xl font-bold tracking-wide text-brand-navy">
            Ashraya
          </h1>
          <p className="text-sm text-brand-muted">
            <span className="italic">आश्रय</span> · Community Welfare Case
            Reporting · UAE
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-sm">
          <div className="tricolour" />

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold text-brand-navy">
                Reset your password
              </h2>
              <p className="text-sm text-brand-muted">
                Enter your email and we&apos;ll send you a link to set a new
                password.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                Email
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={inputClass}
                />
              </label>
              {forgotMsg && (
                <p className="rounded border-l-4 border-brand-green bg-green-50 px-3 py-2 text-sm text-green-800">
                  {forgotMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={forgotPending}
                className="rounded bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
              >
                {forgotPending ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-brand-navy-light underline"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form action={formAction} className="flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold text-brand-navy">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h2>

              {mode === 'signup' && (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    Full name
                    <input name="full_name" type="text" autoComplete="name" className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Your organization
                    <select name="org_id" required defaultValue="" className={inputClass}>
                      <option value="">Select your NGO…</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.abbreviation})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <label className="flex flex-col gap-1 text-sm">
                Email
                <input name="email" type="email" required autoComplete="email" className={inputClass} />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputClass}
                />
              </label>

              {state.error && (
                <p className="rounded border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="rounded bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
              >
                {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-brand-navy-light underline"
                >
                  {mode === 'login'
                    ? 'Need an account? Sign up'
                    : 'Already have an account? Sign in'}
                </button>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-brand-muted underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-brand-muted">
          A community welfare initiative for Indian nationals in the UAE.
        </p>
      </div>
    </main>
  )
}
