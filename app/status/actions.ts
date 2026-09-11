'use server'

import { fmtDate } from '@/lib/dates'
import { createAdminClient } from '@/lib/supabase/admin'

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  submitted:      { label: 'Received',          color: 'blue',   description: 'Your case has been received and is awaiting embassy review.' },
  sent:           { label: 'With Embassy',       color: 'blue',   description: 'Your case has been forwarded to the Embassy welfare team.' },
  acknowledged:   { label: 'Acknowledged',       color: 'amber',  description: 'An embassy officer has reviewed your case and will be in touch.' },
  need_more_info: { label: 'Information Needed', color: 'amber',  description: 'The embassy needs more information. Please check your email or phone.' },
  in_progress:    { label: 'Under Process',      color: 'blue',   description: 'Your case is actively being handled by an embassy officer.' },
  resolved:       { label: 'Resolved',           color: 'green',  description: 'Your case has been resolved. Contact the embassy if you need further assistance.' },
  closed:         { label: 'Closed',             color: 'gray',   description: 'This case has been closed.' },
}

type LookupState = {
  inputs: { case_id: string; passport: string }
  case?: {
    case_id: string
    case_type: string
    name: string | null
    assigned_emirate: string | null
    created_at: string
    statusLabel: string
    statusColor: string
    statusDescription: string
  }
  error?: string
} | null

export async function lookupCaseStatus(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const rawCaseId  = (formData.get('case_id')  as string | null)?.trim().toUpperCase() ?? ''
  const rawPassport = (formData.get('passport') as string | null)?.trim().toUpperCase() ?? ''

  const inputs = { case_id: rawCaseId, passport: rawPassport }

  if (!rawCaseId || !rawPassport) {
    return { inputs, error: 'Please enter both Case ID and Passport Number.' }
  }

  const admin = createAdminClient()

  // Fetch by case_id — admin client bypasses RLS for public lookup
  const { data: c, error } = await admin
    .from('cases')
    .select('id, case_id, case_type, status, name, passport, assigned_emirate, created_at')
    .eq('case_id', rawCaseId)
    .single()

  if (error || !c) {
    return { inputs, error: 'No case found with that Case ID. Please check and try again.' }
  }

  // Second factor — passport must match (case-insensitive)
  const storedPassport = (c.passport as string | null)?.trim().toUpperCase() ?? ''
  if (!storedPassport || storedPassport !== rawPassport) {
    // Deliberately vague — don't reveal whether the case ID was valid
    return { inputs, error: 'The details you entered do not match our records. Please check both fields and try again.' }
  }

  const info = STATUS_LABELS[c.status as string] ?? { label: c.status, color: 'gray', description: '' }

  return {
    inputs,
    case: {
      case_id:          c.case_id,
      case_type:        c.case_type,
      name:             c.name,
      assigned_emirate: c.assigned_emirate,
      created_at:       fmtDate(c.created_at),
      statusLabel:      info.label,
      statusColor:      info.color,
      statusDescription: info.description,
    },
  }
}
