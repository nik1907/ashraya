import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  Mail,
  Paperclip,
  User,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { resendEmail } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { SubmitButton } from '@/components/SubmitButton'
import { PrintButton } from '@/components/PrintButton'
import { CaseProcessing } from '@/components/CaseProcessing'
import { CaseStatusForm } from '@/components/CaseStatusForm'
import { StatusBadge } from '@/components/CasesList'
import { InfoResponseForm } from '@/components/InfoResponseForm'
import { requireProfile } from '@/lib/auth'
import { getCaseType } from '@/lib/caseConfig'
import { ATTACHMENT_BUCKET } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import {
  CASE_STATUS_LABELS,
  EMBASSY_STATUS_OPTIONS,
  landingPathForRole,
} from '@/lib/types'

type CaseEvent = {
  id: string
  event_type: string
  from_status: string | null
  to_status: string | null
  note: string | null
  created_at: string
  actor: { full_name: string | null } | null
}

function getSlaInfo(caseType: string, status: string, createdAt: string) {
  if (status !== 'sent') return null
  const t = caseType.toLowerCase()
  const isCritical = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic'].some(k => t.includes(k))
  const slaHours = isCritical ? 48 : 7 * 24
  const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  const rem = slaHours - hoursElapsed
  if (rem <= 0) return { text: `SLA overdue by ${Math.ceil(-rem / 24)}d`, cls: 'border-red-200 bg-red-100 text-red-700' }
  if (rem < 24)  return { text: `${Math.round(rem)}h SLA remaining`,      cls: 'border-amber-200 bg-amber-100 text-amber-700' }
  return           { text: `${Math.round(rem / 24)}d SLA remaining`,      cls: 'border-green-200 bg-green-100 text-green-700' }
}

