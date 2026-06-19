import 'server-only'

import nodemailer from 'nodemailer'

export type Recipients = { to: string; cc: string[] }

/**
 * Decide who the embassy email goes to, ported from the Apps Script:
 *  - default: Abu Dhabi mission
 *  - "Other emirates": Dubai consulate, CC Abu Dhabi
 *  - always CC the reporter (if they gave a valid email) and any configured CCs
 */
export function computeRecipients(
  reportingEmirate: string,
  reporterEmail: string | null,
  env: {
    EMAIL_ABU_DHABI?: string
    EMAIL_DUBAI?: string
    EMAIL_CC?: string
  } = process.env as Record<string, string | undefined>,
): Recipients {
  const abuDhabi = env.EMAIL_ABU_DHABI ?? ''
  const dubai = env.EMAIL_DUBAI ?? ''

  let to = abuDhabi
  const cc: string[] = []

  if (reportingEmirate === 'Other emirates') {
    to = dubai
    if (abuDhabi) cc.push(abuDhabi)
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
