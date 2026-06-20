import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Log the sign-out event before ending the session (non-fatal)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      await admin.from('case_events').insert({
        case_id: null,
        actor: user.id,
        event_type: 'logout',
      })
    }
  } catch { /* non-fatal */ }

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
