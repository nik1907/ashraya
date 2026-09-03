'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { requireProfile } from '@/lib/auth'
import {
  COMMON_ATTACHMENTS,
  getCaseType,
  type FieldDef,
  REPORTING_EMIRATES,
} from '@/lib/caseConfig'
import { finalizeCase } from '@/lib/cases/finalize'
import { runPrescreening } from '@/lib/cases/prescreening-runner'
import { sendCaseSubmittedEmail, sendEmail, sendInfoResponseAdminNotification, sendNewCaseAdminAlert, sendResubmitAdminNotification } from '@/lib/email/send'
import { getEmailRouting } from '@/lib/settings'
import { ATTACHMENT_BUCKET } from '@/lib/storage'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCase } from '@/lib/validation'

export type SubmitState = { error: string | null }

/** Save form progress as a draft. Called via button formAction — no useActionState. */
export async function saveDraft(formData: FormData): Promise<void> {
  const profile = await requireProfile(['volunteer', 'tfa_admin'])
  if (profile.status !== 'active') redirect('/dashboard')

  const draftId = String(formData.get('draft_id') ?? '').trim() || null

  // Collect all string fields into the JSON blob (file uploads are not saved).
  const data: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (key !== 'draft_id' && typeof value === 'string' && value !== '') {
      data[key] = value
    }
  }

  const name = (data.name ?? '').trim()
  const caseType = (data.case_type ?? '').trim()
  const label = [caseType, name].filter(Boolean).join(' — ').slice(0, 60) || 'Untitled draft'

  const supabase = await createClient()
  let resultId = draftId

  if (draftId) {
    await supabase
      .from('case_drafts')
      .update({ form_data: data, label, updated_at: new Date().toISOString() })
      .eq('id', draftId)
  } else {
    const { data: row } = await supabase
      .from('case_drafts')
      .insert({ created_by: profile.id, org_id: profile.org_id, form_data: data, label })
      .select('id')
      .single()
    resultId = row?.id ?? null
  }

  if (resultId) {
    redirect(`/cases/draft/${resultId}`)
  } else {
    redirect('/dashboard')
  }
}

/** Delete a draft by id (called after a draft is successfully submitted). */
async function deleteDraft(supabase: Awaited<ReturnType<typeof createClient>>, draftId: string) {
  await supabase.from('case_drafts').delete().eq('id', draftId)
}

/** Read and coerce one detail field from the submitted form. */
function readDetail(formData: FormData, field: FieldDef): unknown {
  const raw = formData.get(`detail__${field.key}`)
  if (raw === null || raw === '') return null
  const value = String(raw)
  switch (field.type) {
    case 'boolean':
      return value === 'Yes' ? true : value === 'No' ? false : null
    case 'number': {
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    }
    default:
      return value
  }
}

