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
  caseRowId,
  caseType,
  affectedName,
  newStatus,
  resolvedBy,
  resolutionNote,
  assignedEmirate,
  infoRequestMessage,
}: {
  to: string
  reporterName: string | null
  caseId: string
  caseRowId?: string
  caseType: string
  affectedName: string | null
  newStatus: string
  resolvedBy?: string | null
  resolutionNote?: string | null
  assignedEmirate?: string | null
  infoRequestMessage?: string | null
}): Promise<void> {
  const label = STATUS_LABEL[newStatus] ?? newStatus
  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const isResolved = newStatus === 'resolved' || newStatus === 'closed'
  const isMoreInfo = newStatus === 'need_more_info'

  // Build case link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const caseLink = appUrl && caseRowId
    ? `<p style="margin-top:16px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">View case ${caseId} in Ashraya →</a></p>`
    : ''

  // CC the assigned embassy only on resolution
  const cc: string[] = []
  if (isResolved && assignedEmirate) {
    const embassyEmail = assignedEmirate === 'Abu Dhabi'
      ? (process.env.EMAIL_ABU_DHABI ?? '')
      : (process.env.EMAIL_DUBAI ?? '')
    if (embassyEmail) cc.push(embassyEmail)
  }

  // Resolution summary block
  const resolutionBlock = isResolved && (resolvedBy || resolutionNote)
    ? `<p><strong>Resolution details:</strong><br>${resolvedBy ? `Handled by: ${resolvedBy}<br>` : ''}${resolutionNote ? `Note: ${resolutionNote}` : ''}</p>`
    : ''

  // Subject and body vary by status
  const subject = isMoreInfo
    ? `Action required: Additional information needed — ${caseId}`
    : `Case update: ${caseId} — ${label}`

  const infoBlock = infoRequestMessage
    ? `<div style="background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;margin:12px 0;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.04em">Information required</p>
        <p style="margin:0;font-size:14px;color:#333;">${infoRequestMessage.replace(/\n/g, '<br>')}</p>
       </div>`
    : `<p>Please log in to Ashraya and provide the additional information requested.</p>`

  const body = isMoreInfo
    ? `<p>The Indian Embassy has reviewed case <strong>${caseId}</strong> (${caseType}${affectedName ? ` — ${affectedName}` : ''}) and requires the following information before they can proceed.</p>
${infoBlock}
${caseLink}`
    : `<p>Case <strong>${caseId}</strong> (${caseType}${affectedName ? ` — ${affectedName}` : ''}) has been updated to: <strong>${label}</strong>.</p>
${resolutionBlock}
${caseLink}`

  await sendEmail({
    to,
    cc,
    subject,
    html: `<p>${greeting},</p>
${body}
<p>For any queries, please contact the TFA admin team at <a href="mailto:uae.ashraya@gmail.com">uae.ashraya@gmail.com</a>.</p>
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
