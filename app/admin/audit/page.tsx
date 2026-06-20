import Link from 'next/link'

import { AppHeader } from '@/components/AppHeader'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const EVENT_LABEL: Record<string, string> = {
  submitted:      'Submitted',
  status_changed: 'Status changed',
  email_sent:     'Email sent',
  acknowledged:   'Acknowledged',
  edited:         'Edited',
}

const STATUS_LABEL: Record<string, string> = {
  sent:           'Received',
  acknowledged:   'Acknowledged',
  need_more_info: 'Needs info',
  in_progress:    'In progress',
  submitted:      'Pending',
  resolved:       'Resolved',
  closed:         'Closed',
}

const EVENT_BADGE: Record<string, { bg: string; text: string }> = {
  status_changed: { bg: '#E6F1FB', text: '#0C447C' },
  email_sent:     { bg: '#EAF3DE', text: '#27500A' },
  submitted:      { bg: '#EEEDFE', text: '#3C3489' },
  edited:         { bg: '#FAEEDA', text: '#633806' },
}

type AuditEvent = {
  id: string
  event_type: string
  from_status: string | null
  to_status: string | null
  note: string | null
  created_at: string
  actor: { full_name: string | null } | null
  case_ref: { case_id: string | null; name: string | null; case_type: string } | null
}

export default async function AuditLogPage() {
  const profile  = await requireProfile(['tfa_admin'])
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('case_events')
    .select(`
      id, event_type, from_status, to_status, note, created_at,
      actor:profiles!actor(full_name),
      case_ref:cases!case_id(case_id, name, case_type)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (events ?? []) as unknown as AuditEvent[]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-6">

        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">Audit log</h1>
            <p className="mt-1 text-sm text-brand-muted">
              All case actions and status changes · last {rows.length} event{rows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/admin" className="text-sm text-brand-navy-light underline">
            ← Back to admin
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-8 text-sm text-brand-muted">
            No audit events recorded yet. Events are logged when case status changes.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Affected</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => {
                  const badge = EVENT_BADGE[e.event_type] ?? { bg: '#F1EFE8', text: '#444441' }
                  const caseId = e.case_ref?.case_id
                  return (
                    <tr key={e.id} className="border-t border-brand-border hover:bg-brand-navy/5">
                      <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-brand-muted">
                        {new Date(e.created_at).toLocaleDateString()}{' '}
                        <span className="text-[11px]">
                          {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-brand-navy">
                        {e.actor?.full_name ?? 'System'}
                      </td>
                      <td className="px-4 py-2.5">
                        {caseId ? (
                          <span className="font-mono text-[11px] text-brand-navy-light">
                            {caseId}
                          </span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-brand-muted">
                        {e.case_ref?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {EVENT_LABEL[e.event_type] ?? e.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {e.from_status && e.to_status ? (
                          <span>
                            <span className="text-brand-muted">{STATUS_LABEL[e.from_status] ?? e.from_status}</span>
                            {' → '}
                            <span className="font-medium text-brand-navy">{STATUS_LABEL[e.to_status] ?? e.to_status}</span>
                          </span>
                        ) : e.event_type === 'email_sent' ? (
                          <span className="text-emerald-600">Email dispatched</span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-[12px] text-brand-muted">
                        {e.note ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  )
}
