'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { EXPIRY_SECONDS, verifyActionToken } from '@/lib/email/action-token'
import { followUpDelayDays } from '@/lib/cases/follow-up-delays'
import { sendOfficerAssignmentEmail, sendReporterFollowUpNotification, sendStatusAckEmail } from '@/lib/email/send'
import { getEmailRouting } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Embassy official submits a free-text information request via the email link.
 * Verifies the token, updates the case to need_more_info, logs the message,
 * and sends a notification email to the reporter.
 */
export async function submitRequestInfo(formData: FormData): Promise<void> {
  const token   = String(formData.get('token') ?? '')
  const message = String(formData.get('message') ?? '').trim()

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'request-info') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  if (!message) {
    redirect(`/case-action/request-info?token=${encodeURIComponent(token)}&error=empty`)
  }

  const admin = createAdminClient()

  const { data: c } = await admin
    .from('cases')
    .select('status, case_id, case_type, name, reporter_email, reporter_name, assigned_emirate')
    .eq('id', payload.caseRowId)
    .single()

  if (!c) redirect('/case-action/success?action=error&reason=case-not-found')

  const terminal = ['resolved', 'closed']
  if (terminal.includes(c?.status ?? '')) {
    redirect('/case-action/success?action=error&reason=case-closed')
  }

  await admin
    .from('cases')
    .update({ status: 'need_more_info' })
    .eq('id', payload.caseRowId)

  await admin.from('case_events').insert({
    case_id:     payload.caseRowId,
    actor:       null,
    event_type:  'status_changed',
    from_status: c?.status ?? null,
    to_status:   'need_more_info',
    note:        message,
  })

  // Notify the reporter (non-blocking — redirect happens immediately)
  if (c?.reporter_email && c.case_id) {
    const snap = { ...c }
    after(async () => {
      try {
        const routing = await getEmailRouting()
        await sendStatusAckEmail({
          to:                 snap.reporter_email!,
          reporterName:       snap.reporter_name ?? null,
          caseId:             snap.case_id!,
          caseRowId:          payload.caseRowId,
          caseType:           snap.case_type,
          affectedName:       snap.name ?? null,
          newStatus:          'need_more_info',
          assignedEmirate:    snap.assigned_emirate ?? null,
          infoRequestMessage: message,
          abuDhabiEmail:      routing.EMAIL_ABU_DHABI,
          dubaiEmail:         routing.EMAIL_DUBAI,
        })
      } catch { /* non-fatal */ }
    })
  }

  redirect('/case-action/success?action=request-info')
}

/**
 * Embassy official confirms the case is being handled in-house.
 * Verifies the token, updates the case to in_progress, logs it,
 * and sends a notification email to the reporter.
 */
export async function confirmUnderProcess(formData: FormData): Promise<void> {
  const token             = String(formData.get('token') ?? '')
  const assignedOfficerId = String(formData.get('assigned_officer') ?? '').trim() || null

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'under-process') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  const admin = createAdminClient()

  const { data: c } = await admin
    .from('cases')
    .select('status, case_id, case_type, name, reporter_email, reporter_name, assigned_emirate')
    .eq('id', payload.caseRowId)
    .single()

  if (!c) redirect('/case-action/success?action=error&reason=case-not-found')

  const terminal = ['resolved', 'closed']
  if (terminal.includes(c?.status ?? '')) {
    redirect('/case-action/success?action=error&reason=case-closed')
  }

  // Fetch the assigned officer's profile + email if one was selected
  let officerName: string | null = null
  let officerEmail: string | null = null
  if (assignedOfficerId) {
    const [{ data: officerProfile }, { data: { user: officerUser } }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', assignedOfficerId).single(),
      admin.auth.admin.getUserById(assignedOfficerId),
    ])
    officerName  = officerProfile?.full_name ?? null
    officerEmail = officerUser?.email ?? null
  }

  await admin
    .from('cases')
    .update({
      status: 'in_progress',
      ...(assignedOfficerId ? { assigned_officer: assignedOfficerId } : {}),
    })
    .eq('id', payload.caseRowId)

  const assignmentNote = assignedOfficerId && officerName
    ? `Marked as under process by embassy via email link · Assigned to ${officerName}`
    : 'Marked as under process by embassy via email link'

  await admin.from('case_events').insert({
    case_id:     payload.caseRowId,
    actor:       null,
    event_type:  'status_changed',
    from_status: c?.status ?? null,
    to_status:   'in_progress',
    note:        assignmentNote,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  // Non-blocking: notify reporter + assigned officer
  const snap = { ...c }
  after(async () => {
    try {
      const routing = await getEmailRouting()
      if (snap.reporter_email && snap.case_id) {
        await sendStatusAckEmail({
          to:              snap.reporter_email,
          reporterName:    snap.reporter_name ?? null,
          caseId:          snap.case_id,
          caseRowId:       payload.caseRowId,
          caseType:        snap.case_type,
          affectedName:    snap.name ?? null,
          newStatus:       'in_progress',
          assignedEmirate: snap.assigned_emirate ?? null,
          abuDhabiEmail:   routing.EMAIL_ABU_DHABI,
          dubaiEmail:      routing.EMAIL_DUBAI,
        })
      }
      if (officerEmail && snap.case_id) {
        await sendOfficerAssignmentEmail({
          to:           officerEmail,
          officerName,
          caseId:       snap.case_id,
          caseType:     snap.case_type,
          affectedName: snap.name ?? null,
          appUrl,
        })
      }
    } catch { /* non-fatal */ }
  })

  redirect('/case-action/success?action=under-process')
}

/**
 * Reporter submits a follow-up request via the time-locked email link.
 * Verifies the token, enforces the case-type delay, records the event,
 * and emails the TFA admin team.
 */
export async function submitReporterFollowUp(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '')

  const payload = verifyActionToken(token)
  if (!payload || payload.action !== 'reporter-follow-up') {
    redirect('/case-action/success?action=error&reason=invalid-token')
  }

  // Re-enforce time lock server-side.
  const dot = token.lastIndexOf('.')
  const payloadStr = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')
  const expiry = parseInt(payloadStr.split('|')[2] ?? '0', 10)
  const issuedAt = expiry - EXPIRY_SECONDS

  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('status, case_id, case_type, name, reporter_name, reporter_phone')
    .eq('id', payload.caseRowId)
    .single()

  if (!c) redirect('/case-action/success?action=error&reason=case-not-found')

  const delayDays = followUpDelayDays(c?.case_type ?? '')
  const availableAt = issuedAt + delayDays * 86400
  if (Math.floor(Date.now() / 1000) < availableAt) {
    redirect('/case-action/success?action=error&reason=too-early')
  }

  const terminal = ['resolved', 'closed']
  if (terminal.includes(c?.status ?? '')) {
    redirect('/case-action/success?action=error&reason=case-closed')
  }

  await admin.from('case_events').insert({
    case_id:    payload.caseRowId,
    actor:      null,
    event_type: 'reporter_follow_up',
    note:       'Reporter requested a status update via follow-up email link',
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  const snap = { ...c }
  after(async () => {
    try {
      await sendReporterFollowUpNotification({
        caseId:        snap.case_id ?? payload.caseRowId,
        caseRowId:     payload.caseRowId,
        caseType:      snap.case_type,
        affectedName:  snap.name ?? null,
        reporterName:  snap.reporter_name ?? null,
        reporterPhone: snap.reporter_phone ?? null,
        appUrl,
      })
    } catch { /* non-fatal */ }
  })

  redirect('/case-action/success?action=reporter-follow-up')
}
