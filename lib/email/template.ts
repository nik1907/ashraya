import { getCaseType } from '@/lib/caseConfig'
import type { Priority } from '@/lib/caseUtils'

// ── Types ─────────────────────────────────────────────────────────────────────

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

type AlertLevel = 'red' | 'amber' | 'green' | 'gray'

type VerifyField = {
  label: string
  getValue: (c: CaseEmailInput) => string
  getAlert: (c: CaseEmailInput) => AlertLevel
}

// ── Email-safe colour config ───────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Priority, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#7B1111', fg: '#FCEBEB', label: 'CRISIS'          },
  high:     { bg: '#7C4A00', fg: '#FAEEDA', label: 'HIGH PRIORITY'   },
  medium:   { bg: '#185FA5', fg: '#E6F1FB', label: 'MEDIUM PRIORITY' },
  normal:   { bg: '#444441', fg: '#F1EFE8', label: 'ROUTINE'         },
}

const ALERT_DOT: Record<AlertLevel, string> = {
  red:   '<span style="color:#A32D2D;font-weight:700;">&#9679;</span>',
  amber: '<span style="color:#7C4A00;font-weight:700;">&#9679;</span>',
  green: '<span style="color:#3B6D11;font-weight:700;">&#9679;</span>',
  gray:  '<span style="color:#888880;">&#9679;</span>',
}

const ALERT_VALUE_STYLE: Record<AlertLevel, string> = {
  red:   'color:#A32D2D;font-weight:600;',
  amber: 'color:#6B3A00;font-weight:600;',
  green: 'color:#3B6D11;',
  gray:  'color:#333;',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const na = (v: unknown, fallback = 'Not available'): string =>
  v === null || v === undefined || v === '' ? fallback : esc(v)

const TABLE_OPEN =
  '<table cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;border-color:#a8a5a0;">'

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 10px;background:#e9e7e2;color:#333;font-size:12px;white-space:nowrap;width:38%;border-color:#a8a5a0;"><strong>${label}</strong></td>
    <td style="padding:7px 10px;font-size:13px;border-color:#a8a5a0;">${value}</td>
  </tr>`
}

function dStr(c: CaseEmailInput, key: string): string {
  const v = c.details[key]
  return v === null || v === undefined ? '' : String(v)
}

function dBool(c: CaseEmailInput, key: string): boolean | null {
  const v = c.details[key]
  if (v === true  || v === 'Yes') return true
  if (v === false || v === 'No')  return false
  return null
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

/** First meaningful line of case_brief used as the one-line BLUF headline. */
function extractBluf(c: CaseEmailInput): string {
  if (c.case_brief) {
    const line = c.case_brief.split('\n').find((l) => l.trim().length > 10)
    if (line) return esc(line.trim())
  }
  // Fallback: first sentence of polished_summary
  const match = c.polished_summary.replace(/^Dear [^,]+,\s*/i, '').match(/[^.!?]+[.!?]/)
  return match ? esc(match[0].trim()) : esc(c.polished_summary.slice(0, 140).trim())
}

/**
 * Strip "Dear Sir/Madam," greeting and "Yours sincerely / Kind regards" closing
 * from a polished_summary so only the body paragraphs are rendered in the email.
 */
function stripLetterWrapper(text: string): string {
  const lines = text.split('\n')
  // Drop leading blanks + greeting
  let start = 0
  while (start < lines.length && lines[start].trim() === '') start++
  if (lines[start]?.trim().toLowerCase().startsWith('dear')) start++
  // Drop trailing blanks + closing
  let end = lines.length
  while (end > start && lines[end - 1].trim() === '') end--
  const closings = ['yours sincerely', 'yours faithfully', 'kind regards']
  while (
    end > start &&
    closings.some((c) => lines[end - 1].trim().toLowerCase().startsWith(c))
  ) end--
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end).join('\n').trim()
}

// ── Section builders ──────────────────────────────────────────────────────────

function sectionLabel(text: string): string {
  return `<p style="margin:20px 0 6px;font-size:11px;font-weight:700;color:#1a2e4a;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #c8c5be;padding-bottom:4px;">${text}</p>`
}

function buildSeverityBar(c: CaseEmailInput): string {
  const cfg = SEVERITY_CONFIG[c.severity]
  const caseIdLine = c.case_id
    ? `<p style="margin:4px 0 0;font-family:monospace;font-size:11px;color:#555;">Case ref: ${esc(c.case_id)}</p>`
    : ''
  return `<table cellpadding="0" cellspacing="0" width="100%" style="background:${cfg.bg};">
  <tr>
    <td style="padding:8px 16px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${cfg.fg};letter-spacing:0.06em;">
      ${cfg.label} &nbsp;&#183;&nbsp; ${esc(c.case_type)}
    </td>
  </tr>
</table>
<div style="padding:4px 16px 8px;background:#f5f5f5;">${caseIdLine}</div>`
}

function buildBluf(c: CaseEmailInput): string {
  const bluf = extractBluf(c)
  if (!bluf) return ''
  const incidentNote = c.date_of_incident ? ` &nbsp;&#183;&nbsp; Incident: ${esc(c.date_of_incident)}` : ''
  return `<div style="padding:14px 16px;background:#f7f7f7;border-left:4px solid #1a2e4a;margin:0;">
  <p style="margin:0;font-size:14px;font-weight:700;color:#1a2e4a;line-height:1.5;">${bluf}</p>
  <p style="margin:4px 0 0;font-size:11px;color:#888;">${esc(c.org_name)}${incidentNote}</p>
</div>`
}

