import { getCaseType } from '@/lib/caseConfig'
import { PRIORITY_DOT, type Priority } from '@/lib/caseUtils'

export type CaseEmailInput = {
  org_name: string
  case_id: string | null
  case_type: string
  severity: Priority
  case_brief: string | null
  date_of_incident: string | null
  name: string | null
  gender: string | null
  age: number | null
  passport: string | null
  eid: string | null
  phone: string | null
  company_name: string | null
  company_phone: string | null
  company_email: string | null
  company_location: string | null
  reporter_name: string | null
  reporter_passport: string | null
  reporter_eid: string | null
  reporter_phone: string | null
  reporter_email: string | null
  visa_emirate: string | null
  details: Record<string, unknown>
  polished_summary: string
  attachments: { label: string; url: string }[]
  case_url?: string | null
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const na = (v: unknown, fallback = 'Not Available'): string =>
  v === null || v === undefined || v === '' ? fallback : esc(v)

const row = (label: string, value: string) =>
  `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`

const TABLE_OPEN =
  '<table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse; width: 100%; font-size: 13px;">'

const SEVERITY_LABEL: Record<Priority, string> = {
  critical: 'CRITICAL',
  high: 'HIGH PRIORITY',
  medium: 'MEDIUM PRIORITY',
  normal: 'ROUTINE',
}

/** Front-loaded severity + 3-line brief, shown before any data tables so the ask is read first. */
function briefBanner(c: CaseEmailInput): string {
  const color = PRIORITY_DOT[c.severity]
  const bodyLines = (c.case_brief ?? 'Review case details below.')
    .split('\n')
    .filter(Boolean)
    .map((line) => `<div>${esc(line)}</div>`)
    .join('')
  return `
    <div style="margin: 16px 0; border-left: 6px solid ${color}; background-color: ${color}15; padding: 12px 16px;">
      <div style="font-weight: 700; color: ${color}; letter-spacing: 0.5px; margin-bottom: 6px;">
        ${SEVERITY_LABEL[c.severity]}
      </div>
      <div style="font-size: 14px; color: #333;">${bodyLines}</div>
    </div>`
}

/** Subject line — same shape as the original script. */
export function buildSubject(c: CaseEmailInput): string {
  const id = c.case_id ?? 'TFA'
  return `${id}: ${c.case_type} - ${c.name ?? 'Unknown'}`
}

/** Case-type-specific details table, mirroring buildAdditionalDetailsSection. */
function additionalDetailsSection(c: CaseEmailInput): string {
  const def = getCaseType(c.case_type)
  if (!def) return ''
  const rows = def.fields
    .map((f) => {
      const v = c.details[f.key]
      if (v === null || v === undefined || v === '') return ''
      const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : esc(v)
      return row(f.label, display)
    })
    .join('')
  if (!rows) return ''
  return `
    <p style="margin-top: 20px;"><strong>Additional Case Details:</strong></p>
    ${TABLE_OPEN}${rows}</table>`
}

/** Full HTML body of the embassy email (ported from the Apps Script template). */
export function buildEmailHtml(c: CaseEmailInput): string {
  const hasCompany =
    c.company_name || c.company_phone || c.company_email || c.company_location

  const companySection = hasCompany
    ? `
    <h3 style="margin-top: 20px;">Company / Agent Details</h3>
    ${TABLE_OPEN}
      ${c.company_name ? row('Company / Agent Name', na(c.company_name)) : ''}
      ${c.company_phone ? row('Company Phone', na(c.company_phone)) : ''}
      ${c.company_email ? row('Company Email', na(c.company_email)) : ''}
      ${c.company_location ? row('Company Location', na(c.company_location)) : ''}
    </table>`
    : ''

  const attachmentsSection =
    c.attachments.length > 0
      ? `
    <p style="margin-top: 20px;"><strong>Attachments:</strong></p>
    <ul>${c.attachments
      .map(
        (a) =>
          `<li><a href="${esc(a.url)}" target="_blank">${esc(a.label)}</a></li>`,
      )
      .join('')}</ul>`
      : ''

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
      <p>Dear <strong>Sir/Madam</strong>,</p>
      <p>We are reporting the following case submitted by our local community volunteer:</p>

      ${briefBanner(c)}

      <h3>Affected Individual</h3>
      ${TABLE_OPEN}
        ${row('Date of Incident', na(c.date_of_incident, 'Not Provided'))}
        ${row('Case Type', esc(c.case_type))}
        ${row('Name', na(c.name))}
        ${row('Gender', na(c.gender, 'Not Provided'))}
        ${row('Age', na(c.age, 'Not Provided'))}
        ${row('Passport Number', na(c.passport))}
        ${row('Emirates ID', na(c.eid))}
        ${row('Phone', na(c.phone))}
        ${row('Visa / Residence Emirate', na(c.visa_emirate, 'Not Provided'))}
      </table>

      ${additionalDetailsSection(c)}
      ${companySection}

      <h3 style="margin-top: 20px;">Reported By</h3>
      ${TABLE_OPEN}
        ${row('Name', na(c.reporter_name))}
        ${c.reporter_passport ? row('Passport Number', na(c.reporter_passport)) : ''}
        ${c.reporter_eid ? row('Emirates ID', na(c.reporter_eid)) : ''}
        ${row('Phone', na(c.reporter_phone))}
        ${row('Email', na(c.reporter_email, 'Not Provided'))}
      </table>

      <p style="margin-top: 20px;"><strong>Case Summary:</strong></p>
      <div style="background-color: #f9f9f9; padding: 10px; border-left: 3px solid #007BFF;">
        ${esc(c.polished_summary).replace(/\n/g, '<br>')}
      </div>

      ${attachmentsSection}

      ${c.case_url ? `
      <p style="margin-top: 24px;">
        <a href="${esc(c.case_url)}"
           style="display:inline-block;background:#1a2e4a;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
          View case ${esc(c.case_id ?? '')} in Ashraya →
        </a>
      </p>` : ''}

      <p style="margin-top: 30px;">
        Kind regards,<br>
        ${esc(c.org_name)}<br>
      </p>

      <p style="font-size: 12px; color: gray;">
        Note: This case has been reported in good faith by a community
        volunteer of ${esc(c.org_name)}. All attachments are provided as
        received.
      </p>
    </div>`
}
