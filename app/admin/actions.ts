'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { requireProfile } from '@/lib/auth'
import { resendCaseEmail } from '@/lib/cases/finalize'
import { sendApprovalEmail, sendEmail, sendStatusAckEmail } from '@/lib/email/send'
import { getEmailRouting } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const resolvedBy     = String(formData.get('resolved_by')       ?? '').trim()
  const note           = String(formData.get('resolution_note')   ?? '').trim()
  const infoRequestMsg = String(formData.get('info_request_message') ?? '').trim()
  const isResolution   = status === 'resolved' || status === 'closed'
  const isMoreInfo     = status === 'need_more_info'

  const supabase = await createClient()
  const { data: before } = await supabase
    .from('cases')
    .select('status, case_id, case_type, name, reporter_email, reporter_name, assigned_emirate')
    .eq('id', caseId)
    .single()

  const outcome = String(formData.get('outcome') ?? '').trim()
  const update: Record<string, unknown> = { status }
  if (isResolution) {
    update.resolved_by = resolvedBy || null
    update.resolution_note = note || null
    update.outcome = outcome || null
  }
  await supabase.from('cases').update(update).eq('id', caseId)

  await supabase.from('case_events').insert({
    case_id: caseId,
    actor: profile.id,
    event_type: 'status_changed',
    from_status: before?.status ?? null,
    to_status: status,
    note:
      (isMoreInfo && infoRequestMsg)
        ? infoRequestMsg
        : note || (isResolution && resolvedBy ? `Handled by ${resolvedBy}` : null),
  })

  // Send acknowledgement email after response is returned (non-blocking)
  if (before?.reporter_email && before.case_id) {
    const emailArgs = {
      to:                 before.reporter_email,
      reporterName:       before.reporter_name ?? null,
      caseId:             before.case_id,
      caseRowId:          caseId,
      caseType:           before.case_type,
      affectedName:       before.name ?? null,
      newStatus:          status,
      resolvedBy:         isResolution ? (resolvedBy || null) : undefined,
      resolutionNote:     isResolution ? (note || null) : undefined,
      outcome:            isResolution ? (outcome || null) : undefined,
      assignedEmirate:    before.assigned_emirate ?? null,
      infoRequestMessage: isMoreInfo ? (infoRequestMsg || null) : undefined,
    }
    after(async () => {
      try {
        const routing = await getEmailRouting()
        await sendStatusAckEmail({ ...emailArgs, abuDhabiEmail: routing.EMAIL_ABU_DHABI, dubaiEmail: routing.EMAIL_DUBAI })
      } catch { /* non-fatal */ }
    })
  }

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/admin')
  revalidatePath('/embassy')
}

