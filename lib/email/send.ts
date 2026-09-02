import 'server-only'

import nodemailer from 'nodemailer'

type StatusConfig = { label: string; color: string; bg: string; body: string }

const STATUS_CONFIG: Record<string, StatusConfig> = {
  sent: {
    label: 'Forwarded to Embassy',
    color: '#185FA5', bg: '#E6F1FB',
    body:  'Your case has been forwarded to the Indian Embassy and is now awaiting their review.',
  },
  acknowledged: {
    label: 'Embassy Acknowledged',
    color: '#3B6D11', bg: '#EBF5E3',
    body:  'The Indian Embassy has acknowledged receipt of your case.',
  },
  in_progress: {
    label: 'Under Process',
    color: '#7C4A00', bg: '#FAEEDA',
    body:  'The Indian Embassy has confirmed that your case is currently under process.',
  },
  need_more_info: {
    label: 'Information Requested',
    color: '#7C4A00', bg: '#FAEEDA',
    body:  'The Indian Embassy has reviewed your case and requires additional information before proceeding.',
  },
  resolved: {
    label: 'Resolved',
    color: '#3B6D11', bg: '#EBF5E3',
    body:  'The Indian Embassy has confirmed that your case has been resolved.',
  },
  closed: {
    label: 'Closed',
    color: '#444441', bg: '#F1EFE8',
    body:  'Your case has been closed.',
  },
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
  outcome,
  assignedEmirate,
  infoRequestMessage,
  abuDhabiEmail,
  dubaiEmail,
  caseSummary,
  followUpUrl,
  followUpAvailableDate,
  handlingOfficer,
  victimEmail,
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
  outcome?: string | null
  assignedEmirate?: string | null
  infoRequestMessage?: string | null
  abuDhabiEmail?: string
  dubaiEmail?: string
  caseSummary?: string | null
  followUpUrl?: string | null
  followUpAvailableDate?: string | null
  handlingOfficer?: string | null
  victimEmail?: string | null
}): Promise<void> {
  const cfg: StatusConfig = STATUS_CONFIG[newStatus] ?? {
    label: newStatus, color: '#444441', bg: '#F1EFE8',
    body: 'There has been an update to your case.',
  }

  // Proper mission name for use in email copy
  const missionName =
    assignedEmirate === 'Dubai'     ? 'Consulate General of India — Dubai' :
    assignedEmirate === 'Abu Dhabi' ? 'Embassy of India — Abu Dhabi' :
    'the Indian Mission'

  // Override body text for statuses that reference the mission name
  const bodyText =
    newStatus === 'sent'
      ? `Your case has been forwarded to ${missionName} and is now awaiting their review.`
      : newStatus === 'acknowledged'
      ? `${missionName} has acknowledged receipt of your case.`
      : newStatus === 'in_progress'
      ? `${missionName} has confirmed that your case is currently under process.`
      : cfg.body

  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const isResolved = newStatus === 'resolved' || newStatus === 'closed'
  const isMoreInfo = newStatus === 'need_more_info'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const caseLink = appUrl && caseRowId
    ? `<p style="margin-top:16px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">View case ${caseId} in Ashraya →</a></p>`
    : ''

  // CC the assigned embassy only on resolution
  const cc: string[] = []
  if (isResolved && assignedEmirate) {
    const embassyEmail = assignedEmirate === 'Abu Dhabi'
      ? (abuDhabiEmail ?? process.env.EMAIL_ABU_DHABI ?? '')
      : (dubaiEmail    ?? process.env.EMAIL_DUBAI     ?? '')
    if (embassyEmail) cc.push(embassyEmail)
  }

  const subject = isMoreInfo
    ? `Welfare case ${caseId} — additional information needed`
    : newStatus === 'sent'
    ? `Welfare case ${caseId} — forwarded to ${missionName}`
    : newStatus === 'acknowledged'
    ? `Welfare case ${caseId} — acknowledged by ${missionName}`
    : newStatus === 'in_progress'
    ? `Welfare case ${caseId} — under process at ${missionName}`
    : isResolved
    ? `Welfare case ${caseId} — resolved`
    : `Welfare case ${caseId} — ${cfg.label}`

  // Status badge shown at the top of every email
  const statusBadge = `<div style="margin:0 0 16px;">
  <span style="display:inline-block;background:${cfg.bg};border:1px solid ${cfg.color}55;padding:5px 14px;border-radius:4px;font-size:12px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:0.06em;">
    &#9679;&nbsp;${cfg.label}
  </span>
</div>`

  // Case details block — always shown
  const detailsBlock = `<div style="background:#f3f6f9;padding:10px 14px;margin:12px 0;border-radius:4px;border-left:3px solid #d0d7e0;">
  <p style="margin:0;font-size:13px;line-height:1.8;"><strong>Reference:</strong> ${caseId}<br><strong>Case type:</strong> ${caseType}${affectedName ? `<br><strong>Individual:</strong> ${affectedName}` : ''}${assignedEmirate ? `<br><strong>Mission:</strong> ${missionName}` : ''}${handlingOfficer ? `<br><strong>Handling officer:</strong> ${handlingOfficer}` : ''}</p>
</div>`

  const infoBlock = infoRequestMessage
    ? `<div style="background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;margin:12px 0;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.04em">Information required</p>
        <p style="margin:0;font-size:14px;color:#333;">${infoRequestMessage.replace(/\n/g, '<br>')}</p>
       </div>`
    : `<p>Please log in to Ashraya and provide the additional information requested.</p>`

  const resolutionBlock = isResolved && (outcome || resolvedBy || resolutionNote)
    ? `<div style="background:#f3faf0;border-left:3px solid #3B6D11;padding:10px 14px;margin:12px 0;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#3B6D11;text-transform:uppercase;letter-spacing:.04em">Resolution details</p>
        <p style="margin:0;font-size:13px;color:#333;line-height:1.7;">${outcome ? `Outcome: ${outcome}<br>` : ''}${resolvedBy ? `Handled by: ${resolvedBy}<br>` : ''}${resolutionNote ? `Note: ${resolutionNote}` : ''}</p>
       </div>`
    : ''

  const summaryBlock = newStatus === 'sent' && caseSummary
    ? `<div style="background:#f3f6f9;border-left:3px solid #081f3b;padding:10px 14px;margin:12px 0;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#657286;text-transform:uppercase;letter-spacing:.04em">Summary forwarded to ${missionName}</p>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.55">${caseSummary.replace(/\n/g, '<br>')}</p>
       </div>`
    : ''

  const followUpBlock = !isMoreInfo && !isResolved && followUpUrl
    ? `<div style="margin:20px 0;padding:14px 16px;background:#f8f9fa;border-radius:8px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;font-size:13px;color:#555;">If you have not received an update, you may request a follow-up once the standard review period has passed.</p>
        <a href="${followUpUrl}" style="display:inline-block;background:#081f3b;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-weight:600;font-size:14px;">Follow Up on This Case</a>
        ${followUpAvailableDate ? `<p style="margin:9px 0 0;font-size:11px;color:#999;">Button activates on ${followUpAvailableDate}</p>` : ''}
       </div>`
    : ''

  const body = `${statusBadge}
<p>${bodyText}</p>
${detailsBlock}
${summaryBlock}
${isMoreInfo ? infoBlock : ''}
${resolutionBlock}
${!isMoreInfo && !isResolved ? '<p>You will receive a further update as the Embassy processes this case.</p>' : ''}
${followUpBlock}
${caseLink}`

  await sendEmail({
    to,
    cc,
    subject,
    html: `<p>${greeting},</p>
${body}
<p>For any queries, please contact the TFA admin team at <a href="mailto:tfa.abudhabi@gmail.com">tfa.abudhabi@gmail.com</a>.</p>
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })

  // Send a separate simplified notification to the affected person if their email is on file.
  // Links to the public /status page — no login required.
  if (victimEmail && victimEmail !== to) {
    const statusLink = appUrl && caseId
      ? `<p style="margin-top:16px"><a href="${appUrl}/status/${caseId}" style="color:#0C447C;font-weight:600">Check your case status →</a></p>`
      : ''
    const victimBody =
      newStatus === 'resolved' || newStatus === 'closed'
        ? 'We are pleased to inform you that your welfare case has been resolved.'
        : newStatus === 'in_progress'
        ? 'Your welfare case is currently under process with the Indian Mission in the UAE.'
        : newStatus === 'acknowledged'
        ? 'The Indian Mission in the UAE has acknowledged your welfare case.'
        : newStatus === 'sent'
        ? 'Your welfare case has been forwarded to the Indian Mission in the UAE for review.'
        : 'There has been an update to your welfare case.'
    await sendEmail({
      to: victimEmail,
      cc: [],
      subject: `Update on your welfare case — ${caseId}`,
      html: `<p>Dear${affectedName ? ` ${affectedName}` : ''},</p>
<p>${victimBody}</p>
<div style="background:#f3f6f9;padding:10px 14px;margin:12px 0;border-radius:4px;border-left:3px solid #d0d7e0;">
  <p style="margin:0;font-size:13px;line-height:1.8;"><strong>Case reference:</strong> ${caseId}<br><strong>Case type:</strong> ${caseType}</p>
</div>
${statusLink}
<p>This case was filed on your behalf through the Telangana Friends Association (TFA) Community Welfare programme. For any queries, please contact the TFA team at <a href="mailto:tfa.abudhabi@gmail.com">tfa.abudhabi@gmail.com</a>.</p>
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
    })
  }
}

