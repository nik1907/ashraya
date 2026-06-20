import 'server-only'

import { polishDescription } from '@/lib/ai/polish'
import { formatCaseId, ddmmyy } from '@/lib/caseId'
import { buildEmailHtml, buildSubject } from '@/lib/email/template'
import { computeRecipients, sendEmail } from '@/lib/email/send'
import { ATTACHMENT_BUCKET } from '@/lib/storage'
import { createAdminClient } from '@/lib/supabase/admin'

export type FinalizeResult =
  | { ok: true; caseId: string; emailed: boolean }
  | { ok: false; reason: string }

/**
 * Assign a case ID, generate the AI summary, send the embassy email, and update
 * the case. Trusted backend step — uses the service-role client so it works for
 * any submitter. No-ops (leaving the case as 'submitted') if the service-role
 * key isn't configured yet.
 */
export async function finalizeCase(caseRowId: string): Promise<FinalizeResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: 'Service-role key not configured' }
  }

  const admin = createAdminClient()

  const { data: c, error } = await admin
    .from('cases')
    .select('*')
    .eq('id', caseRowId)
    .single()
  if (error || !c) {
    return { ok: false, reason: error?.message ?? 'Case not found' }
  }
  if (c.case_id) {
    // Already finalized (avoid duplicate IDs / emails).
    return { ok: true, caseId: c.case_id, emailed: !!c.email_sent_at }
  }

  // Resolve the NGO that owns this case (abbreviation drives the ID, name signs
  // the email). Fall back to TFA defaults if not set (legacy rows).
  let abbreviation = 'TFA'
  let orgName = 'Telangana Friends Association'
  if (c.org_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('name, abbreviation')
      .eq('id', c.org_id)
      .single()
    if (org) {
      abbreviation = org.abbreviation
      orgName = org.name
    }
  }

  const now = new Date()

  // Per-NGO daily sequence: how many of THIS NGO's cases got an ID today.
  let seqQuery = admin
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .like('case_id', `${abbreviation}-${ddmmyy(now)}-%`)
  if (c.org_id) seqQuery = seqQuery.eq('org_id', c.org_id)
  const { count } = await seqQuery
  const caseId = formatCaseId(abbreviation, c.case_type, (count ?? 0) + 1, now)

  const polished = await polishDescription({
    description: c.raw_description ?? '',
    caseType: c.case_type,
    name: c.name,
    passport: c.passport,
    eid: c.eid,
    phone: c.phone,
    gender: c.gender,
    age: c.age,
    reporterName: c.reporter_name,
    reporterPhone: c.reporter_phone,
    details: (c.details ?? {}) as Record<string, unknown>,
  })

  // Signed links to attachments for the email body.
  const { data: attachmentRows } = await admin
    .from('attachments')
    .select('label, storage_path')
    .eq('case_id', caseRowId)
  const attachments: { label: string; url: string }[] = []
  for (const a of attachmentRows ?? []) {
    const { data: signed } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(a.storage_path, 60 * 60 * 24 * 7)
    if (signed?.signedUrl) attachments.push({ label: a.label, url: signed.signedUrl })
  }

  const emailInput = {
    org_name: orgName,
    case_id: caseId,
    case_type: c.case_type,
    date_of_incident: c.date_of_incident,
    name: c.name,
    gender: c.gender,
    age: c.age,
    passport: c.passport,
    eid: c.eid,
    phone: c.phone,
    company_name: c.company_name,
    company_phone: c.company_phone,
    company_email: c.company_email,
    company_location: c.company_location,
    reporter_name: c.reporter_name,
    reporter_passport: c.reporter_passport,
    reporter_eid: c.reporter_eid,
    reporter_phone: c.reporter_phone,
    reporter_email: c.reporter_email,
    details: (c.details ?? {}) as Record<string, unknown>,
    polished_summary: polished,
    attachments,
  }

  const recipients = computeRecipients(c.visa_emirate ?? c.reporting_emirate, c.reporter_email)
  const result = await sendEmail({
    to: recipients.to,
    cc: recipients.cc,
    subject: buildSubject(emailInput),
    html: buildEmailHtml(emailInput),
  })
  const emailed = result.sent

  await admin
    .from('cases')
    .update({
      case_id: caseId,
      polished_summary: polished,
      status: emailed ? 'sent' : 'submitted',
      email_sent_at: emailed ? now.toISOString() : null,
    })
    .eq('id', caseRowId)

  if (emailed) {
    await admin.from('case_events').insert({
      case_id: caseRowId,
      actor: c.created_by,
      event_type: 'email_sent',
      to_status: 'sent',
      note: `Emailed ${recipients.to}`,
    })
  }

  return { ok: true, caseId, emailed }
}

/**
 * Re-send the embassy email for an already-finalized case (e.g. the first send
 * failed, or an admin wants to resend). Reuses the existing summary — does NOT
 * re-call the AI or change the case ID.
 */
export async function resendCaseEmail(
  caseRowId: string,
  actorId: string,
): Promise<FinalizeResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: 'Service-role key not configured' }
  }
  const admin = createAdminClient()

  const { data: c, error } = await admin
    .from('cases')
    .select('*')
    .eq('id', caseRowId)
    .single()
  if (error || !c) return { ok: false, reason: error?.message ?? 'Case not found' }

  let orgName = 'Telangana Friends Association'
  if (c.org_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', c.org_id)
      .single()
    if (org) orgName = org.name
  }

  const { data: attachmentRows } = await admin
    .from('attachments')
    .select('label, storage_path')
    .eq('case_id', caseRowId)
  const attachments: { label: string; url: string }[] = []
  for (const a of attachmentRows ?? []) {
    const { data: signed } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(a.storage_path, 60 * 60 * 24 * 7)
    if (signed?.signedUrl) attachments.push({ label: a.label, url: signed.signedUrl })
  }

  const emailInput = {
    org_name: orgName,
    case_id: c.case_id,
    case_type: c.case_type,
    date_of_incident: c.date_of_incident,
    name: c.name,
    gender: c.gender,
    age: c.age,
    passport: c.passport,
    eid: c.eid,
    phone: c.phone,
    company_name: c.company_name,
    company_phone: c.company_phone,
    company_email: c.company_email,
    company_location: c.company_location,
    reporter_name: c.reporter_name,
    reporter_passport: c.reporter_passport,
    reporter_eid: c.reporter_eid,
    reporter_phone: c.reporter_phone,
    reporter_email: c.reporter_email,
    details: (c.details ?? {}) as Record<string, unknown>,
    polished_summary: c.polished_summary ?? c.raw_description ?? '',
    attachments,
  }

  const recipients = computeRecipients(c.visa_emirate ?? c.reporting_emirate, c.reporter_email)
  const result = await sendEmail({
    to: recipients.to,
    cc: recipients.cc,
    subject: buildSubject(emailInput),
    html: buildEmailHtml(emailInput),
  })
  if (!result.sent) {
    return {
      ok: false,
      reason: result.skipped ? result.reason : result.error,
    }
  }

  const nowIso = new Date().toISOString()
  await admin
    .from('cases')
    .update({ status: 'sent', email_sent_at: nowIso })
    .eq('id', caseRowId)
  await admin.from('case_events').insert({
    case_id: caseRowId,
    actor: actorId,
    event_type: 'email_sent',
    to_status: 'sent',
    note: `Re-sent to ${recipients.to}`,
  })

  return { ok: true, caseId: c.case_id ?? '', emailed: true }
}
