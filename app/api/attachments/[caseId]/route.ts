import { NextRequest, NextResponse } from 'next/server'

import { requireProfile } from '@/lib/auth'
import { ATTACHMENT_BUCKET } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  try {
    await requireProfile(['tfa_admin', 'embassy_abu_dhabi', 'embassy_dubai', 'ambassador', 'ifs_officer'])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { caseId } = await props.params
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('attachments')
    .select('id, label, storage_path')
    .eq('case_id', caseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json([])

  const attachments = await Promise.all(
    rows.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(a.storage_path, 60 * 10)
      return { id: a.id, label: a.label, url: signed?.signedUrl ?? null }
    }),
  )

  return NextResponse.json(attachments)
}
