import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the email routing addresses from app_settings, falling back to
 * environment variables if the DB rows are absent or empty. This ensures the
 * Settings page actually controls where case emails go.
 */
export async function getEmailRouting(): Promise<{
  EMAIL_ABU_DHABI: string
  EMAIL_DUBAI: string
}> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('app_settings')
      .select('key, value')
      .in('key', ['email_abu_dhabi', 'email_dubai'])

    const map = Object.fromEntries(
      (data ?? []).map((r) => [r.key, r.value ?? '']),
    )

    return {
      EMAIL_ABU_DHABI: map.email_abu_dhabi || process.env.EMAIL_ABU_DHABI || '',
      EMAIL_DUBAI:     map.email_dubai     || process.env.EMAIL_DUBAI     || '',
    }
  } catch {
    return {
      EMAIL_ABU_DHABI: process.env.EMAIL_ABU_DHABI || '',
      EMAIL_DUBAI:     process.env.EMAIL_DUBAI     || '',
    }
  }
}