function Row({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-brand-border py-2 text-sm last:border-0">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="col-span-2 text-brand-navy">{display}</dd>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-brand-border bg-brand-card p-5 shadow-sm">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <span className="text-brand-saffron">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default async function CaseDetailPage(props: PageProps<'/cases/[id]'>) {
  const { id } = await props.params
  const profile = await requireProfile()

  const supabase = await createClient()
  const { data: c } = await supabase.from('cases').select('*').eq('id', id).single()
  if (!c) notFound()

  const caseType = getCaseType(c.case_type)
  const details = (c.details ?? {}) as Record<string, unknown>
  const isAdmin   = profile.role === 'tfa_admin'
  const isEmbassy = profile.role === 'embassy_abu_dhabi' || profile.role === 'embassy_dubai'
  const canManage = isAdmin || isEmbassy
  const hasCompany =
    c.company_name || c.company_phone || c.company_email || c.company_location

  const { data: attachmentRows } = await supabase
    .from('attachments')
    .select('id, label, storage_path')
    .eq('case_id', id)

  const attachments: { id: string; label: string; url: string | null }[] = []
  for (const a of attachmentRows ?? []) {
    const { data: signed } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(a.storage_path, 60 * 10)
    attachments.push({ id: a.id, label: a.label, url: signed?.signedUrl ?? null })
  }

  // Fetch full case timeline — also used to derive the info request note
  const { data: rawEvents } = await supabase
    .from('case_events')
    .select('id, event_type, from_status, to_status, note, created_at, actor:profiles!actor(full_name)')
    .eq('case_id', id)
    .order('created_at', { ascending: true })
  const events = (rawEvents ?? []) as unknown as CaseEvent[]
  const infoRequestNote = events.filter(e => e.to_status === 'need_more_info' && e.note).at(-1)?.note ?? null
  const sla = getSlaInfo(c.case_type, c.status, c.created_at)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-6 py-6">
        <Link
          href={landingPathForRole(profile.role)}
          className="inline-flex items-center gap-1 text-sm text-brand-navy-light hover:underline"
        >
          <ArrowLeft size={15} /> Back
        </Link>

        {/* Case header card */}
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-sm">
          <div className="tricolour" />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-brand-navy">{c.case_type}</h1>
              <StatusBadge status={c.status} />
              {sla && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${sla.cls}`}>
                  {sla.text}
                </span>
              )}
              <div className="ml-auto"><PrintButton /></div>
            </div>
            <p className="mt-1 text-sm text-brand-muted">
              <span className="font-mono font-medium text-brand-navy-light">
                {c.case_id ?? 'Case ID pending'}
              </span>{' '}
              · routed to {c.assigned_emirate}
            </p>

            {(c.resolved_by || c.resolution_note) && (
              <p className="mt-1 text-sm text-brand-muted">
                {c.resolved_by && (
                  <>
                    Handled by{' '}
                    <span className="text-brand-navy">{c.resolved_by}</span>
                  </>
                )}
                {c.resolution_note && <> · “{c.resolution_note}”</>}
              </p>
            )}

            {!c.case_id && <CaseProcessing />}

            {/* Embassy: can update status */}
            {isEmbassy && (
              <div className="mt-4 border-t border-brand-border pt-4">
                <CaseStatusForm
                  caseId={c.id}
                  current={c.status}
                  options={EMBASSY_STATUS_OPTIONS}
                  defaultHandledBy={profile.full_name ?? ''}
                />
              </div>
            )}

            {/* Admin: read-only — can only re-send the original email if needed */}
            {isAdmin && (c.status === 'submitted' || c.status === 'sent') && (
              <div className="mt-4 border-t border-brand-border pt-4">
                <form action={resendEmail}>
                  <input type="hidden" name="case_id" value={c.id} />
                  <SubmitButton
                    pendingText="Sending…"
                    className="rounded border border-brand-border px-3 py-1 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5"
                  >
                    Re-send email
                  </SubmitButton>
                </form>
              </div>
            )}

            {/* Info request note — shown to everyone when embassy has asked for more information */}
            {c.status === 'need_more_info' && infoRequestNote && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Information requested by embassy
                </p>
                <p className="mt-1 text-sm text-amber-900">{infoRequestNote}</p>
              </div>
            )}

            {/* Volunteer: respond to the info request inline */}
            {profile.role === 'volunteer' && c.status === 'need_more_info' && (
              <div className="mt-4 border-t border-brand-border pt-4">
                <InfoResponseForm caseId={c.id} />
              </div>
            )}

            {/* Volunteer: resend request after 7 days with no acknowledgement */}
            {profile.role === 'volunteer' &&
              (c.status === 'submitted' || c.status === 'sent') && (() => {
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                const lastActivity = c.email_sent_at
                  ? new Date(c.email_sent_at).getTime()
                  : new Date(c.created_at).getTime()
                const eligible = lastActivity < sevenDaysAgo
                return (
                  <div className="mt-4 border-t border-brand-border pt-4">
                    <form action={resendEmail}>
                      <input type="hidden" name="case_id" value={c.id} />
                      <SubmitButton
                        disabled={!eligible}
                        pendingText="Sending…"
                        className="rounded border border-brand-border px-3 py-1 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {eligible ? 'Request re-send' : 'Re-send available after 7 days'}
                      </SubmitButton>
                    </form>
                    {!eligible && (
                      <p className="mt-1 text-xs text-brand-muted">
                        No response yet — re-send becomes available 7 days after submission.
                      </p>
                    )}
                  </div>
                )
              })()
            }
          </div>
        </div>

        {/* Summary — the most important card, shown first */}
        {c.polished_summary && (
          <section className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-brand-border bg-brand-navy/5 px-5 py-3 text-sm font-semibold text-brand-navy">
              <Mail size={16} className="text-brand-saffron" />
              {isEmbassy
                ? 'Case summary'
                : `Formal summary ${c.email_sent_at ? '· sent to embassy' : '· draft'}`}
            </div>
            <p className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-brand-navy">
              {c.polished_summary}
            </p>
          </section>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <InfoCard title="Affected individual" icon={<User size={16} />}>
            <dl>
              <Row label="Name" value={c.name} />
              <Row label="Gender" value={c.gender} />
              <Row label="Age" value={c.age} />
              <Row label="Passport" value={c.passport} />
              <Row label="Emirates ID" value={c.eid} />
              <Row label="Phone" value={c.phone} />
              <Row label="Date of incident" value={c.date_of_incident} />
            </dl>
          </InfoCard>

          <InfoCard title="Reported by" icon={<UserCheck size={16} />}>
            <dl>
              <Row label="Name" value={c.reporter_name} />
              <Row label="Passport" value={c.reporter_passport} />
              <Row label="Emirates ID" value={c.reporter_eid} />
              <Row label="Phone" value={c.reporter_phone} />
              <Row label="Email" value={c.reporter_email} />
            </dl>
          </InfoCard>
        </div>

        {caseType && caseType.fields.length > 0 && (
          <InfoCard title="Case details" icon={<ClipboardList size={16} />}>
            <dl>
              {caseType.fields.map((f) => (
                <Row key={f.key} label={f.label} value={details[f.key]} />
              ))}
            </dl>
          </InfoCard>
        )}

        {hasCompany && (
          <InfoCard title="Employer / agent" icon={<Building2 size={16} />}>
            <dl>
              <Row label="Company / Agent" value={c.company_name} />
              <Row label="Phone" value={c.company_phone} />
              <Row label="Email" value={c.company_email} />
              <Row label="Location" value={c.company_location} />
            </dl>
          </InfoCard>
        )}

        {/* Raw input is internal only — embassy sees the summary above. */}
        {!isEmbassy && (
          <InfoCard title="Description (as reported)" icon={<FileText size={16} />}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-navy">
              {c.raw_description}
            </p>
          </InfoCard>
        )}

        {attachments.length > 0 && (
          <InfoCard title="Attachments" icon={<Paperclip size={16} />}>
            <ul className="space-y-2">
              {attachments.map((a) => (
                <li key={a.id}>
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-navy-light transition-colors hover:bg-brand-navy/5"
                    >
                      <FileText size={15} /> {a.label}
                    </a>
                  ) : (
                    <span className="text-sm text-brand-muted">
                      {a.label} (unavailable)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </InfoCard>
        )}

        {events.length > 0 && (
          <InfoCard title="Case timeline" icon={<Clock size={16} />}>
            <ol className="space-y-0">
              {events.map((evt, i) => {
                const actor = (evt.actor as { full_name: string | null } | null)?.full_name ?? 'System'
                const isLast = i === events.length - 1
                return (
                  <li
                    key={evt.id}
                    className={`relative flex gap-3 py-3 ${!isLast ? 'border-b border-brand-border' : ''}`}
                  >
                    {/* timeline dot */}
                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-brand-saffron" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-brand-navy">
                        <span className="font-medium">{actor}</span>
                        {' — '}
                        {evt.event_type === 'status_changed' ? (
                          <>
                            {CASE_STATUS_LABELS[evt.from_status ?? ''] ?? evt.from_status ?? '?'}
                            {' → '}
                            <span className="font-medium">
                              {CASE_STATUS_LABELS[evt.to_status ?? ''] ?? evt.to_status ?? '?'}
                            </span>
                          </>
                        ) : evt.event_type === 'email_sent' ? (
                          'Embassy notified by email'
                        ) : evt.event_type === 'case_submitted' ? (
                          'Case submitted'
                        ) : (
                          evt.event_type.replace(/_/g, ' ')
                        )}
                      </p>
                      {evt.note && (
                        <p className="mt-0.5 text-xs text-brand-muted">{evt.note}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-brand-muted/60">
                        {new Date(evt.created_at).toLocaleString('en-AE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </InfoCard>
        )}
      </main>
    </div>
  )
}