export async function submitCase(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  // Only an active volunteer or admin may file a case.
  const profile = await requireProfile(['volunteer', 'tfa_admin'])
  if (profile.status !== 'active') {
    return { error: 'Your account is not active yet.' }
  }

  const caseTypeValue = String(formData.get('case_type') ?? '')
  const caseType = getCaseType(caseTypeValue)
  if (!caseType) {
    return { error: 'Please choose a valid case type.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const victimEmail = String(formData.get('email') ?? '').trim()
  const reporterName = String(formData.get('reporter_name') ?? '').trim()
  const reporterPhone = String(formData.get('reporter_phone') ?? '').trim()
  const reporterPassport = String(formData.get('reporter_passport') ?? '').trim()
  const reporterEid = String(formData.get('reporter_eid') ?? '').trim()
  const reporterEmail = String(formData.get('reporter_email') ?? '').trim()
  const description = String(formData.get('raw_description') ?? '').trim()

  const reportingEmirate = String(formData.get('reporting_emirate') ?? 'Abu Dhabi')
  if (!REPORTING_EMIRATES.includes(reportingEmirate as never)) {
    return { error: 'Invalid reporting emirate.' }
  }

  const VISA_EMIRATES = ['Abu Dhabi', 'Other Emirates'] as const
  const visaEmirate = String(formData.get('visa_emirate') ?? 'Abu Dhabi')
  if (!VISA_EMIRATES.includes(visaEmirate as never)) {
    return { error: 'Invalid visa / residence emirate.' }
  }

  // Numeric case-type fields → checked for ">= 0".
  const detailNumbers = caseType.fields
    .filter((f) => f.type === 'number')
    .map((f) => ({
      label: f.label,
      value: String(formData.get(`detail__${f.key}`) ?? ''),
    }))

  const validationError = validateCase({
    name,
    description,
    age: String(formData.get('age') ?? '') || null,
    passport: String(formData.get('passport') ?? '') || null,
    eid: String(formData.get('eid') ?? '') || null,
    phone: String(formData.get('phone') ?? '') || null,
    companyEmail: String(formData.get('company_email') ?? '') || null,
    companyPhone: String(formData.get('company_phone') ?? '') || null,
    dateOfIncident: (formData.get('date_of_incident') as string) || null,
    reporterName,
    reporterPhone,
    reporterEmail: reporterEmail || null,
    reporterPassport: reporterPassport || null,
    reporterEid: reporterEid || null,
    detailNumbers,
  })
  if (validationError) return { error: validationError }

  // assigned_emirate scopes which embassy dashboard owns the case —
  // follows where the reporter is (reporting_emirate), matching the main TO email.
  const assignedEmirate = reportingEmirate === 'Other emirates' ? 'Dubai' : 'Abu Dhabi'

  // Collect case-type-specific answers, trusting the config (not the client)
  // for which keys belong to this case type.
  const details: Record<string, unknown> = {}
  for (const field of caseType.fields) {
    const v = readDetail(formData, field)
    if (v !== null) details[field.key] = v
  }

  // Volunteer-assessed urgency (optional — overrides auto-priority in the email).
  const volunteerSeverity = String(formData.get('volunteer_severity') ?? '').trim()
  if (volunteerSeverity && ['Critical', 'High', 'Normal'].includes(volunteerSeverity)) {
    details.volunteer_severity = volunteerSeverity
  }

  const ageRaw = formData.get('age')
  const age = ageRaw ? Number(ageRaw) : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_type: caseType.value,
      status: profile.role === 'tfa_admin' ? 'submitted' : 'pending_review',
      reporting_emirate: reportingEmirate,
      visa_emirate: visaEmirate,
      assigned_emirate: assignedEmirate,
      date_of_incident: formData.get('date_of_incident') || null,
      name,
      gender: String(formData.get('gender') ?? '') || null,
      age: Number.isFinite(age) ? age : null,
      passport: String(formData.get('passport') ?? '') || null,
      eid: String(formData.get('eid') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      email: victimEmail || null,
      company_name: String(formData.get('company_name') ?? '') || null,
      company_phone: String(formData.get('company_phone') ?? '') || null,
      company_email: String(formData.get('company_email') ?? '') || null,
      company_location: String(formData.get('company_location') ?? '') || null,
      reporter_name: reporterName,
      reporter_passport: reporterPassport || null,
      reporter_eid: reporterEid || null,
      reporter_phone: reporterPhone,
      reporter_email: reporterEmail || null,
      raw_description: description,
      details,
      created_by: profile.id,
      org_id: profile.org_id,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Upload any attached files to Storage and record them. Paths are scoped by
  // case id so storage access rules can mirror case access rules.
  const slots = [...caseType.attachments, ...COMMON_ATTACHMENTS]
  for (const slot of slots) {
    const file = formData.get(`file__${slot.key}`)
    if (!(file instanceof File) || file.size === 0) continue

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${data.id}/${slot.key}-${safeName}`

    const { error: upErr } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { upsert: false })
    if (upErr) continue

    await supabase.from('attachments').insert({
      case_id: data.id,
      slot_key: slot.key,
      label: slot.label,
      storage_path: path,
    })
  }

  const submittedStatus = profile.role === 'tfa_admin' ? 'submitted' : 'pending_review'

  // Audit trail: record the submission.
  await supabase.from('case_events').insert({
    case_id: data.id,
    actor: profile.id,
    event_type: 'submitted',
    to_status: submittedStatus,
  })

  // If submitted from a saved draft, remove it now.
  const draftId = String(formData.get('draft_id') ?? '').trim()
  if (draftId) {
    await deleteDraft(supabase, draftId)
  }

  // Admin submissions bypass the review queue — finalize immediately.
  // Volunteer submissions hold for admin review with AI pre-screening.
  // Emails and pipeline run in background so the user sees the case page immediately.
  after(async () => {
    // Confirm receipt to the volunteer
    if (reporterEmail) {
      try {
        await sendCaseSubmittedEmail({
          to: reporterEmail,
          reporterName,
          caseType: caseType.value,
          affectedName: name || null,
          caseRowId: data.id,
        })
      } catch {}
    }

    // Alert the admin that a new case is waiting for review
    if (profile.role !== 'tfa_admin') {
      try {
        await sendNewCaseAdminAlert({
          reporterName,
          caseType: caseType.value,
          affectedName: name || null,
          caseRowId: data.id,
          volunteerSeverity: String(formData.get('volunteer_severity') ?? '') || null,
        })
      } catch {}
    }

    // Run the processing pipeline
    if (profile.role === 'tfa_admin') {
      await finalizeCase(data.id)
    } else {
      await runPrescreening(data.id)
    }
  })

  redirect(`/cases/${data.id}`)
}

/**
 * Volunteer submits additional information in response to an embassy
 * info request. Saves a case_event, uploads any files, and emails the
 * assigned embassy so they know the ball is back in their court.
 */
export async function submitInfoResponse(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile()
  const caseId  = String(formData.get('case_id')  ?? '').trim()
  const message = String(formData.get('message')   ?? '').trim()

  if (!caseId || !message) return { ok: false, error: 'Message is required' }

  const supabase = await createClient()

  // RLS ensures volunteers can only fetch their own cases
  const { data: c } = await supabase
    .from('cases')
    .select('case_id, case_type, name, status, assigned_emirate, reporter_email, reporter_name')
    .eq('id', caseId)
    .single()

  if (!c) return { ok: false, error: 'Case not found' }
  if (c.status !== 'need_more_info') return { ok: false, error: 'Case is not awaiting information' }

  // Upload attached files via admin client (bypasses storage RLS)
  const admin = createAdminClient()
  const files = formData.getAll('files') as File[]
  const uploadedNames: string[] = []

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${caseId}/response-${Date.now()}-${safeName}`
    const bytes = await file.arrayBuffer()

    const { error: upErr } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, bytes, { contentType: file.type || 'application/octet-stream' })

    if (!upErr) {
      await supabase.from('attachments').insert({
        case_id:      caseId,
        label:        file.name,
        storage_path: path,
      })
      uploadedNames.push(file.name)
    }
  }

  // Audit trail — shows up in the case timeline as "Info provided"
  await supabase.from('case_events').insert({
    case_id:     caseId,
    actor:       profile.id,
    event_type:  'info_provided',
    from_status: 'need_more_info',
    to_status:   'pending_review',
    note:        message,
  })

  // Return to admin review queue — admin must re-review before forwarding to embassy
  await admin.from('cases').update({ status: 'pending_review' }).eq('id', caseId)

  // Email the assigned embassy + notify TFA admin
  const { EMAIL_ABU_DHABI, EMAIL_DUBAI } = await getEmailRouting()
  const embassyEmail =
    c.assigned_emirate === 'Abu Dhabi'
      ? EMAIL_ABU_DHABI
      : EMAIL_DUBAI

  const reporterCc =
    c.reporter_email?.includes('@') ? [c.reporter_email] : []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (embassyEmail && c.case_id) {
    const fileBlock = uploadedNames.length
      ? `<p><strong>Attached files:</strong> ${uploadedNames.join(', ')}</p>`
      : ''
    const caseLink = appUrl
      ? `<p><a href="${appUrl}/cases/${caseId}" style="color:#0C447C;font-weight:600">View case ${c.case_id} in Ashraya →</a></p>`
      : ''
    try {
      await sendEmail({
        to:      embassyEmail,
        cc:      reporterCc,
        subject: `Additional information provided — ${c.case_id} (${c.case_type})`,
        html: `<p>Dear Mission Team,</p>
<p>The volunteer has responded to your information request for case <strong>${c.case_id}</strong>${c.name ? ` (${c.name})` : ''}.</p>
<p><strong>Their message:</strong></p>
<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:12px 0;color:#555;">${message.replace(/\n/g, '<br>')}</blockquote>
${fileBlock}
${caseLink}
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
      })
    } catch {
      // Non-fatal — event and files are already saved
    }
  }

  // Also notify TFA admin so they're aware the case is progressing
  try {
    await sendInfoResponseAdminNotification({
      caseId:          c.case_id,
      caseRowId:       caseId,
      caseType:        c.case_type,
      affectedName:    c.name ?? null,
      reporterName:    c.reporter_name ?? null,
      volunteerMessage: message,
      appUrl,
    })
  } catch { /* non-fatal */ }

  revalidatePath(`/cases/${caseId}`)
  return { ok: true }
}

/**
 * Volunteer resubmits a case that was returned by admin (needs_attention).
 * Resets to pending_review and triggers a fresh pre-screening run.
 */
export async function resubmitCase(formData: FormData): Promise<void> {
  const profile = await requireProfile(['volunteer'])
  const caseRowId     = String(formData.get('case_id')       ?? '').trim()
  const volunteerNote = String(formData.get('volunteer_note') ?? '').trim() || null
  if (!caseRowId) return

  const supabase = await createClient()
  const { data: c } = await supabase
    .from('cases')
    .select('status, created_by, case_id, case_type, name, reporter_name')
    .eq('id', caseRowId)
    .single()

  if (!c || c.status !== 'needs_attention') return
  if (c.created_by !== profile.id) return

  await supabase
    .from('cases')
    .update({ status: 'pending_review', admin_return_note: null, prescreening_result: null })
    .eq('id', caseRowId)

  await supabase.from('case_events').insert({
    case_id:    caseRowId,
    actor:      profile.id,
    event_type: 'volunteer_resubmitted',
    to_status:  'pending_review',
    note:       volunteerNote,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  after(async () => {
    await runPrescreening(caseRowId)
    try {
      await sendResubmitAdminNotification({
        caseId:        c.case_id,
        caseRowId,
        caseType:      c.case_type,
        affectedName:  c.name ?? null,
        reporterName:  c.reporter_name ?? null,
        volunteerNote,
        appUrl,
      })
    } catch { /* non-fatal */ }
  })

  redirect(`/cases/${caseRowId}`)
}