/** Admin activates (or suspends) a volunteer/staff account. */
export async function setProfileStatus(formData: FormData) {
  await requireProfile(['tfa_admin'])
  const profileId = String(formData.get('profile_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!profileId || !['active', 'suspended', 'pending'].includes(status)) return

  const supabase = await createClient()
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('id', profileId)
    .single()

  await supabase.from('profiles').update({ status }).eq('id', profileId)

  // Send an approval email when a volunteer is activated for the first time (non-blocking).
  if (status === 'active' && profileRow?.status !== 'active') {
    const name = profileRow?.full_name ?? ''
    after(async () => {
      try {
        const admin = createAdminClient()
        const { data: authUser } = await admin.auth.admin.getUserById(profileId)
        const email = authUser?.user?.email
        if (email) await sendApprovalEmail({ to: email, name })
      } catch { /* non-fatal */ }
    })
  }

  revalidatePath('/admin')
}

/** Admin assigns a role to a team member (volunteer / admin / embassy). */
export async function setProfileRole(formData: FormData) {
  await requireProfile(['tfa_admin'])
  const profileId   = String(formData.get('profile_id') ?? '')
  const role        = String(formData.get('role') ?? '')
  const designation = String(formData.get('designation') ?? '').trim() || null
  if (!profileId || !ROLES.includes(role as never)) return

  const supabase = await createClient()
  await supabase.from('profiles')
    .update({ role, designation: ['ifs_officer', 'embassy_abu_dhabi', 'embassy_dubai'].includes(role) ? designation : null })
    .eq('id', profileId)
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

/** Assign (or unassign) a case to a team member. */
export async function assignCase(formData: FormData) {
  const profile = await requireProfile([
    'tfa_admin',
    'embassy_abu_dhabi',
    'embassy_dubai',
  ])
  const caseId = String(formData.get('case_id') ?? '').trim()
  const assignedToRaw = String(formData.get('assigned_to') ?? '').trim()
  const assignedName = String(formData.get('assigned_name') ?? '').trim()
  if (!caseId) return

  const assignedToValue = assignedToRaw || null

  const supabase = await createClient()
  await supabase.from('cases').update({ assigned_to: assignedToValue }).eq('id', caseId)

  const note = assignedToValue
    ? `Case assigned to ${assignedName || assignedToValue}`
    : 'Case unassigned'

  await supabase.from('case_events').insert({
    case_id: caseId,
    actor: profile.id,
    event_type: 'edited',
    from_status: null,
    to_status: null,
    note,
  })

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/admin')
}

/** Add a private staff note to a case (never visible to volunteers). */
export async function addCaseNote(formData: FormData) {
  const profile = await requireProfile([
    'tfa_admin',
    'embassy_abu_dhabi',
    'embassy_dubai',
  ])
  const caseId = String(formData.get('case_id') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!caseId || !body) return

  const supabase = await createClient()
  await supabase.from('case_notes').insert({
    case_id: caseId,
    author_id: profile.id,
    body,
  })

  revalidatePath(`/cases/${caseId}`)
}

/** Send a status notification email to the reporter for the current case status. */
export async function notifyReporter(formData: FormData): Promise<{ ok: boolean }> {
  await requireProfile(['tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai'])
  const caseId = String(formData.get('case_id') ?? '')
  if (!caseId) return { ok: false }

  const supabase = await createClient()
  const { data: c } = await supabase
    .from('cases')
    .select('case_id, case_type, name, status, reporter_email, reporter_name, assigned_emirate, resolved_by, resolution_note, outcome')
    .eq('id', caseId)
    .single()

  if (!c?.reporter_email || !c.case_id) return { ok: false }

  const isResolved = c.status === 'resolved' || c.status === 'closed'
  after(async () => {
    try {
      const routing = await getEmailRouting()
      await sendStatusAckEmail({
        to:              c.reporter_email!,
        reporterName:    c.reporter_name ?? null,
        caseId:          c.case_id!,
        caseRowId:       caseId,
        caseType:        c.case_type,
        affectedName:    c.name ?? null,
        newStatus:       c.status,
        resolvedBy:      isResolved ? (c.resolved_by ?? null) : undefined,
        resolutionNote:  isResolved ? (c.resolution_note ?? null) : undefined,
        outcome:         isResolved ? (c.outcome ?? null) : undefined,
        assignedEmirate: c.assigned_emirate ?? null,
        abuDhabiEmail:   routing.EMAIL_ABU_DHABI,
        dubaiEmail:      routing.EMAIL_DUBAI,
      })
    } catch { /* non-fatal */ }
  })
  return { ok: true }
}

/**
 * Sends a follow-up status email to the reporter of a stale case and logs the
 * event in case_events. Called from the Stale Cases queue on the admin overview.
 */
export async function sendFollowUp(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const caseId = String(formData.get('case_id') ?? '')
  if (!caseId) return

  const supabase = await createClient()
  const { data: c } = await supabase
    .from('cases')
    .select('case_id, case_type, name, status, reporter_email, reporter_name, assigned_emirate')
    .eq('id', caseId)
    .single()

  if (!c) return

  // Send status acknowledgement email after response returns (non-blocking)
  if (c.reporter_email && c.case_id) {
    const snap = { ...c }
    after(async () => {
      try {
        const routing = await getEmailRouting()
        await sendStatusAckEmail({
          to:              snap.reporter_email!,
          reporterName:    snap.reporter_name ?? null,
          caseId:          snap.case_id!,
          caseRowId:       caseId,
          caseType:        snap.case_type,
          affectedName:    snap.name ?? null,
          newStatus:       snap.status,
          assignedEmirate: snap.assigned_emirate ?? null,
          abuDhabiEmail:   routing.EMAIL_ABU_DHABI,
          dubaiEmail:      routing.EMAIL_DUBAI,
        })
      } catch { /* non-fatal */ }
    })
  }

  // Log the follow-up event
  await supabase.from('case_events').insert({
    case_id:    caseId,
    actor:      profile.id,
    event_type: 'email_sent',
    note:       'Follow-up notification sent to reporter',
  })

  revalidatePath('/admin')
  revalidatePath(`/cases/${caseId}`)
}

/**
 * Suspends a profile with an explicit reason recorded in profiles.suspension_reason.
 */
export async function suspendWithReason(formData: FormData): Promise<void> {
  await requireProfile(['tfa_admin'])
  const profileId        = String(formData.get('profile_id') ?? '')
  const suspensionReason = String(formData.get('suspension_reason') ?? '').trim()
  if (!profileId) return

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ status: 'suspended', suspension_reason: suspensionReason || null })
    .eq('id', profileId)

  revalidatePath('/admin')
}

/**
 * Sends a manually composed email and records it in email_log.
 * Admin-only.
 */
export async function sendManualEmail(formData: FormData): Promise<void> {
  const profile   = await requireProfile(['tfa_admin'])
  const caseUUID  = String(formData.get('case_id') ?? '').trim() || null
  const toEmail   = String(formData.get('to_email') ?? '').trim()
  const subject   = String(formData.get('subject') ?? '').trim()
  const body      = String(formData.get('body') ?? '').trim()

  if (!toEmail || !subject || !body) return

  const result = await sendEmail({ to: toEmail, cc: [], subject, html: body.replace(/\n/g, '<br>') })
  const ok = 'sent' in result && result.sent === true
  const errorMsg = !ok && 'error' in result ? result.error : null

  const supabase = await createClient()
  await supabase.from('email_log').insert({
    case_id:      caseUUID,
    sent_by:      profile.id,
    to_email:     toEmail,
    subject,
    body_snippet: body.slice(0, 500),
    ok,
    error_msg:    errorMsg ?? null,
  })

  revalidatePath('/admin/comms')
}

/**
 * Permanently deletes a user from auth.users (cascades to profiles and all
 * their owned rows). Irreversible — admin only.
 */
export async function deleteUser(formData: FormData): Promise<void> {
  await requireProfile(['tfa_admin'])
  const profileId = String(formData.get('profile_id') ?? '').trim()
  if (!profileId) return

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(profileId)

  revalidatePath('/admin')
}

const SETTINGS_KEYS = [
  'sla_crisis_hours',
  'sla_standard_hours',
  'email_abu_dhabi',
  'email_dubai',
  'org_name',
  'org_address',
  'stale_threshold_days',
] as const

/**
 * Upserts all known app_settings keys from the form submission.
 * Admin-only. Redirects to /admin/settings?saved=1 on success.
 */
export async function saveSettings(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const supabase = await createClient()

  const upserts = SETTINGS_KEYS.map((key) => ({
    key,
    value:      String(formData.get(key) ?? '').trim(),
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }))

  await supabase
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' })

  revalidatePath('/admin/settings')
  redirect('/admin/settings?saved=1')
}

export async function approveOrganization(formData: FormData): Promise<void> {
  await requireProfile(['tfa_admin'])
  const orgId = String(formData.get('org_id') ?? '').trim()
  if (!orgId) return
  const admin = createAdminClient()
  await admin.from('organizations').update({ status: 'active' }).eq('id', orgId)
  revalidatePath('/admin')
}
