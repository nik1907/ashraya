import 'server-only'

import { prescreenCase } from '@/lib/ai/prescreening'
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
    .select('case_type, polished_summary, raw_description, name, gender, age, company_name, date_of_incident, reporter_name, reporter_phone, reporting_emirate')
    .eq('id', caseRowId)
    .single()
  if (!c) return

  const { data: attachmentRows } = await admin
    .from('attachments')
    .select('label')
    .eq('case_id', caseRowId)
  const attachmentLabels = (attachmentRows ?? []).map((a: { label: string }) => a.label)

  const result = await prescreenCase({
    caseType:        c.case_type,
    narrative:       c.polished_summary ?? c.raw_description ?? '',
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
  })

  if (!result) return

  await admin
    .from('cases')
    .update({ prescreening_result: result })
    .eq('id', caseRowId)

  await admin.from('case_events').insert({
    case_id:    caseRowId,
    actor:      null,
    event_type: 'ai_prescreening',
    to_status:  'pending_review',
    note:       JSON.stringify(result),
  })
}
