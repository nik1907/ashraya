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
import { resubmitCase } from '@/app/cases/actions'
import { CaseAssignSelect } from '@/components/admin/CaseAssignSelect'
import { InternalNotes } from '@/components/admin/InternalNotes'
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
import { createAdminClient } from '@/lib/supabase/admin'
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

// ─── Pipeline stepper ─────────────────────────────────────────────────────────

type StageState = 'done' | 'current' | 'pending'
type PipelineStage = { key: string; label: string; state: StageState; ts?: string | null }

const STATUS_WEIGHT: Record<string, number> = {
  submitted: 0, sent: 1, acknowledged: 2,
  need_more_info: 2.5, in_progress: 3, resolved: 4, closed: 4,
}

function buildPipeline(
  currentStatus: string,
  events: CaseEvent[],
  createdAt: string,
  emailSentAt: string | null,
): PipelineStage[] {
  const tsMap = new Map<string, string>()
  tsMap.set('submitted', createdAt)
  if (emailSentAt) tsMap.set('sent', emailSentAt)
  for (const e of events) {
    if (e.to_status && !tsMap.has(e.to_status)) tsMap.set(e.to_status, e.created_at)
    if (e.event_type === 'email_sent' && !tsMap.has('sent')) tsMap.set('sent', e.created_at)
  }

  const hasInfoStep = events.some(e => e.to_status === 'need_more_info')
  const cw = STATUS_WEIGHT[currentStatus] ?? 0

  function state(key: string): StageState {
    if (key === 'resolved' && (currentStatus === 'resolved' || currentStatus === 'closed')) return 'current'
    if (currentStatus === key) return 'current'
    return (STATUS_WEIGHT[key] ?? 0) < cw ? 'done' : 'pending'
  }

  const stages: Array<{ key: string; label: string }> = [
    { key: 'submitted',    label: 'Submitted' },
    { key: 'sent',         label: 'Embassy Notified' },
    { key: 'acknowledged', label: 'Acknowledged' },
    ...(hasInfoStep ? [{ key: 'need_more_info', label: 'Info Requested' }] : []),
    { key: 'in_progress',  label: 'In Progress' },
    { key: 'resolved',     label: 'Resolved' },
  ]

  return stages.map(s => ({ ...s, state: state(s.key), ts: tsMap.get(s.key) ?? null }))
}