function buildVerifySection(c: CaseEmailInput): string {
  const fields = VERIFY_FIELDS[c.case_type]
  if (!fields || fields.length === 0) return ''

  const rows = fields
    .map((f) => {
      const value = f.getValue(c)
      const alert = f.getAlert(c)
      return `<tr>
    <td style="padding:7px 10px;font-size:12px;color:#333;background:#e9e7e2;width:40%;border-color:#a8a5a0;">
      ${ALERT_DOT[alert]}&nbsp;<strong>${esc(f.label)}</strong>
    </td>
    <td style="padding:7px 10px;font-size:13px;border-color:#a8a5a0;${ALERT_VALUE_STYLE[alert]}">${esc(value)}</td>
  </tr>`
    })
    .join('')

  return `${sectionLabel('Key facts to verify')}
${TABLE_OPEN}${rows}</table>
<p style="font-size:10px;color:#aaa;margin:3px 0 12px;">
  &#9679; Red&thinsp;=&thinsp;urgent/unconfirmed &nbsp;&#183;&nbsp;
  &#9679; Amber&thinsp;=&thinsp;needs attention &nbsp;&#183;&nbsp;
  &#9679; Green&thinsp;=&thinsp;confirmed &nbsp;&#183;&nbsp;
  &#9679; Grey&thinsp;=&thinsp;informational
</p>`
}

function buildAdditionalDetails(c: CaseEmailInput): string {
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
  return `${sectionLabel('Additional case details')}${TABLE_OPEN}${rows}</table>`
}

// ── Verify fields by case type ────────────────────────────────────────────────
//
// Rules (no AI):
//   Red   = urgent / unconfirmed / missing critical info
//   Amber = needs attention / incomplete
//   Green = confirmed / present
//   Gray  = informational (no action required based on this field alone)

