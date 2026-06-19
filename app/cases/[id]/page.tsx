import {
  ArrowLeft,
  Building2,
  ClipboardList,
  FileText,
  Mail,
  Paperclip,
  User,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { resendEmail, updateCaseStatus } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { StatusBadge } from '@/components/CasesList'
import { requireProfile } from '@/lib/auth'
import { getCaseType } from '@/lib/caseConfig'
import { ATTACHMENT_BUCKET } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import { landingPathForRole } from '@/lib/types'

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
  const isEmbassy =
    profile.role === 'embassy_abu_dhabi' || profile.role === 'embassy_dubai'
  const canManage =
    profile.role === 'tfa_admin' || isEmbassy
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
            </div>
            <p className="mt-1 text-sm text-brand-muted">
              <span className="font-mono font-medium text-brand-navy-light">
                {c.case_id ?? 'Case ID pending'}
              </span>{' '}
              · routed to {c.assigned_emirate}
            </p>

            {canManage && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-brand-border pt-4">
                <form action={updateCaseStatus} className="flex items-center gap-2">
                  <input type="hidden" name="case_id" value={c.id} />
                  <label className="text-sm text-brand-muted">Status</label>
                  <select
                    name="status"
                    defaultValue={c.status}
                    className="rounded border border-brand-border px-2 py-1 text-sm"
                  >
                    {['submitted', 'sent', 'acknowledged', 'in_progress', 'resolved', 'closed'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                  <button className="rounded bg-brand-navy px-3 py-1 text-sm text-white transition-colors hover:bg-brand-navy-hover">
                    Update
                  </button>
                </form>
                {profile.role === 'tfa_admin' && (
                  <form action={resendEmail}>
                    <input type="hidden" name="case_id" value={c.id} />
                    <button className="rounded border border-brand-border px-3 py-1 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5">
                      Re-send email
                    </button>
                  </form>
                )}
              </div>
            )}
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
      </main>
    </div>
  )
}
