import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Handles the Supabase PKCE callback for email confirmation (and any other
 * OAuth/magic-link flows we add later). Supabase appends `?code=...` to
 * whatever redirect URL is configured in the Auth settings.
 *
 * After a successful code exchange the account is email-verified but still
 * pending admin approval. We sign the user out (so they can't access anything)
 * and send them to /login with a confirmation banner.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?email_confirmed=1`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid-link`)
}
