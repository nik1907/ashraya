import 'server-only'

import nodemailer from 'nodemailer'

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
 * Decide who the embassy email goes to based on where the affected person's
 * visa / residence is:
 *  - Abu Dhabi visa  → TO: Abu Dhabi mission,   CC: Dubai consulate
 *  - Other Emirates  → TO: Dubai consulate,      CC: Abu Dhabi mission
 * Both embassies always receive a copy. The reporter is also CC'd if they
 * supplied a valid email address.
 */
export function computeRecipients(
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

  let to: string
  let other: string

  if (visaEmirate === 'Other Emirates') {
    to = dubai
    other = abuDhabi
  } else {
    // Default: Abu Dhabi
    to = abuDhabi
    other = dubai
  }

  const cc: string[] = []
  if (other) cc.push(other)
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
