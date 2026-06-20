import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Handles the Supabase PKCE callback for email confirmation (and any other
 * OAuth/magic-link flows we add later). Supabase appends `?code=...` to
 * whatever redirect URL is configured in the Auth settings.
 *
 * After a successful code exchange the user has a live session and their
 * profile status is still "pending" — we send them to /auth/verified.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/verified'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid-link`)
}