export async function sendReporterFollowUpNotification({
  caseId,
  caseRowId,
  caseType,
  affectedName,
  reporterName,
  reporterPhone,
  appUrl,
}: {
  caseId: string
  caseRowId: string
  caseType: string
  affectedName: string | null
  reporterName: string | null
  reporterPhone: string | null
  appUrl: string | null
}): Promise<void> {
  const adminEmail = process.env.EMAIL_TFA_ADMIN ?? 'uae.ashraya@gmail.com'
  const caseLink = appUrl
    ? `<p style="margin-top:12px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">Open case ${caseId} in Ashraya →</a></p>`
    : ''

  await sendEmail({
    to: adminEmail,
    cc: [],
    subject: `Reporter follow-up request — ${caseId}`,
    html: `<p>Dear TFA Admin,</p>
<p>The reporter for case <strong>${caseId}</strong> has requested a status update.</p>
<p style="margin:4px 0">
  <strong>Case type:</strong> ${caseType}${affectedName ? `<br><strong>Individual:</strong> ${affectedName}` : ''}${reporterName ? `<br><strong>Reporter:</strong> ${reporterName}` : ''}${reporterPhone ? ` · ${reporterPhone}` : ''}
</p>
<p>Please log in to Ashraya to update the case status or reply to the reporter.</p>
${caseLink}
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })
}

export async function sendCaseReturnedEmail({
  to,
  reporterName,
  caseId,
  caseRowId,
  caseType,
  adminNote,
}: {
  to: string
  reporterName: string | null
  caseId: string | null
  caseRowId: string
  caseType: string
  adminNote: string
}): Promise<void> {
  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const caseLink = appUrl
    ? `<p style="margin-top:16px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">Open case ${caseId ?? caseRowId} in Ashraya →</a></p>`
    : ''

  await sendEmail({
    to,
    cc: [],
    subject: `Action needed: your welfare case ${caseId ?? caseRowId} needs attention`,
    html: `<p>${greeting},</p>
<p>Your welfare case <strong>${caseId ?? caseRowId}</strong> (${caseType}) has been reviewed by the TFA admin team and requires the following before it can be forwarded to the Embassy:</p>
<div style="background:#fffbeb;border-left:3px solid #d97706;padding:10px 14px;margin:12px 0;border-radius:4px;">
  <p style="margin:0;font-size:14px;color:#333;">${adminNote.replace(/\n/g, '<br>')}</p>
</div>
<p>Please log in to Ashraya, update the case with the information above, and resubmit. The case will then be reviewed again before being sent to the Embassy.</p>
${caseLink}
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
 * The reporter is NOT CC'd here — they receive a separate reporter-only email
 * so they never see the embassy action buttons or signed token links.
 */
export function computeRecipients(
  reportingEmirate: string,
  visaEmirate: string,
  _reporterEmail: string | null,
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
 * Wraps a bare HTML fragment in a full email document structure.
 * Gmail, Outlook, and government mail servers all expect a real DOCTYPE —
 * bare fragments are often classified as spam or rendered incorrectly.
 */
function wrapEmailHtml(content: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <title>TFA Community Welfare</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="680" style="max-width:680px;background-color:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:28px 32px;font-family:Arial,sans-serif;font-size:14px;color:#333333;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px;background-color:#f8f9fa;border-top:1px solid #e2e8f0;font-size:11px;color:#999999;font-family:Arial,sans-serif;">
              TFA Community Welfare &bull; UAE &bull;
              <a href="mailto:tfa.abudhabi@gmail.com" style="color:#999999;">tfa.abudhabi@gmail.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#9679;/g, '●')
    .replace(/&rarr;/g, '→')
    .replace(/&#8594;/g, '→')
    .replace(/&#183;/g, '·')
    .replace(/&thinsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function sendCaseSubmittedEmail({
  to,
  reporterName,
  caseType,
  affectedName,
  caseRowId,
}: {
  to: string
  reporterName: string | null
  caseType: string
  affectedName: string | null
  caseRowId: string
}): Promise<void> {
  const greeting = reporterName?.trim() ? `Dear ${reporterName.trim()}` : 'Dear Volunteer'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const caseLink = appUrl
    ? `<p style="margin-top:16px"><a href="${appUrl}/cases/${caseRowId}" style="color:#0C447C;font-weight:600">Track your case in Ashraya →</a></p>`
    : ''

  await sendEmail({
    to,
    cc: [],
    subject: `Welfare case received — ${caseType}`,
    html: `<p>${greeting},</p>
<p>Thank you for filing a welfare case through Ashraya. We have received your submission and it is now being reviewed by the TFA Admin team before being forwarded to the Embassy of India.</p>
<div style="background:#f3f6f9;padding:10px 14px;margin:12px 0;border-radius:4px;border-left:3px solid #d0d7e0;">
  <p style="margin:0;font-size:13px;line-height:1.8;"><strong>Case type:</strong> ${caseType}${affectedName ? `<br><strong>Individual:</strong> ${affectedName}` : ''}</p>
</div>
<p>You will receive an email notification at each stage as the case progresses. If you need to add information or follow up, you can log in to Ashraya at any time.</p>
${caseLink}
<p>For any queries, please contact the TFA admin team at <a href="mailto:tfa.abudhabi@gmail.com">tfa.abudhabi@gmail.com</a>.</p>
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })
}

export async function sendNewCaseAdminAlert({
  reporterName,
  caseType,
  affectedName,
  caseRowId,
  volunteerSeverity,
}: {
  reporterName: string | null
  caseType: string
  affectedName: string | null
  caseRowId: string
  volunteerSeverity?: string | null
}): Promise<void> {
  const adminEmail = process.env.EMAIL_TFA_ADMIN ?? 'uae.ashraya@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  const reviewLink = appUrl
    ? `<p style="margin-top:12px"><a href="${appUrl}/admin?tab=review" style="color:#0C447C;font-weight:600">Review in Ashraya →</a></p>`
    : ''
  const severityNote = volunteerSeverity && volunteerSeverity !== 'Normal'
    ? `<p style="margin:8px 0 0;"><strong>Volunteer priority:</strong> <span style="color:${volunteerSeverity === 'Critical' ? '#c0392b' : '#e67e22'};">${volunteerSeverity}</span></p>`
    : ''

  await sendEmail({
    to: adminEmail,
    cc: [],
    subject: `New case for review — ${caseType}${affectedName ? ` (${affectedName})` : ''}`,
    html: `<p>Dear TFA Admin,</p>
<p>A new welfare case has been submitted and is awaiting your review before being forwarded to the Embassy.</p>
<div style="background:#f3f6f9;padding:10px 14px;margin:12px 0;border-radius:4px;border-left:3px solid #d0d7e0;">
  <p style="margin:0;font-size:13px;line-height:1.8;"><strong>Case type:</strong> ${caseType}${affectedName ? `<br><strong>Individual:</strong> ${affectedName}` : ''}${reporterName ? `<br><strong>Reported by:</strong> ${reporterName}` : ''}</p>
  ${severityNote}
</div>
${reviewLink}
<p>Kind regards,<br>Ashraya · TFA Community Welfare</p>`,
  })
}

export async function sendOfficerAssignmentEmail({
  to,
  officerName,
  caseId,
  caseType,
  affectedName,
  appUrl,
}: {
  to: string
  officerName: string | null
  caseId: string
  caseType: string
  affectedName: string | null
  appUrl: string | null
}): Promise<void> {
  const greeting = officerName ? `Dear ${officerName},` : 'Dear Officer,'
  const caseLink = appUrl ? `<p><a href="${appUrl}/cases" style="color:#1a2e4a;">View case in Ashraya</a></p>` : ''
  await sendEmail({
    to,
    cc: [],
    subject: `Case assigned to you: ${caseId} — ${caseType}`,
    html: `<p>${greeting}</p>
<p>A welfare case has been assigned to you for processing via the Ashraya platform.</p>
<table style="border-collapse:collapse;font-size:13px;margin:12px 0;">
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Case reference</td><td style="font-family:monospace;font-weight:600;">${caseId}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Case type</td><td>${caseType}</td></tr>
  ${affectedName ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">Affected individual</td><td>${affectedName}</td></tr>` : ''}
</table>
${caseLink}
<p style="color:#64748b;font-size:12px;">This assignment was recorded when the case was marked as Under Process. If this was done in error, please contact the TFA admin team.</p>`,
  })
}

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
  text?: string
}): Promise<SendResult> {
  if (!args.to) {
    return { sent: false, skipped: true, reason: 'No destination address configured' }
  }

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  // Preferred: send from a real Gmail account via SMTP + App Password.
  const wrappedHtml = wrapEmailHtml(args.html)
  const plainText = args.text ?? htmlToPlainText(args.html)

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
      await transporter.sendMail({
        from:    `"TFA Community Welfare" <${gmailUser}>`,
        replyTo: gmailUser,
        to:      args.to,
        cc:      args.cc.length ? args.cc.join(',') : undefined,
        subject: args.subject,
        text:    plainText,
        html:    wrappedHtml,
        headers: {
          'X-Mailer':        'Ashraya-Welfare/1.0',
          'X-Entity-Ref-ID': `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        },
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
        text: plainText,
        html: wrappedHtml,
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
