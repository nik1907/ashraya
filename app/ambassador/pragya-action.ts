'use server'

import { requireProfile } from '@/lib/auth'
import { generatePragyaInsights, type PragyaMission, type PragyaPeriod, type PragyaOutput } from '@/lib/ai/pragya'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getPragyaInsights(
  mission: PragyaMission,
  period:  PragyaPeriod,
): Promise<PragyaOutput | null> {
  await requireProfile(['ambassador', 'general_council', 'ifs_officer', 'tfa_admin'])

  const admin = createAdminClient()
  const { data: cases } = await admin
    .from('cases')
    .select('id, case_id, case_type, status, assigned_emirate, created_at, company_name, company_location, date_of_incident')
    .order('created_at', { ascending: false })

  if (!cases) return null
  return generatePragyaInsights(cases, mission, period)
}
