'use server'

import { revalidatePath } from 'next/cache'

import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type ProfileFormState = { error?: string; success?: string }

/**
 * A user updates their OWN profile. Deliberately narrow: only the identity
 * fields a volunteer owns. Role, status, org and scope are admin-controlled and
 * are never writable here — the update is scoped to the caller's own row.
 */
export async function updateOwnProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const profile = await requireProfile()

  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone    = String(formData.get('phone')     ?? '').trim()
  const passport = String(formData.get('passport')  ?? '').trim().toUpperCase()
  const eid      = String(formData.get('eid')       ?? '').trim()

  if (!fullName) {
    return { error: 'Name is required.' }
  }

  // Emirates ID is 15 digits, conventionally written 784-YYYY-NNNNNNN-C.
  if (eid && !/^\d{3}-?\d{4}-?\d{7}-?\d{1}$/.test(eid)) {
    return { error: 'Emirates ID must be 15 digits (e.g. 784-1990-1234567-1).' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone:     phone    || null,
      passport:  passport || null,
      eid:       eid      || null,
    })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/cases/new')
  return { success: 'Profile updated.' }
}