function CaseTimeline({ stages }: { stages: PipelineStage[] }) {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })

  return (
    <div className="mt-5 overflow-x-auto border-t border-brand-border pt-4">
      <div className="flex items-start">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-start">
            {/* connector */}
            {i > 0 && (
              <div
                className="mt-[11px] h-px flex-shrink-0"
                style={{
                  width: 'clamp(16px, 4vw, 40px)',
                  background: stage.state === 'pending' ? '#e2e8f0' : '#4ade80',
                }}
              />
            )}
            {/* step */}
            <div className="flex w-[68px] flex-col items-center gap-0.5 sm:w-20">
              <div
                className={[
                  'flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black',
                  stage.state === 'done'
                    ? 'bg-green-500 text-white'
                    : stage.state === 'current'
                    ? 'bg-brand-navy text-white ring-2 ring-brand-navy/25 ring-offset-2'
                    : 'border-2 border-slate-200 bg-white text-slate-300',
                ].join(' ')}
              >
                {stage.state === 'done' ? '✓' : i + 1}
              </div>
              <p
                className={[
                  'mt-0.5 text-center text-[9px] font-semibold leading-tight',
                  stage.state === 'done'
                    ? 'text-green-700'
                    : stage.state === 'current'
                    ? 'text-brand-navy'
                    : 'text-brand-muted/50',
                ].join(' ')}
              >
                {stage.label}
              </p>
              {stage.ts && stage.state !== 'pending' && (
                <p className="text-center text-[8px] leading-tight text-brand-muted/50">
                  {fmtDate(stage.ts)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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

  // Generate all signed URLs in parallel instead of sequentially
  const attachments: { id: string; label: string; url: string | null }[] = await Promise.all(
    (attachmentRows ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(a.storage_path, 60 * 10)
      return { id: a.id, label: a.label, url: signed?.signedUrl ?? null }
    })
  )

  // Fetch full case timeline — also used to derive the info request note
  const { data: rawEvents } = await supabase
    .from('case_events')
    .select('id, event_type, from_status, to_status, note, created_at, actor:profiles!actor(full_name)')
    .eq('case_id', id)
    .order('created_at', { ascending: true })
  const events = (rawEvents ?? []) as unknown as CaseEvent[]
  const infoRequestNote = events.filter(e => e.to_status === 'need_more_info' && e.note).at(-1)?.note ?? null
  const sla = getSlaInfo(c.case_type, c.status, c.created_at)
  const pipeline = buildPipeline(c.status, events, c.created_at, c.email_sent_at ?? null)

  // Fetch team members for assignment dropdown (admin/embassy only)
  let teamMembers: Array<{ id: string; full_name: string | null }> = []
  if (canManage) {
    const { data: tm } = await supabase.from('profiles').select('id, full_name').eq('status', 'active').order('full_name')
    teamMembers = (tm ?? []) as typeof teamMembers
  }
  // Get assigned info
  const assignedTo = (c as any).assigned_to as string | null
  const assignedMember = teamMembers.find(m => m.id === assignedTo) ?? null

  // Fetch embassy-side officer assignment
  type OfficerProfile = { full_name: string | null; designation: string | null }
  let assignedOfficer: OfficerProfile | null = null
  const assignedOfficerId = (c as any).assigned_officer as string | null
  if (canManage && assignedOfficerId) {
    const adminClient = createAdminClient()
    const { data: op } = await adminClient
      .from('profiles')
      .select('full_name, designation')
      .eq('id', assignedOfficerId)
      .single()
    assignedOfficer = op as OfficerProfile | null
  }

  // Fetch internal staff notes (admin/embassy only)
  type CaseNote = {
    id: string
    body: string
    created_at: string
    author: { full_name: string | null } | null
  }
  let caseNotes: CaseNote[] = []
  if (canManage) {
    const { data: notesRaw } = await supabase
      .from('case_notes')
      .select('id, body, created_at, author:profiles!author_id(full_name)')
      .eq('case_id', id)
      .order('created_at', { ascending: false })
    caseNotes = (notesRaw ?? []) as unknown as CaseNote[]
  }

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

            <CaseTimeline stages={pipeline} />

            {/* Spam-check nudge — shown to the reporter on first submission */}
            {!canManage && (c.status === 'submitted' || c.status === 'sent') && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">Confirmation email sent</p>
                <p className="mt-0.5 text-blue-700">
                  We have sent a copy of this case to your email address. If you don&apos;t see it
                  in your inbox, please check your <strong>spam or junk folder</strong> and
                  mark it as <strong>&quot;Not Spam&quot;</strong> — this ensures you receive
                  all future updates about this case.
                </p>
              </div>
            )}

            {canManage && (
              <div className="mt-3">
                <CaseAssignSelect
                  caseId={c.id}
                  currentAssignedTo={assignedTo}
                  currentAssignedName={assignedMember?.full_name ?? null}
                  teamMembers={teamMembers}
                />
              </div>
            )}

            {canManage && assignedOfficer && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
                <UserCheck size={14} className="shrink-0 text-blue-500" />
                <span className="text-blue-800">
                  <span className="font-medium">Embassy officer: </span>
                  {assignedOfficer.full_name ?? 'Unknown'}
                  {assignedOfficer.designation && (
                    <span className="text-blue-600"> · {assignedOfficer.designation}</span>
                  )}
                </span>
              </div>
            )}

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

            {!c.case_id && c.status !== 'pending_review' && c.status !== 'needs_attention' && <CaseProcessing />}

            {/* Needs attention — shown to volunteer when admin has returned the case */}
            {!canManage && c.status === 'needs_attention' && (c as any).admin_return_note && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Action required before Embassy notification</p>
                <p className="mt-1 text-sm text-amber-700">{(c as any).admin_return_note}</p>
                <form action={resubmitCase} className="mt-3">
                  <input type="hidden" name="case_id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    I&apos;ve updated the case — resubmit for review
                  </button>
                </form>
              </div>
            )}

            {/* Pending review — shown to volunteer while admin reviews */}
            {!canManage && c.status === 'pending_review' && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">Under review</p>
                <p className="mt-0.5 text-blue-700">
                  Your case is being reviewed by the authorised admin team before being forwarded to the Embassy.
                  You will receive an email once it has been processed.
                </p>
              </div>
            )}

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

        {/* Formal summary — visible to all roles */}
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

        {/* Raw input is admin-only — no other role should see the unpolished account. */}
        {isAdmin && (
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

        {canManage && (
          <InternalNotes caseId={c.id} notes={caseNotes} />
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
                        ) : evt.event_type === 'ai_prescreening' ? (
                          'AI pre-screening completed'
                        ) : (
                          evt.event_type.replace(/_/g, ' ')
                        )}
                      </p>
                      {evt.event_type === 'ai_prescreening' && evt.note ? (() => {
                        try {
                          const r = JSON.parse(evt.note) as {
                            completeness?: { pass: boolean; issues: string[] }
                            consistency?:  { pass: boolean; issues: string[] }
                            documents?:    { pass: boolean; issues: string[] }
                            redFlags?:     { pass: boolean; issues: string[] }
                            summary?:      string
                            confidence?:   string
                          }
                          const checks = [
                            { label: 'Completeness', data: r.completeness },
                            { label: 'Consistency',  data: r.consistency },
                            { label: 'Documents',    data: r.documents },
                            { label: 'Red flags',    data: r.redFlags },
                          ] as const
                          return (
                            <div className="mt-1.5 rounded-lg border border-brand-border bg-brand-bg/60 p-2.5 text-xs">
                              {r.summary && (
                                <p className="mb-2 text-brand-navy">{r.summary}</p>
                              )}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                {checks.map(({ label, data }) => data && (
                                  <div key={label} className="flex items-start gap-1.5">
                                    <span className={`mt-0.5 flex-shrink-0 font-bold ${data.pass ? 'text-green-600' : 'text-red-500'}`}>
                                      {data.pass ? '✓' : '✗'}
                                    </span>
                                    <span className="text-brand-muted">
                                      {label}
                                      {!data.pass && data.issues.length > 0 && (
                                        <> — {data.issues.join('; ')}</>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {r.confidence && (
                                <p className="mt-1.5 text-[10px] text-brand-muted/70">
                                  Confidence: {r.confidence}
                                </p>
                              )}
                            </div>
                          )
                        } catch { return null }
                      })() : evt.note ? (
                        <p className="mt-0.5 text-xs text-brand-muted">{evt.note}</p>
                      ) : null}
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
