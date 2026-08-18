'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { requireProfile } from '@/lib/auth'
import { finalizeCase, resendCaseEmail } from '@/lib/cases/finalize'
import { sendApprovalEmail, sendCaseReturnedEmail, sendEmail, sendStatusAckEmail } from '@/lib/email/send'
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
    'ifs_officer',
  ])
  const caseId = String(formData.get('case_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!caseId || !CASE_STATUSES.includes(status as never)) return

  const resolvedBy     = String(formData.get('resolved_by')       ?? '').trim()
  const note           = String(formData.get('resolution_note')   ?? '').trim()
  const infoRequestMsg = String(formData.get('info_request_message') ?? '').trim()
  const isResolution   = status === 'resolved' || status === 'closed'
  const isMoreInfo     = status === 'need_more_info'
  const isAck          = status === 'acknowledged'

  // Regular client for reads (RLS lets embassy see their cases).
  // Admin client for all writes — access is already gated by requireProfile above,
  // consistent with claimCase / escalateCase / referCaseToOfficer.
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: before } = await supabase
    .from('cases')
    .select('status, case_id, case_type, name, reporter_email, reporter_name, assigned_emirate, assigned_officer')
    .eq('id', caseId)
    .single()

  // IFS officers can only update status on cases explicitly assigned to them.
  if (profile.role === 'ifs_officer' && (before as any)?.assigned_officer !== profile.id) {
    throw new Error('You can only update status on cases assigned to you.')
  }

  // Resolve the assigned officer's name for the volunteer status email
  let handlingOfficer: string | null = null
  if ((before as any)?.assigned_officer) {
    const { data: officer } = await admin
      .from('profiles')
      .select('full_name, designation')
      .eq('id', (before as any).assigned_officer)
      .single()
    if (officer) {
      handlingOfficer = officer.full_name ?? null
      if (officer.designation) handlingOfficer = `${handlingOfficer}, ${officer.designation}`
    }
  }

  const outcome = String(formData.get('outcome') ?? '').trim()
  const update: Record<string, unknown> = { status }
  if (isResolution) {
    update.resolved_by = resolvedBy || null
    update.resolution_note = note || null
    update.outcome = outcome || null
  }
  const { error: updateError } = await admin.from('cases').update(update).eq('id', caseId)
  if (updateError) throw new Error(`Status update failed: ${updateError.message}`)

  await admin.from('case_events').insert({
    case_id: caseId,
    actor: profile.id,
    event_type: 'status_changed',
    from_status: before?.status ?? null,
    to_status: status,
    note:
      (isMoreInfo && infoRequestMsg)
        ? infoRequestMsg
        : note ||
          (isResolution && resolvedBy ? `Handled by ${resolvedBy}` : null) ||
          (isAck && resolvedBy ? `Acknowledged by ${resolvedBy}` : null),
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
      handlingOfficer:    handlingOfficer,
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
  const fullName    = String(formData.get('full_name')    ?? '').trim() || null
  const dashboardView = String(formData.get('dashboard_view') ?? '').trim() || null
  const gender        = String(formData.get('gender')        ?? '').trim() || null
  const validViews   = ['embassy_all', 'embassy_assigned', 'ambassador'] as const
  const validGenders = ['male', 'female'] as const
  if (!profileId || !ROLES.includes(role as never)) return

  const diplomaticRole = ['ambassador', 'ifs_officer', 'embassy_abu_dhabi', 'embassy_dubai'].includes(role)
  const supabase = await createClient()
  await supabase.from('profiles')
    .update({
      role,
      designation: diplomaticRole ? designation : null,
      ...(fullName ? { full_name: fullName } : {}),
      ...(validViews.includes(dashboardView as typeof validViews[number]) ? { dashboard_view: dashboardView } : {}),
      ...(diplomaticRole && validGenders.includes(gender as typeof validGenders[number]) ? { gender } : {}),
    })
    .eq('id', profileId)
  revalidatePath('/admin')
}

/** Admin updates a profile's display name. */
export async function updateProfileName(formData: FormData) {
  await requireProfile(['tfa_admin'])
  const profileId = String(formData.get('profile_id') ?? '')
  const fullName  = String(formData.get('full_name')  ?? '').trim()
  if (!profileId || !fullName) return

  const supabase = await createClient()
  await supabase.from('profiles').update({ full_name: fullName }).eq('id', profileId)
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

const SETTINGS_META: { key: string; label: string }[] = [
  { key: 'sla_crisis_hours',      label: 'Crisis SLA (hours)' },
  { key: 'sla_standard_hours',    label: 'Standard SLA (hours)' },
  { key: 'email_abu_dhabi',       label: 'Abu Dhabi embassy email' },
  { key: 'email_dubai',           label: 'Dubai embassy email' },
  { key: 'org_name',              label: 'Organisation name' },
  { key: 'org_address',           label: 'Organisation address' },
  { key: 'stale_threshold_days',  label: 'Stale case threshold (days)' },
]

/**
 * Upserts all known app_settings keys from the form submission.
 * Admin-only. Redirects to /admin/settings?saved=1 on success.
 */
export async function saveSettings(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const admin = createAdminClient()

  const upserts = SETTINGS_META.map(({ key, label }) => ({
    key,
    label,
    value:      String(formData.get(key) ?? '').trim(),
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }))

  await admin
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' })

  revalidatePath('/admin/settings')
  redirect('/admin/settings?saved=1')
}

/**
 * Admin approves a case in the review queue — assigns case ID, runs AI summary,
 * and sends the Embassy email. Identical to the path admin submissions take.
 */
export async function approveCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const caseRowId = String(formData.get('case_id') ?? '').trim()
  if (!caseRowId) return

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('status')
    .eq('id', caseRowId)
    .single()
  if (!c || c.status !== 'pending_review') return

  await admin.from('case_events').insert({
    case_id:     caseRowId,
    actor:       profile.id,
    event_type:  'admin_approved',
    from_status: 'pending_review',
    to_status:   'sent',
  })

  await finalizeCase(caseRowId)
  revalidatePath('/admin')
}

/**
 * Admin returns a case to the volunteer with a specific note about what to fix.
 */
export async function returnCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const caseRowId = String(formData.get('case_id') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  if (!caseRowId || !note) return

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('status, case_id, case_type, reporter_email, reporter_name')
    .eq('id', caseRowId)
    .single()
  if (!c || c.status !== 'pending_review') return

  await admin
    .from('cases')
    .update({ status: 'needs_attention', admin_return_note: note })
    .eq('id', caseRowId)

  await admin.from('case_events').insert({
    case_id:     caseRowId,
    actor:       profile.id,
    event_type:  'admin_returned',
    from_status: 'pending_review',
    to_status:   'needs_attention',
    note,
  })

  if (c.reporter_email) {
    const snap = { ...c }
    after(async () => {
      try {
        await sendCaseReturnedEmail({
          to:           snap.reporter_email!,
          reporterName: snap.reporter_name ?? null,
          caseId:       snap.case_id ?? null,
          caseRowId,
          caseType:     snap.case_type,
          adminNote:    note,
        })
      } catch { /* non-fatal */ }
    })
  }

  revalidatePath('/admin')
}

const VALID_SEVERITIES = ['Critical', 'High', 'Normal'] as const

export async function updateCasePriority(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin'])
  const caseId   = String(formData.get('case_id')  ?? '').trim()
  const severity = String(formData.get('priority')  ?? '').trim()
  if (!caseId || !VALID_SEVERITIES.includes(severity as never)) return

  const supabase = await createClient()
  const { data: c } = await supabase.from('cases').select('details').eq('id', caseId).single()
  if (!c) return

  const details = { ...(c.details as Record<string, unknown>), volunteer_severity: severity }
  await supabase.from('cases').update({ details }).eq('id', caseId)

  await supabase.from('case_events').insert({
    case_id:    caseId,
    actor:      profile.id,
    event_type: 'priority_updated',
    note:       `Priority set to ${severity} by admin`,
  })

  revalidatePath(`/cases/${caseId}`)
}

export async function approveOrganization(formData: FormData): Promise<void> {
  await requireProfile(['tfa_admin'])
  const orgId = String(formData.get('org_id') ?? '').trim()
  if (!orgId) return
  const admin = createAdminClient()
  await admin.from('organizations').update({ status: 'active' }).eq('id', orgId)
  revalidatePath('/admin')
}

/**
 * Embassy officer self-assigns to a case. Records who is handling it so the
 * assignment shows on the case page and in volunteer status emails.
 */
export async function claimCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai', 'ambassador', 'ifs_officer'])
  const caseId = String(formData.get('case_id') ?? '').trim()
  if (!caseId) return

  const admin = createAdminClient()
  await admin.from('cases').update({ assigned_officer: profile.id }).eq('id', caseId)
  await admin.from('case_events').insert({
    case_id:    caseId,
    actor:      profile.id,
    event_type: 'officer_claimed',
    note: `Assigned to ${profile.full_name ?? 'officer'}${profile.designation ? ` (${profile.designation})` : ''}`,
  })
  revalidatePath(`/cases/${caseId}`)
}

/**
 * Embassy staff refer a case to a specific colleague.
 * Updates assigned_officer and records a timeline event.
 */
export async function referCaseToOfficer(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai', 'ambassador', 'ifs_officer'])
  const caseId    = String(formData.get('case_id')    ?? '').trim()
  const officerId = String(formData.get('officer_id') ?? '').trim()
  if (!caseId || !officerId) return

  const admin = createAdminClient()
  const { data: officer } = await admin
    .from('profiles')
    .select('full_name, designation')
    .eq('id', officerId)
    .single()

  await admin.from('cases').update({ assigned_officer: officerId }).eq('id', caseId)
  await admin.from('case_events').insert({
    case_id:    caseId,
    actor:      profile.id,
    event_type: 'officer_claimed',
    note: `Referred to ${officer?.full_name ?? 'officer'}${(officer as any)?.designation ? ` (${(officer as any).designation})` : ''} by ${profile.full_name ?? 'staff'}`,
  })
  revalidatePath(`/cases/${caseId}`)
}

/**
 * Transfer a case from its current emirate to the other one. Updates routing,
 * sends a notification email to the receiving mission, and records the transfer
 * in the case timeline.
 */
export async function escalateCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai', 'ambassador', 'ifs_officer'])
  const caseId       = String(formData.get('case_id')       ?? '').trim()
  const targetEmirate = String(formData.get('target_emirate') ?? '').trim()
  if (!caseId || !['Abu Dhabi', 'Dubai'].includes(targetEmirate)) return

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_id, case_type, name, assigned_emirate')
    .eq('id', caseId)
    .single()
  if (!c || c.assigned_emirate === targetEmirate) return

  // visa_emirate drives computeRecipients; assigned_emirate drives the display
  const visaEmirate = targetEmirate === 'Abu Dhabi' ? 'Abu Dhabi' : 'Other Emirates'
  await admin.from('cases').update({ assigned_emirate: targetEmirate, visa_emirate: visaEmirate }).eq('id', caseId)

  await admin.from('case_events').insert({
    case_id:    caseId,
    actor:      profile.id,
    event_type: 'case_transferred',
    note: `Case transferred from ${c.assigned_emirate} to ${targetEmirate} by ${profile.full_name ?? 'officer'}`,
  })

  // Notify the receiving mission
  const emailRouting = await getEmailRouting()
  const recipientEmail = targetEmirate === 'Abu Dhabi'
    ? emailRouting.EMAIL_ABU_DHABI
    : emailRouting.EMAIL_DUBAI

  if (recipientEmail && c.case_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const caseLink = appUrl
      ? `<p><a href="${appUrl}/cases/${caseId}" style="color:#0C447C;font-weight:600">View case ${c.case_id} in Ashraya →</a></p>`
      : ''
    try {
      await sendEmail({
        to:      recipientEmail,
        cc:      [],
        subject: `Case transferred to ${targetEmirate} Mission — ${c.case_id} (${c.case_type})`,
        html: `<p>Dear ${targetEmirate} Mission Team,</p>
<p>Case <strong>${c.case_id}</strong>${c.name ? ` (${c.name})` : ''} — <em>${c.case_type}</em> — has been transferred to your jurisdiction for further handling.</p>
<p><strong>Transferred by:</strong> ${profile.full_name ?? 'Embassy officer'}${profile.designation ? `, ${profile.designation}` : ''}</p>
${caseLink}
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
      })
    } catch { /* non-fatal */ }
  }

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/admin')
  revalidatePath('/embassy')
}

export type InviteUserState = { ok: boolean; error?: string; email?: string } | null

/**
 * Invite a user by email — sends them a Supabase invitation email so they can
 * set their own password. The account is pre-configured with the given role and
 * name so no further approval step is needed. Admin-only.
 */
export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  await requireProfile(['tfa_admin'])
  const email    = String(formData.get('email')     ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const role     = String(formData.get('role')      ?? '').trim()

  if (!email || !fullName || !role) return { ok: false, error: 'All fields are required.' }
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { ok: false, error: 'Invalid role.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true, email }
}
