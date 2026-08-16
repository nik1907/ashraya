import 'server-only'

import { prescreenCase } from '@/lib/ai/prescreening'
import { generateCaseBrief, polishDescription } from '@/lib/ai/polish'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fetch case data, run GPT-4o pre-screening, and store the result in
 * cases.prescreening_result and as a case_events row.
 * Called via after() — non-blocking, non-fatal.
 */
export async function runPrescreening(caseRowId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: c } = await admin
    .from('cases')
    .select('case_type, polished_summary, case_brief, raw_description, name, gender, age, phone, company_name, company_phone, company_email, company_location, date_of_incident, reporter_name, reporter_phone, reporting_emirate, details')
    .eq('id', caseRowId)
    .single()
  if (!c) return

  const { data: attachmentRows } = await admin
    .from('attachments')
    .select('label')
    .eq('case_id', caseRowId)
  const attachmentLabels = (attachmentRows ?? []).map((a: { label: string }) => a.label)

  const briefInput = {
    description:     c.raw_description ?? '',
    caseType:        c.case_type,
    name:            c.name ?? null,
    phone:           c.phone ?? null,
    gender:          c.gender ?? null,
    age:             c.age ?? null,
    dateOfIncident:  c.date_of_incident ?? null,
    companyName:     c.company_name ?? null,
    companyPhone:    c.company_phone ?? null,
    companyEmail:    c.company_email ?? null,
    companyLocation: c.company_location ?? null,
    reporterName:    c.reporter_name ?? null,
    reporterPhone:   c.reporter_phone ?? null,
    details:         (c.details ?? {}) as Record<string, unknown>,
  }

  // Run polish, brief, and pre-screening in parallel — all three are independent.
  // Polish + brief generate the preview the admin and volunteer will see before
  // the case is approved; pre-screening generates the quality notes for the admin.
  const [polished, brief, result] = await Promise.all([
    c.polished_summary ? Promise.resolve(c.polished_summary) : polishDescription(briefInput),
    c.case_brief       ? Promise.resolve(c.case_brief)       : generateCaseBrief(briefInput),
    prescreenCase({
      caseType:        c.case_type,
      narrative:       c.raw_description ?? '',
      hasAttachments:  attachmentLabels.length > 0,
      attachmentLabels,
      affectedName:    c.name ?? null,
      affectedGender:  c.gender ?? null,
      affectedAge:     c.age ?? null,
      companyName:     c.company_name ?? null,
      dateOfIncident:  c.date_of_incident ?? null,
      reporterName:    c.reporter_name ?? null,
      reporterPhone:   c.reporter_phone ?? null,
      emirate:         c.reporting_emirate ?? 'Abu Dhabi',
    }),
  ])

  await admin
    .from('cases')
    .update({
      polished_summary:    polished,
      case_brief:          brief,
      prescreening_result: result,
    })
    .eq('id', caseRowId)

  if (result) {
    await admin.from('case_events').insert({
      case_id:    caseRowId,
      actor:      null,
      event_type: 'ai_prescreening',
      to_status:  'pending_review',
      note:       JSON.stringify(result),
    })
  }
}