const VERIFY_FIELDS: Record<string, VerifyField[]> = {
  'Police Case / Detention': [
    {
      label: 'Days in detention',
      getValue: (c) => {
        const d = dStr(c, 'arrest_date')
        if (!d) return 'Arrest date not provided'
        const n = daysSince(d)
        return `${n} day${n !== 1 ? 's' : ''} (since ${d})`
      },
      getAlert: (c) => {
        const d = dStr(c, 'arrest_date')
        if (!d) return 'gray'
        const n = daysSince(d)
        return n >= 5 ? 'red' : n >= 2 ? 'amber' : 'green'
      },
    },
    {
      label: 'Charges filed',
      getValue: (c) => dStr(c, 'charges') || 'Not provided / unknown',
      getAlert: (c) => (dStr(c, 'charges') ? 'amber' : 'red'),
    },
    {
      label: 'Legal representative',
      getValue: (c) => dStr(c, 'lawyer_name') || 'None — not confirmed',
      getAlert: (c) => (dStr(c, 'lawyer_name') ? 'green' : 'amber'),
    },
    {
      label: 'Police station',
      getValue: (c) => dStr(c, 'police_station') || 'Not provided',
      getAlert: (c) => (dStr(c, 'police_station') ? 'gray' : 'amber'),
    },
    {
      label: 'Passport on record',
      getValue: (c) => (c.passport ? `Yes — ${c.passport}` : 'Not provided'),
      getAlert: (c) => (c.passport ? 'gray' : 'amber'),
    },
  ],

  'Unpaid Salary / Labor Exploitation': [
    {
      label: 'Amount due',
      getValue: (c) => {
        const v = c.details.amount_due
        return v != null && v !== '' ? `AED ${v}` : 'Not specified'
      },
      getAlert: (c) => (Number(c.details.amount_due) > 0 ? 'red' : 'amber'),
    },
    {
      label: 'MOL complaint filed',
      getValue: (c) => {
        const v = dBool(c, 'mol_complaint_filed')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'mol_complaint_filed')
        return v === true ? 'green' : v === false ? 'amber' : 'gray'
      },
    },
    {
      label: 'Employer name',
      getValue: (c) => c.company_name || 'Not provided',
      getAlert: (c) => (c.company_name ? 'gray' : 'amber'),
    },
    {
      label: 'Employer phone',
      getValue: (c) => c.company_phone || 'Not provided',
      getAlert: (c) => (c.company_phone ? 'gray' : 'amber'),
    },
  ],

  'Death': [
    {
      label: 'Body identified',
      getValue: (c) => {
        const v = dBool(c, 'body_identified')
        return v === true ? 'Yes' : v === false ? 'No — unidentified' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'body_identified')
        return v === false ? 'red' : v === true ? 'green' : 'amber'
      },
    },
    {
      label: 'Location of death',
      getValue: (c) => dStr(c, 'death_location') || 'Not provided',
      getAlert: (c) => (dStr(c, 'death_location') ? 'gray' : 'amber'),
    },
    {
      label: 'Hospital',
      getValue: (c) => dStr(c, 'hospital_name') || 'Not provided',
      getAlert: (_c) => 'gray',
    },
    {
      label: 'Next of kin contact',
      getValue: (c) => dStr(c, 'kin_contact') || 'Not provided',
      getAlert: (c) => (dStr(c, 'kin_contact') ? 'green' : 'red'),
    },
  ],

  'Repatriation of Dead Body': [
    {
      label: 'Documents available',
      getValue: (c) => {
        const v = dBool(c, 'documents_available')
        return v === true ? 'Yes' : v === false ? 'No — missing' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'documents_available')
        return v === false ? 'red' : v === true ? 'green' : 'amber'
      },
    },
    {
      label: 'Embassy coordination started',
      getValue: (c) => {
        const v = dBool(c, 'embassy_coordination_started')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'embassy_coordination_started')
        return v === true ? 'green' : v === false ? 'amber' : 'gray'
      },
    },
    {
      label: 'Relation to deceased',
      getValue: (c) => dStr(c, 'relation_to_deceased') || 'Not provided',
      getAlert: (_c) => 'gray',
    },
  ],

  'Missing Person': [
    {
      label: 'Police complaint filed',
      getValue: (c) => {
        const v = dBool(c, 'police_complaint_filed')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'police_complaint_filed')
        return v === false ? 'amber' : v === true ? 'green' : 'gray'
      },
    },
    {
      label: 'Last seen location',
      getValue: (c) => dStr(c, 'last_seen_location') || 'Unknown',
      getAlert: (c) => (dStr(c, 'last_seen_location') ? 'gray' : 'red'),
    },
    {
      label: 'Employer details',
      getValue: (c) => (c.company_name ? `Yes — ${c.company_name}` : 'Not provided'),
      getAlert: (c) => (c.company_name ? 'gray' : 'amber'),
    },
  ],

  'Hospitalized / Medical Emergency': [
    {
      label: 'Hospital',
      getValue: (c) => dStr(c, 'hospital_name') || 'Not provided',
      getAlert: (c) => (dStr(c, 'hospital_name') ? 'gray' : 'red'),
    },
    {
      label: 'Valid insurance',
      getValue: (c) => {
        const v = dBool(c, 'has_valid_insurance')
        return v === true ? 'Yes' : v === false ? 'No — uninsured' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'has_valid_insurance')
        return v === false ? 'red' : v === true ? 'green' : 'amber'
      },
    },
    {
      label: 'Admission date',
      getValue: (c) => dStr(c, 'admission_date') || 'Not provided',
      getAlert: (_c) => 'gray',
    },
    {
      label: 'Next of kin contact',
      getValue: (c) => dStr(c, 'kin_contact_number') || 'Not provided',
      getAlert: (c) => (dStr(c, 'kin_contact_number') ? 'green' : 'amber'),
    },
  ],

  'Employer Harassment / Abuse': [
    {
      label: 'Type of abuse',
      getValue: (c) => dStr(c, 'abuse_type') || 'Not specified',
      getAlert: (c) => (dStr(c, 'abuse_type') ? 'red' : 'amber'),
    },
    {
      label: 'Documents withheld',
      getValue: (c) => {
        const v = dBool(c, 'documents_withheld')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'documents_withheld')
        return v === true ? 'red' : v === false ? 'green' : 'amber'
      },
    },
    {
      label: 'Employer details',
      getValue: (c) =>
        c.company_name
          ? `${c.company_name}${c.company_phone ? ` · ${c.company_phone}` : ''}`
          : 'Not provided',
      getAlert: (c) => (c.company_name ? 'gray' : 'amber'),
    },
  ],

  'Documents Withheld by Employer': [
    {
      label: 'Documents withheld',
      getValue: (c) => {
        const v = dBool(c, 'documents_being_withheld')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'documents_being_withheld')
        return v === true ? 'red' : v === false ? 'green' : 'amber'
      },
    },
    {
      label: 'Which documents',
      getValue: (c) => dStr(c, 'which_documents') || 'Not specified',
      getAlert: (c) => (dStr(c, 'which_documents') ? 'gray' : 'amber'),
    },
    {
      label: 'Employer contact',
      getValue: (c) =>
        c.company_name
          ? `${c.company_name}${c.company_phone ? ` · ${c.company_phone}` : ''}`
          : 'Not provided',
      getAlert: (c) => (c.company_name ? 'gray' : 'amber'),
    },
  ],

  'Absconding': [
    {
      label: 'Valid visa',
      getValue: (c) => {
        const v = dBool(c, 'has_valid_visa')
        return v === true ? 'Yes' : v === false ? 'No — expired/invalid' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'has_valid_visa')
        return v === false ? 'amber' : v === true ? 'green' : 'gray'
      },
    },
    {
      label: 'Estimated overstay',
      getValue: (c) => {
        const v = c.details.estimated_overstay_days
        return v != null && v !== '' ? `${v} days` : 'Not known'
      },
      getAlert: (c) => {
        const v = Number(c.details.estimated_overstay_days)
        return v > 30 ? 'red' : v > 0 ? 'amber' : 'gray'
      },
    },
    {
      label: 'Last seen location',
      getValue: (c) => dStr(c, 'last_seen_location') || 'Unknown',
      getAlert: (_c) => 'gray',
    },
  ],

  'Overstay / Illegal Status': [
    {
      label: 'Visa expiry date',
      getValue: (c) => dStr(c, 'visa_expiry_date') || 'Not provided',
      getAlert: (_c) => 'amber',
    },
    {
      label: 'Reason for overstay',
      getValue: (c) => dStr(c, 'overstay_reason') || 'Not provided',
      getAlert: (_c) => 'gray',
    },
    {
      label: 'Intent',
      getValue: (c) => dStr(c, 'intent_exit_or_legalize') || 'Unknown',
      getAlert: (_c) => 'gray',
    },
  ],

  'Stranded Without Support': [
    {
      label: 'Current location',
      getValue: (c) => dStr(c, 'current_location') || 'Unknown',
      getAlert: (c) => (dStr(c, 'current_location') ? 'gray' : 'red'),
    },
    {
      label: 'Duration stranded',
      getValue: (c) => dStr(c, 'duration_stranded') || 'Not specified',
      getAlert: (_c) => 'amber',
    },
  ],

  'Visa Fraud / Fake Agent': [
    {
      label: 'Amount paid',
      getValue: (c) => {
        const v = c.details.amount_paid
        return v != null && v !== '' ? `AED ${v}` : 'Not specified'
      },
      getAlert: (c) => (Number(c.details.amount_paid) > 0 ? 'red' : 'gray'),
    },
    {
      label: 'Police complaint filed',
      getValue: (c) => {
        const v = dBool(c, 'police_complaint_filed')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'police_complaint_filed')
        return v === false ? 'amber' : v === true ? 'green' : 'gray'
      },
    },
  ],

  'Job Scam / Absconded Agents': [
    {
      label: 'Amount paid to agent',
      getValue: (c) => {
        const v = c.details.amount_paid
        return v != null && v !== '' ? `AED ${v}` : 'Not specified'
      },
      getAlert: (c) => (Number(c.details.amount_paid) > 0 ? 'red' : 'gray'),
    },
    {
      label: 'Agent / scammer details available',
      getValue: (c) => {
        const v = dBool(c, 'has_scammer_details')
        return v === true ? 'Available' : v === false ? 'Not available' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'has_scammer_details')
        return v === true ? 'green' : v === false ? 'amber' : 'gray'
      },
    },
    {
      label: 'Mode of approach',
      getValue: (c) => dStr(c, 'agent_approach_mode') || 'Not provided',
      getAlert: (_c) => 'gray',
    },
  ],

  'Child Welfare / Abandonment': [
    {
      label: "Child's age",
      getValue: (c) => {
        const v = c.details.child_age
        return v != null && v !== '' ? `${v} years` : 'Not provided'
      },
      getAlert: (_c) => 'gray',
    },
    {
      label: 'Guardian / caretaker',
      getValue: (c) => dStr(c, 'guardian_info') || 'Not provided',
      getAlert: (c) => (dStr(c, 'guardian_info') ? 'gray' : 'red'),
    },
    {
      label: 'Consulate coordination needed',
      getValue: (c) => {
        const v = dBool(c, 'consulate_coordination_needed')
        return v === true ? 'Yes — required' : v === false ? 'Not needed' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'consulate_coordination_needed')
        return v === true ? 'amber' : 'gray'
      },
    },
  ],

  'Request for Exit / Amnesty Case': [
    {
      label: 'Current visa status',
      getValue: (c) => dStr(c, 'current_visa_status') || 'Unknown',
      getAlert: (_c) => 'amber',
    },
    {
      label: 'Willing to leave voluntarily',
      getValue: (c) => {
        const v = dBool(c, 'willing_to_leave')
        return v === true ? 'Yes' : v === false ? 'No' : 'Unknown'
      },
      getAlert: (c) => {
        const v = dBool(c, 'willing_to_leave')
        return v === true ? 'green' : v === false ? 'amber' : 'gray'
      },
    },
    {
      label: 'Overstay fine details',
      getValue: (c) => dStr(c, 'overstay_fine_details') || 'Not known',
      getAlert: (_c) => 'gray',
    },
  ],
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Subject line — severity prefix + case ID + type + name. */
export function buildSubject(c: CaseEmailInput): string {
  const id     = c.case_id ?? 'TFA'
  const prefix = c.severity === 'critical' ? 'Critical: '
               : c.severity === 'high'     ? 'High priority: '
               : ''
  return `${prefix}${id}: ${c.case_type} — ${c.name ?? 'Unknown'}`
}

