'use server'

import { revalidatePath } from 'next/cache'

import { requireProfile } from '@/lib/auth'
import { resendCaseEmail } from '@/lib/cases/finalize'
import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/types'

const CASE_STATUSES = [
  'submitted',
  'sent',
  'acknowledged',
  'need_more_info',
  'in_progress',
  'resolved',
  'closed',
] as const

/**
 * Change a case's status and record it in the audit log. Allowed for TFA admins
 * and embassy staff; RLS limits embassy users to their own emirate's cases.
 * When resolving/closing, captures who handled it and an optional note.
 */
export async function updateCaseStatus(formData: FormData) {
  const profile = await requireProfile([
    'tfa_admin',
    'embassy_abu_dhabi',
    'embassy_dubai',
  ])
  const caseId = String(formData.get('case_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!caseId || !CASE_STATUSES.includes(status as never)) return

  const resolvedBy = String(formData.get('resolved_by') ?? '').trim()
  const note = String(formData.get('resolution_note') ?? '').trim()
  const isResolution = status === 'resolved' || status === 'closed'

  const supabase = await createClient()
  const { data: before } = await supabase
    .from('cases')
    .select('status')
    .eq('id', caseId)
    .single()

  const update: Record<string, unknown> = { status }
  if (isResolution) {
    update.resolved_by = resolvedBy || null
    update.resolution_note = note || null
  }
  await supabase.from('cases').update(update).eq('id', caseId)

  await supabase.from('case_events').insert({
    case_id: caseId,
    actor: profile.id,
    event_type: 'status_changed',
    from_status: before?.status ?? null,
    to_status: status,
    note:
      note ||
      (isResolution && resolvedBy ? `Handled by ${resolvedBy}` : null),
  })

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/admin')
}

/** Admin activates (or suspends) a volunteer/staff account. */
export async function setProfileStatus(formData: FormData) {
  await requireProfile(['tfa_admin'])
  const profileId = String(formData.get('profile_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!profileId || !['active', 'suspended', 'pending'].includes(status)) return

  const supabase = await createClient()
  await supabase.from('profiles').update({ status }).eq('id', profileId)
  revalidatePath('/admin')
}

/** Admin assigns a role to a team member (volunteer / admin / embassy). */
export async function setProfileRole(formData: FormData) {
  await requireProfile(['tfa_admin'])
  const profileId = String(formData.get('profile_id') ?? '')
  const role = String(formData.get('role') ?? '')
  if (!profileId || !ROLES.includes(role as never)) return

  const supabase = await createClient()
  await supabase.from('profiles').update({ role }).eq('id', profileId)
  revalidatePath('/admin')
}

/** Admin re-sends the embassy email for a case. */
export async function resendEmail(formData: FormData) {
  const profile = await requireProfile(['tfa_admin'])
  const caseId = String(formData.get('case_id') ?? '')
  if (!caseId) return
  await resendCaseEmail(caseId, profile.id)
  revalidatePath(`/cases/${caseId}`)
}
