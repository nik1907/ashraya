import 'server-only'

import nodemailer from 'nodemailer'

const STATUS_LABEL: Record<string, string> = {
  sent:           'Received',
  acknowledged:   'Acknowledged',
  need_more_info: 'Info Requested',
  in_progress:    'In Progress',
  resolved:       'Resolved/Closed',
  closed:         'Resolved/Closed',
}

export async function sendStatusAckEmail({
  to,
  reporterName,
  caseId,
  caseType,
  affectedName,
  newStatus,
}: {
  to: string
  reporterName: string | null
  caseId: string
  caseType: string
  affectedName: string | null
  newStatus: string
}): Promise<void> {
  const label = STATUS_LABEL[newStatus] ?? newStatus
  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const adminEmail = process.env.EMAIL_ABU_DHABI ?? ''
  await sendEmail({
    to,
    cc: adminEmail ? [adminEmail] : [],
    subject: `Case update: ${caseId} — ${label}`,
    html: `<p>${greeting},</p>
<p>This is to acknowledge that case <strong>${caseId}</strong> (${caseType}${affectedName ? ` — ${affectedName}` : ''}) has been updated to: <strong>${label}</strong>.</p>
<p>For any queries, please contact the TFA admin team at <a href="mailto:tfa.abudhabi@gmail.com">tfa.abudhabi@gmail.com</a>.</p>
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })
}

export async function sendApprovalEmail({
  to,
  name,
}: {
  to: string
  name: string
}): Promise<void> {
  const displayName = name.trim() || 'Volunteer'
  await sendEmail({
    to,
    cc: [],
    subject: 'Your Ashraya volunteer account has been approved',
    html: `<p>Dear ${displayName},</p>
<p>Great news — a TFA admin has approved your Ashraya account. You can now log in and start reporting community welfare cases.</p>
<p>Please log in at the link shared with you by the TFA team.</p>
<p>Thank you for volunteering with the Telangana Friends Association.</p>`,
  })
}

export type Recipients = { to: string; cc: string[] }

/**
 * Decide who the embassy email goes to based on BOTH where the person is
 * reporting from AND where their visa / residence is.
 *
 * | Reporting from | Visa / residence | TO           | CC            |
 * |----------------|-----------------|--------------|---------------|
 * | Abu Dhabi      | Abu Dhabi        | Abu Dhabi    | —             |
 * | Abu Dhabi      | Other Emirates   | Abu Dhabi    | Dubai         |
 * | Other Emirates | Abu Dhabi        | Dubai        | Abu Dhabi     |
 * | Other Emirates | Other Emirates   | Dubai        | Abu Dhabi     |
 *
 * Rule: main TO follows where they are reporting from.
 * CC the other mission only when: reporting from Dubai (always), or
 * reporting from Abu Dhabi but visa is elsewhere (so Dubai is aware).
 * No CC when reporting from Abu Dhabi AND visa is Abu Dhabi.
 *
 * The reporter is also CC'd when they supplied a valid email address.
 */
export function computeRecipients(
  reportingEmirate: string,
  visaEmirate: string,
  reporterEmail: string | null,
  env: {
    EMAIL_ABU_DHABI?: string
    EMAIL_DUBAI?: string
    EMAIL_CC?: string
  } = process.env as Record<string, string | undefined>,
): Recipients {
  const abuDhabi = env.EMAIL_ABU_DHABI ?? ''
  const dubai = env.EMAIL_DUBAI ?? ''

  const cc: string[] = []
  let to: string

  if (reportingEmirate === 'Other emirates') {
    // Reporting from Dubai / other → Dubai is the primary contact, always loop in Abu Dhabi.
    to = dubai
    if (abuDhabi) cc.push(abuDhabi)
  } else {
    // Reporting from Abu Dhabi → Abu Dhabi is primary.
    // Only CC Dubai when the affected person's visa / residence is elsewhere.
    to = abuDhabi
    if (visaEmirate === 'Other Emirates' && dubai) cc.push(dubai)
  }

  if (reporterEmail && reporterEmail.includes('@')) cc.push(reporterEmail)

  const extra = (env.EMAIL_CC ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  cc.push(...extra)

  return { to, cc: [...new Set(cc)] }
}

export type SendResult =
  | { sent: true }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped: false; error: string }

/**
 * Send the embassy email. Prefers Gmail SMTP (sends from the configured Gmail
 * account, like the original Apps Script — no domain needed); falls back to
 * Resend if a Gmail account isn't configured. Returns "skipped" if neither is
 * set, so the rest of the pipeline (ID, summary, audit) still runs.
 */
export async function sendEmail(args: {
  to: string
  cc: string[]
  subject: string
  html: string
}): Promise<SendResult> {
  if (!args.to) {
    return { sent: false, skipped: true, reason: 'No destination address configured' }
  }

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  // Preferred: send from a real Gmail account via SMTP + App Password.
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
      await transporter.sendMail({
        from: `"TFA Community Welfare" <${gmailUser}>`,
        to: args.to,
        cc: args.cc.length ? args.cc.join(',') : undefined,
        subject: args.subject,
        html: args.html,
      })
      return { sent: true }
    } catch (err) {
      return { sent: false, skipped: false, error: String(err) }
    }
  }

  // Fallback: Resend (requires a verified domain to reach arbitrary recipients).
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    return { sent: false, skipped: true, reason: 'Email provider not configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        cc: args.cc.length ? args.cc : undefined,
        subject: args.subject,
        html: args.html,
      }),
    })
    if (!res.ok) {
      return { sent: false, skipped: false, error: `${res.status} ${await res.text()}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, skipped: false, error: String(err) }
  }
}