/** Full HTML body sent to the embassy. */
export function buildEmailHtml(c: CaseEmailInput): string {
  const hasCompany = c.company_name || c.company_phone || c.company_email || c.company_location

  const companySection = hasCompany
    ? `${sectionLabel('Employer / agent')}${TABLE_OPEN}
      ${c.company_name     ? row('Name',     na(c.company_name))     : ''}
      ${c.company_phone    ? row('Phone',    na(c.company_phone))    : ''}
      ${c.company_email    ? row('Email',    na(c.company_email))    : ''}
      ${c.company_location ? row('Location', na(c.company_location)) : ''}
    </table>`
    : ''

  const narrative = stripLetterWrapper(c.polished_summary)

  const attachmentsSection =
    c.attachments.length > 0
      ? `${sectionLabel('Attachments')}<ul style="margin:0;padding-left:18px;">${c.attachments
          .map(
            (a) =>
              `<li style="font-size:13px;margin-bottom:4px;"><a href="${esc(a.url)}" target="_blank" style="color:#0C447C;">${esc(a.label)}</a></li>`,
          )
          .join('')}</ul>`
      : ''

  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:680px;">

${buildSeverityBar(c)}
${buildBluf(c)}

<div style="padding:0 4px;">

${buildVerifySection(c)}

${sectionLabel('Affected individual')}${TABLE_OPEN}
  ${row('Name',                     na(c.name))}
  ${row('Gender / Age',             `${na(c.gender, '—')} / ${na(c.age, '—')}`)}
  ${row('Passport number',          na(c.passport))}
  ${row('Emirates ID',              na(c.eid))}
  ${row('Phone',                    na(c.phone))}
  ${row('Visa / residence emirate', na(c.visa_emirate, 'Not provided'))}
  ${c.date_of_incident ? row('Date of incident', esc(c.date_of_incident)) : ''}
</table>

${companySection}
${buildAdditionalDetails(c)}

${sectionLabel('Case narrative')}
<div style="background:#f9f9f9;border-left:3px solid #1a2e4a;padding:10px 14px;font-size:13px;line-height:1.7;color:#333;">
  ${esc(narrative).replace(/\n/g, '<br>')}
</div>

${sectionLabel('Reported by')}${TABLE_OPEN}
  ${row('Name',  na(c.reporter_name))}
  ${row('Phone', na(c.reporter_phone))}
  ${c.reporter_email    ? row('Email',    na(c.reporter_email))    : ''}
  ${c.reporter_passport ? row('Passport', na(c.reporter_passport)) : ''}
  ${c.reporter_eid      ? row('EID',      na(c.reporter_eid))      : ''}
</table>

${attachmentsSection}

${c.case_url ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
  <tr>
    <td bgcolor="#1a2e4a" style="border-radius:6px;padding:13px 26px;">
      <a href="${esc(c.case_url)}" target="_blank"
         style="color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;display:inline-block;">
        View this case in Ashraya &rarr;
      </a>
    </td>
  </tr>
</table>` : ''}

<p style="margin:24px 0 0;">Kind regards,<br><strong>${esc(c.org_name)}</strong></p>

<p style="font-size:11px;color:#aaa;margin:12px 0 0;">
  This case has been reported in good faith by a community volunteer of ${esc(c.org_name)}.
  All attachments are provided as received.
</p>

</div>
</div>`
}
