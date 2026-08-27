import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'

import { requireProfile } from '@/lib/auth'
import { CasePDF, type CasePDFData, type CaseEventPDF } from '@/lib/pdf/CasePDF'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Must be authenticated
  let profile
  try {
    profile = await requireProfile()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fetch case via regular client — RLS ensures the user can see it
  const supabase = await createClient()
  const { data: c, error } = await supabase
    .from('cases')
    .select(`
      case_id, case_type, status,
      name, gender, age, passport, eid, phone,
      company_name, company_phone, company_location,
      raw_description, polished_summary, case_brief,
      reporter_name, reporter_phone, reporter_email,
      assigned_emirate, reporting_emirate,
      date_of_incident, created_at,
      outcome, resolution_note
    `)
    .eq('id', id)
    .single()

  if (error || !c) {
    return new Response('Case not found', { status: 404 })
  }

  // Fetch events — use admin client so we can join actor profile name
  const admin = createAdminClient()
  const { data: rawEvents } = await admin
    .from('case_events')
    .select('id, event_type, created_at, note, to_status, actor')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  // Resolve actor names
  const actorIds = [...new Set((rawEvents ?? []).map((e: { actor: string }) => e.actor).filter(Boolean))]
  let nameMap: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', actorIds)
    nameMap = Object.fromEntries((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? 'Unknown']))
  }

  const events: CaseEventPDF[] = (rawEvents ?? []).map((e: {
    id: string
    event_type: string
    created_at: string
    note: string | null
    to_status: string | null
    actor: string | null
  }) => ({
    id:         e.id,
    event_type: e.event_type,
    created_at: e.created_at,
    note:       e.note,
    to_status:  e.to_status,
    actor_name: e.actor ? (nameMap[e.actor] ?? null) : null,
  }))

  // Render PDF
  let buffer: Buffer
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(createElement(CasePDF, { data: c as CasePDFData, events, exportedBy: profile.full_name ?? undefined }) as any)
  } catch (err) {
    console.error('PDF render error:', err)
    return new Response('Failed to generate PDF', { status: 500 })
  }

  const filename = `case-${c.case_id ?? id}.pdf`

  // Convert Node Buffer → Uint8Array so it's compatible with the Web Response API
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
