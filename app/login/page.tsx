'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/lib/types'

import { login, signup, type AuthState } from './actions'

const initialState: AuthState = { error: null }

const inputClass =
  'rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

type Mode = 'login' | 'signup' | 'forgot' | 'reset-code'

function LoginContent() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const action = mode === 'signup' ? signup : login
  const [state, formAction, pending] = useActionState(action, initialState)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [communityAbbr, setCommunityAbbr] = useState('')
  const searchParams = useSearchParams()
  const emailConfirmed = searchParams.get('email_confirmed') === '1'
  const invalidLink   = searchParams.get('error') === 'invalid-link'

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotMsgIsError, setForgotMsgIsError] = useState(false)
  const [forgotPending, setForgotPending] = useState(false)

  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetMsgIsError, setResetMsgIsError] = useState(false)
  const [resetPending, setResetPending] = useState(false)

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
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail)
    setForgotPending(false)
    if (error) {
      setForgotMsgIsError(true)
      setForgotMsg('Could not send the reset code — please try again in a moment, or contact the TFA admin team.')
    } else {
      setResetEmail(forgotEmail)
      setResetCode('')
      setResetPassword('')
      setResetMsg('')
      setMode('reset-code')
    }
  }

  async function handleResetCode(e: React.FormEvent) {
    e.preventDefault()
    if (resetPassword.length < 8) {
      setResetMsgIsError(true)
      setResetMsg('Password must be at least 8 characters.')
      return
    }
    setResetPending(true)
    setResetMsg('')
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: resetCode.trim(),
      type: 'recovery',
    })
    if (otpError) {
      setResetPending(false)
      setResetMsgIsError(true)
      setResetMsg('That code is incorrect or has expired. Please request a new one.')
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: resetPassword })
    setResetPending(false)
    if (updateError) {
      setResetMsgIsError(true)
      setResetMsg(updateError.message)
      return
    }
    router.push('/')
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-3 text-2xl font-bold tracking-wide text-brand-navy">
            Ashraya
          </h1>
          <p className="text-sm text-brand-muted">
            <span className="italic">आश्रय</span> · Community Welfare Case
            Reporting · UAE
          </p>
        </div>

        {emailConfirmed && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">Email verified!</p>
            <p className="mt-0.5">Your account is now awaiting TFA Admin approval. You will receive an email once it is activated.</p>
          </div>
        )}

        {invalidLink && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            That confirmation link is invalid or has expired. Please sign up again or contact TFA Admin.
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-sm">
          <div className="tricolour" />

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold text-brand-navy">
                Reset your password
              </h2>
              <p className="text-sm text-brand-muted">
                Enter your email and we&apos;ll send you a 6-digit code to set a new password.
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
                <p className={`rounded border-l-4 px-3 py-2 text-sm ${forgotMsgIsError ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-green bg-green-50 text-green-800'}`}>
                  {forgotMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={forgotPending}
                className="rounded bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
              >
                {forgotPending ? 'Sending…' : 'Send reset code'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-brand-navy-light underline"
              >
                ← Back to sign in
              </button>
            </form>
          ) : mode === 'reset-code' ? (
            <form onSubmit={handleResetCode} className="flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold text-brand-navy">
                Enter your reset code
              </h2>
              <p className="text-sm text-brand-muted">
                Check your inbox for a 6-digit code we sent to <strong>{resetEmail}</strong> and enter it below along with your new password.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                Email
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Reset code
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6,8}"
                  maxLength={8}
                  required
                  placeholder="12345678"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className={`${inputClass} font-mono tracking-widest text-center text-lg`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                New password
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className={inputClass}
                />
              </label>
              {resetMsg && (
                <p className={`rounded border-l-4 px-3 py-2 text-sm ${resetMsgIsError ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-green bg-green-50 text-green-800'}`}>
                  {resetMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={resetPending}
                className="rounded bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
              >
                {resetPending ? 'Verifying…' : 'Set new password'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setForgotMsg(''); }}
                  className="text-brand-navy-light underline"
                >
                  ← Resend code
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-brand-muted underline"
                >
                  Back to sign in
                </button>
              </div>
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
                    Your community
                    <select
                      name="org_id"
                      required
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select your community…</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.abbreviation})
                        </option>
                      ))}
                      <option value="others">Others (add new community)</option>
                    </select>
                  </label>

                  {selectedOrg === 'others' && (
                    <div className="flex flex-col gap-3 rounded-lg border border-brand-saffron/30 bg-amber-50 p-3">
                      <p className="text-xs text-amber-800">
                        Your community will be added after admin approval and will appear in the list for future signups.
                      </p>
                      <label className="flex flex-col gap-1 text-sm">
                        Community name
                        <input
                          name="community_name"
                          type="text"
                          required
                          placeholder="e.g. Andhra Pradesh Association"
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        3-letter abbreviation (used in case IDs)
                        <input
                          name="community_abbr"
                          type="text"
                          required
                          maxLength={3}
                          placeholder="e.g. APA"
                          value={communityAbbr}
                          onChange={(e) => setCommunityAbbr(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                          className={`${inputClass} font-mono tracking-widest uppercase`}
                        />
                      </label>
                    </div>
                  )}
                  <label className="flex flex-col gap-1 text-sm">
                    I am joining as
                    <select name="role" required defaultValue="volunteer" className={inputClass}>
                      <option value="volunteer">Volunteer</option>
                      <option value="tfa_admin">Admin</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Phone number
                    <input name="phone" type="tel" autoComplete="tel" placeholder="+971 50 000 0000" className={inputClass} />
                  </label>
                  <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
                    After verifying your email, your account will need TFA Admin approval before you can sign in.
                  </p>
                </>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span>
                  Email{mode === 'signup' && <span className="text-red-600"> *</span>}
                </span>
                <input name="email" type="email" required autoComplete="email" className={inputClass} />
                {mode === 'signup' && (
                  <span className="text-[11px] text-brand-muted">
                    Use an email you can access — we will send a verification link.{' '}
                    If it doesn&apos;t arrive within a few minutes, check your{' '}
                    <strong>spam or junk folder</strong> and mark it as &quot;Not Spam&quot;
                    so you receive future updates.
                  </span>
                )}
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
                    onClick={() => { setForgotEmail(''); setForgotMsg(''); setMode('forgot'); }}
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
        <a
          href="https://argov.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-brand-muted/60 transition-colors hover:text-brand-muted"
        >
          <svg width="14" height="14" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="16" fill="#0b1628" />
            <circle cx="17" cy="17" r="15" fill="none" stroke="#c97c2a" strokeWidth="1.5" />
            <line x1="17" y1="3"  x2="17" y2="11" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="23" x2="17" y2="31" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3"  y1="17" x2="11" y2="17" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="23" y1="17" x2="31" y2="17" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="17" cy="17" r="2.2" fill="#4db8ff" />
            <circle cx="17" cy="17" r="1.1" fill="#ffffff" />
          </svg>
          Powered by{' '}
          <span className="font-semibold tracking-wide">
            ARGOV<span className="text-[#4db8ff]">™</span>
          </span>
        </a>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
