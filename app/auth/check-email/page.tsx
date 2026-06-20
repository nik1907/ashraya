import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-3 text-xl font-semibold text-brand-navy">
            Check your email
          </h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-sm">
          <div className="tricolour" />
          <div className="space-y-3 p-6 text-sm text-brand-muted">
            <p>
              We sent a confirmation link to your email address. Please open it
              to verify your account.
            </p>
            <p>
              Once confirmed, a TFA admin will review and approve your account
              before you can log in.
            </p>
            <p className="pt-1">
              <Link href="/login" className="text-brand-navy-light underline">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
