import { ImapFlow } from 'imapflow'

import { extractEmailToCase } from '@/lib/ai/emailExtract'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCaseId, ddmmyy } from '@/lib/caseId'
import { polishDescription } from '@/lib/ai/polish'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Minimum confidence to auto-create a case without officer review.
const AUTO_CREATE_THRESHOLD = 0.85

interface ImapMessage {
  envelope?: {
    messageId?: string
    date?: Date
    from?: Array<{ name?: string; address?: string }>
    subject?: string
  }
  internalDate?: Date
  headers?: {
    get(name: string): string | undefined
  }
  getText?(encoding?: string): Promise<string>
  getContent?(encoding?: string): Promise<Buffer>
}

export async function POST(req: Request) {
  // The endpoint requires either a matching poll secret (for cron jobs)
  // OR an authenticated embassy/admin session (for manual "Check inbox" button).
  const secret = req.headers.get('x-poll-secret')
  const hasValidSecret = process.env.EMAIL_POLL_SECRET && secret === process.env.EMAIL_POLL_SECRET

  if (!hasValidSecret) {
    // Fall back to session auth for manual trigger from the UI.
    const { requireProfile } = await import('@/lib/auth')
    try {
      await requireProfile(['embassy_abu_dhabi', 'embassy_dubai', 'ifs_officer', 'tfa_admin'])
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const user     = process.env.GMAIL_USER
  const password = process.env.GMAIL_APP_PASSWORD
  if (!user || !password) {
    return Response.json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not configured' }, { status: 500 })
  }

  const admin = createAdminClient()

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass: password },
    logger: false,
  })

  const results: { messageId: string; action: 'stored' | 'duplicate' | 'auto_created' | 'error' }[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Fetch all unread messages.
      for await (const msg of client.fetch('1:*', {
        envelope: true,
        source: true,
        internalDate: true,
        headers: ['message-id', 'in-reply-to', 'references'],
      })) {
        const messageId = msg.envelope?.messageId ?? `<no-id-${Date.now()}>`
        const rawDate = msg.envelope?.date ?? msg.internalDate ?? new Date()
        const receivedAt = (rawDate instanceof Date ? rawDate : new Date(rawDate)).toISOString()
        const fromRaw = msg.envelope?.from?.[0]
        const fromEmail = fromRaw?.address ?? ''
        const fromName  = fromRaw?.name ?? null
        const subject   = msg.envelope?.subject ?? ''
        // headers is a Map in imapflow
        const hdrs = msg.headers as unknown as Map<string, string[]>
        const inReplyTo = hdrs?.get?.('in-reply-to')?.[0] ?? null
        const refHdr    = hdrs?.get?.('references')?.[0] ?? null

        // Skip messages that reference a TFA case ID — these are officer replies.
        if (subject && /TFA-\d{6}-[A-Z]{2}-\d{3}/i.test(subject)) {
          continue
        }

        // Check for duplicate.
        const { data: existing } = await admin
          .from('email_intakes')
          .select('id')
          .eq('message_id', messageId)
          .single()
        if (existing) {
          results.push({ messageId, action: 'duplicate' })
          continue
        }

        // Extract plain-text body.
        let bodyText = ''
        try {
          const raw = await (msg as unknown as ImapMessage).getText?.('utf-8') ?? ''
          // Strip common HTML tags for cleaner AI input.
          bodyText = raw.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
        } catch {
          bodyText = ''
        }

        // AI extraction.
        const extracted = await extractEmailToCase(subject, fromEmail, fromName, bodyText)

        // Store in email_intakes.
        const { data: intake, error: insertErr } = await admin
          .from('email_intakes')
          .insert({
            message_id:    messageId,
            received_at:   receivedAt,
            from_email:    fromEmail,
            from_name:     fromName,
            subject,
            body_text:     bodyText.slice(0, 8000),
            in_reply_to:   inReplyTo,
            references_hdr: refHdr,
            ai_confidence: extracted?.confidence ?? null,
            ai_extracted:  extracted ?? {},
            status:        'pending',
          })
          .select('id')
          .single()

        if (insertErr || !intake) {
          results.push({ messageId, action: 'error' })
          continue
        }

        // Auto-create a case if confidence >= threshold.
        if (extracted && (extracted.confidence ?? 0) >= AUTO_CREATE_THRESHOLD) {
          try {
            const emirate = extracted.emirate ?? 'Abu Dhabi'
            const caseType = extracted.issue_type ?? 'Other'

            const polished = await polishDescription({
              description:    extracted.summary,
              caseType,
              name:           extracted.name,
              phone:          extracted.phone,
              gender:         null,
              age:            null,
              dateOfIncident: null,
              companyName:    null,
              companyPhone:   null,
              companyEmail:   null,
              companyLocation: null,
              reporterName:   fromName,
              reporterPhone:  null,
              details:        {},
            })

            const now = new Date()
            const { count } = await admin
              .from('cases')
              .select('id', { count: 'exact', head: true })
              .like('case_id', `TFA-${ddmmyy(now)}-%`)
            const caseId = formatCaseId('TFA', caseType, (count ?? 0) + 1, now)

            const { data: newCase } = await admin
              .from('cases')
              .insert({
                case_id:          caseId,
                case_type:        caseType,
                status:           'submitted',
                source:           'email',
                name:             extracted.name,
                phone:            extracted.phone,
                raw_description:  bodyText.slice(0, 4000),
                polished_summary: polished,
                reporting_emirate: emirate,
                assigned_emirate:  emirate,
                reporter_name:    fromName,
                reporter_email:   fromEmail,
                created_by:       (await admin.from('profiles').select('id').eq('role', 'tfa_admin').limit(1).single()).data?.id ?? '00000000-0000-0000-0000-000000000000',
              })
              .select('id')
              .single()

            if (newCase) {
              await admin.from('email_intakes').update({
                status:  'auto_created',
                case_id: newCase.id,
              }).eq('id', intake.id)

              await admin.from('case_events').insert({
                case_id:    newCase.id,
                actor:      null,
                event_type: 'submitted',
                note:       `Auto-created from email: ${subject}`,
              })

              results.push({ messageId, action: 'auto_created' })
              continue
            }
          } catch {
            // Fall through — leave as pending for officer review.
          }
        }

        results.push({ messageId, action: 'stored' })
      }
    } finally {
      lock.release()
    }
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return Response.json({ processed: results.length, results })
}
