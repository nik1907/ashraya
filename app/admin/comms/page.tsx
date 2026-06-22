import Link from 'next/link'

import { sendManualEmail } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

function fmtUAE(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })
  return `${date} ${time} GST`
}

type ManualEmail = {
  id: string
  sent_at: string
  to_email: string
  subject: string | null
  body_snippet: string | null
  ok: boolean
  case_id: string | null
  case: { case_id: string | null; name: string | null } | null
}

type AutoEmail = {
  id: string
  created_at: string
  note: string | null
  case_id: string | null
  case: { case_id: string | null; name: string | null } | null
}

type OpenCase = {
  id: string
  case_id: string
  name: string | null
  case_type: string
  status: string
}

type OutboxRow =
  | { kind: 'manual'; ts: string; row: ManualEmail }
  | { kind: 'auto'; ts: string; row: AutoEmail }

export default async function CommsPage() {
  const profile = await requireProfile(['tfa_admin'])
  const supabase = await createClient()

  const [{ data: manualRaw }, { data: autoRaw }, { data: openCasesRaw }] = await Promise.all([
    supabase
      .from('email_log')
      .select('id, sent_at, to_email, subject, body_snippet, ok, case_id, case:cases!case_id(case_id, name)')
      .order('sent_at', { ascending: false })
      .limit(100),

    supabase
      .from('case_events')
      .select('id, created_at, note, case_id, case:cases!case_id(case_id, name)')
      .eq('event_type', 'email_sent')
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('cases')
      .select('id, case_id, name, case_type, status')
      .not('status', 'in', '("resolved","closed")')
      .order('created_at', { ascending: false }),
  ])

  const manualEmails = (manualRaw ?? []) as unknown as ManualEmail[]
  const autoEmails   = (autoRaw ?? []) as unknown as AutoEmail[]
  const openCases    = (openCasesRaw ?? []) as unknown as OpenCase[]

  const outbox: OutboxRow[] = [
    ...manualEmails.map((r) => ({ kind: 'manual' as const, ts: r.sent_at, row: r })),
    ...autoEmails.map((r) => ({ kind: 'auto' as const, ts: r.created_at, row: r })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-6">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">Communications</h1>
            <p className="mt-1 text-sm text-brand-muted">Email outbox and manual compose · times in GST (UTC+4)</p>
          </div>
          <Link href="/admin" className="text-sm text-brand-navy-light underline">
            ← Back to admin
          </Link>
        </div>

        {/* Compose form */}
        <div className="rounded-xl border border-brand-border bg-brand-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-brand-navy">Send a manual email</h2>
          <form action={sendManualEmail} className="space-y-4">
            {/* Case selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor="case_id">
                Case (optional)
              </label>
              <select
                id="case_id"
                name="case_id"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
              >
                <option value="">— No case —</option>
                {openCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_id} · {c.name ?? '(no name)'} · {c.case_type} · {c.status}
                  </option>
                ))}
              </select>
            </div>

            {/* To email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor="to_email">
                To email <span className="text-rose-500">*</span>
              </label>
              <input
                id="to_email"
                name="to_email"
                type="email"
                required
                placeholder="recipient@example.com"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted/60 focus:border-brand-navy focus:outline-none"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor="subject">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="Email subject"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted/60 focus:border-brand-navy focus:outline-none"
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-muted" htmlFor="body">
                Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="body"
                name="body"
                required
                rows={6}
                placeholder="Email body…"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted/60 focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                className="rounded bg-brand-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy-hover"
              >
                Send email
              </button>
            </div>
          </form>
        </div>

        {/* Outbox table */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">
            Outbox — last {outbox.length} email{outbox.length !== 1 ? 's' : ''}
          </h2>

          {outbox.length === 0 ? (
            <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-8 text-sm text-brand-muted">
              No emails sent yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">When</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Subject / Note</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outbox.map((entry) => {
                    if (entry.kind === 'manual') {
                      const r = entry.row
                      const caseRef = r.case as { case_id: string | null; name: string | null } | null
                      return (
                        <tr key={`m-${r.id}`} className="border-t border-brand-border hover:bg-brand-navy/5">
                          <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-brand-muted">
                            {fmtUAE(r.sent_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="whitespace-nowrap rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-medium text-[#633806]">
                              Manual
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {caseRef?.case_id ? (
                              <Link
                                href={`/cases/${r.case_id}`}
                                className="font-mono text-[11px] text-brand-navy-light underline"
                              >
                                {caseRef.case_id}
                              </Link>
                            ) : (
                              <span className="text-brand-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-brand-navy">{r.to_email}</td>
                          <td className="max-w-[240px] truncate px-4 py-2.5 text-[12px] text-brand-muted">
                            {r.subject ?? r.body_snippet ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[12px]">
                            {r.ok ? (
                              <span className="text-emerald-600">✓ sent</span>
                            ) : (
                              <span className="text-rose-600">✗ failed</span>
                            )}
                          </td>
                        </tr>
                      )
                    }

                    // auto
                    const r = entry.row
                    const caseRef = r.case as { case_id: string | null; name: string | null } | null
                    return (
                      <tr key={`a-${r.id}`} className="border-t border-brand-border hover:bg-brand-navy/5">
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-brand-muted">
                          {fmtUAE(r.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="whitespace-nowrap rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-medium text-[#27500A]">
                            Auto
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {caseRef?.case_id ? (
                            <Link
                              href={`/cases/${r.case_id}`}
                              className="font-mono text-[11px] text-brand-navy-light underline"
                            >
                              {caseRef.case_id}
                            </Link>
                          ) : (
                            <span className="text-brand-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-brand-muted">Embassy</td>
                        <td className="max-w-[240px] truncate px-4 py-2.5 text-[12px] text-brand-muted">
                          {r.note ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[12px]">
                          <span className="text-emerald-600">✓ sent</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
