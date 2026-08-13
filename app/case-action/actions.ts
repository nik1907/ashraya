'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { verifyActionToken } from '@/lib/email/action-token'
import { sendStatusAckEmail } from '@/lib/email/send'
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
  const token = String(formData.get('token') ?? '')

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

  await admin
    .from('cases')
    .update({ status: 'in_progress' })
    .eq('id', payload.caseRowId)

  await admin.from('case_events').insert({
    case_id:     payload.caseRowId,
    actor:       null,
    event_type:  'status_changed',
    from_status: c?.status ?? null,
    to_status:   'in_progress',
    note:        'Marked as under process by embassy via email link',
  })

  // Notify the reporter (non-blocking — redirect happens immediately)
  if (c?.reporter_email && c.case_id) {
    const snap = { ...c }
    after(async () => {
      try {
        const routing = await getEmailRouting()
        await sendStatusAckEmail({
          to:              snap.reporter_email!,
          reporterName:    snap.reporter_name ?? null,
          caseId:          snap.case_id!,
          caseRowId:       payload.caseRowId,
          caseType:        snap.case_type,
          affectedName:    snap.name ?? null,
          newStatus:       'in_progress',
          assignedEmirate: snap.assigned_emirate ?? null,
          abuDhabiEmail:   routing.EMAIL_ABU_DHABI,
          dubaiEmail:      routing.EMAIL_DUBAI,
        })
      } catch { /* non-fatal */ }
    })
  }

  redirect('/case-action/success?action=under-process')
}
