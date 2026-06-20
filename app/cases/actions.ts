'use server'

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
import { ATTACHMENT_BUCKET } from '@/lib/storage'
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

  // Routing is based on where the affected person's visa / residence is.
  const assignedEmirate = visaEmirate === 'Other Emirates' ? 'Dubai' : 'Abu Dhabi'

  // Collect case-type-specific answers, trusting the config (not the client)
  // for which keys belong to this case type.
  const details: Record<string, unknown> = {}
  for (const field of caseType.fields) {
    const v = readDetail(formData, field)
    if (v !== null) details[field.key] = v
  }

  const ageRaw = formData.get('age')
  const age = ageRaw ? Number(ageRaw) : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_type: caseType.value,
      status: 'submitted',
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

  // Audit trail: record the submission.
  await supabase.from('case_events').insert({
    case_id: data.id,
    actor: profile.id,
    event_type: 'submitted',
    to_status: 'submitted',
  })

  // If submitted from a saved draft, remove it now.
  const draftId = String(formData.get('draft_id') ?? '').trim()
  if (draftId) {
    await deleteDraft(supabase, draftId)
  }

  // Assign case ID, generate the AI summary, and email the embassy — in the
  // background, so the volunteer gets an instant response instead of waiting
  // (and the request never times out on the host).
  after(async () => {
    await finalizeCase(data.id)
  })

  redirect(`/cases/${data.id}`)
}
