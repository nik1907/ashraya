import { createAdminClient } from '@/lib/supabase/admin'
import { requireProfile } from '@/lib/auth'
import { formatCaseId, ddmmyy } from '@/lib/caseId'
import { polishDescription } from '@/lib/ai/polish'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let profile
  try {
    profile = await requireProfile(['embassy_abu_dhabi', 'embassy_dubai', 'ifs_officer', 'tfa_admin'])
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { intakeId, action, overrides } = body as {
    intakeId: string
    action: 'approve' | 'reject'
    overrides?: {
      name?: string
      phone?: string
      emirate?: string
      issue_type?: string
    }
  }

  if (!intakeId || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: intake } = await admin
    .from('email_intakes')
    .select('*')
    .eq('id', intakeId)
    .single()

  if (!intake) return Response.json({ error: 'Intake not found' }, { status: 404 })
  if (intake.status !== 'pending') {
    return Response.json({ error: 'Already reviewed' }, { status: 409 })
  }

  if (action === 'reject') {
    await admin.from('email_intakes').update({
      status:      'rejected',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', intakeId)

    return Response.json({ ok: true })
  }

  // action === 'approve' → create a case
  const ai = (intake.ai_extracted ?? {}) as Record<string, string | null>
  const emirate   = overrides?.emirate    ?? ai.emirate    ?? 'Abu Dhabi'
  const caseType  = overrides?.issue_type ?? ai.issue_type ?? 'Other'
  const name      = overrides?.name       ?? ai.name       ?? null
  const phone     = overrides?.phone      ?? ai.phone      ?? null
  const summary   = (ai.summary as string | null) ?? intake.body_text?.slice(0, 500) ?? ''

  const polished = await polishDescription({
    description:    summary,
    caseType,
    name,
    phone,
    gender:         null,
    age:            null,
    dateOfIncident: null,
    companyName:    null,
    companyPhone:   null,
    companyEmail:   null,
    companyLocation: null,
    reporterName:   intake.from_name,
    reporterPhone:  null,
    details:        {},
  })

  const now = new Date()
  const { count } = await admin
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .like('case_id', `TFA-${ddmmyy(now)}-%`)
  const caseId = formatCaseId('TFA', caseType, (count ?? 0) + 1, now)

  const { data: newCase, error: caseErr } = await admin
    .from('cases')
    .insert({
      case_id:          caseId,
      case_type:        caseType,
      status:           'submitted',
      source:           'email',
      name,
      phone,
      raw_description:  intake.body_text?.slice(0, 4000) ?? '',
      polished_summary: polished,
      reporting_emirate: emirate,
      assigned_emirate:  emirate,
      reporter_name:    intake.from_name,
      reporter_email:   intake.from_email,
      created_by:       profile.id,
    })
    .select('id')
    .single()

  if (caseErr || !newCase) {
    return Response.json({ error: caseErr?.message ?? 'Failed to create case' }, { status: 500 })
  }

  await admin.from('case_events').insert({
    case_id:    newCase.id,
    actor:      profile.id,
    event_type: 'submitted',
    note:       `Case created from email intake: ${intake.subject ?? ''}`,
  })

  await admin.from('email_intakes').update({
    status:      'approved',
    reviewed_by: profile.id,
    reviewed_at: new Date().toISOString(),
    case_id:     newCase.id,
  }).eq('id', intakeId)

  return Response.json({ ok: true, caseId, caseRowId: newCase.id })
}
