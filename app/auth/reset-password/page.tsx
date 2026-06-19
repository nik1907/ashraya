'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Logo } from '@/components/brand/Logo'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'rounded border border-brand-border px-3 py-2 outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false)

  // The recovery link returns here with a `code`; exchange it for a session.
  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('invalid')
          return
        }
      }
      const { data } = await supabase.auth.getUser()
      setStatus(data.user ? 'ready' : 'invalid')
    }
    init()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setMsg('Password must be at least 8 characters.')
      return
    }
    setPending(true)
    setMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (error) {
      setMsg(error.message)
      return
    }
    router.push('/')
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-3 text-xl font-semibold text-brand-navy">
            Set a new password
          </h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-sm">
          <div className="tricolour" />
          <div className="p-6">
            {status === 'checking' && (
              <p className="text-sm text-brand-muted">Verifying your link…</p>
            )}

            {status === 'invalid' && (
              <div className="space-y-3">
                <p className="text-sm text-red-700">
                  This reset link is invalid or has expired.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-brand-navy-light underline"
                >
                  ← Back to sign in
                </button>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  New password
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>
                {msg && (
                  <p className="rounded border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {msg}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-brand-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-navy-hover disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
