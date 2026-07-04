// Single source of truth for the case-reporting form, ported from the original
// Apps Script (`CASE_FIELD_MAP`, `CASE_SHORT_CODES`, `attachmentColumnMap`).
//
// The old script mapped answers to sheet COLUMN INDICES (e.g. values[33]).
// Here every field is a NAMED, typed key — the intake form, the email builder,
// and the AI summary all read from this config so they never drift apart.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'boolean'
  | 'number'
  | 'select'
  | 'email'
  | 'eid'

export type FieldDef = {
  /** Stable snake_case key stored in case_details JSONB. */
  key: string
  label: string
  type: FieldType
  /** For type 'select'. */
  options?: string[]
  required?: boolean
  /** For type 'date': blocks future dates (adds max=today in the form). */
  pastOnly?: boolean
}

export type AttachmentSlot = {
  key: string
  label: string
}

export type CaseTypeDef = {
  /** Exact label used by the original form (kept for parity with old data). */
  value: string
  /** Two-letter case code used in the case ID (TFA-ddmmyy-XX-NNN). */
  shortCode: string
  /** Case-type-specific follow-up questions. */
  fields: FieldDef[]
  /** File-upload slots offered for this case type. */
  attachments: AttachmentSlot[]
}

export const REPORTING_EMIRATES = ['Abu Dhabi', 'Other emirates'] as const
export type ReportingEmirate = (typeof REPORTING_EMIRATES)[number]

/** Affected-individual base fields shown for every case type. */
export const BASE_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'passport', label: 'Passport Number', type: 'text' },
  { key: 'eid', label: 'Emirates ID', type: 'eid' },
  { key: 'phone', label: 'Phone', type: 'text' },
]

/** Employer / agent details (optional, shown for every case type). */
export const EMPLOYER_FIELDS: FieldDef[] = [
  { key: 'company_name', label: 'Company / Agent Name', type: 'text' },
  { key: 'company_phone', label: 'Company Phone', type: 'text' },
  { key: 'company_email', label: 'Company Email', type: 'email' },
  { key: 'company_location', label: 'Company Location', type: 'text' },
  {
    key: 'visa_under_company',
    label: 'Visa Issued Under Company',
    type: 'boolean',
  },
]

/** Reporter (the volunteer / person filing on behalf of the affected individual). */
export const REPORTER_FIELDS: FieldDef[] = [
  { key: 'reporter_name', label: 'Reporter Name', type: 'text', required: true },
  { key: 'reporter_phone', label: 'Reporter Phone', type: 'text', required: true },
  { key: 'reporter_passport', label: 'Reporter Passport Number', type: 'text' },
  { key: 'reporter_eid', label: 'Reporter Emirates ID', type: 'eid' },
  { key: 'reporter_email', label: 'Reporter Email', type: 'email' },
]

const yesNo = (key: string, label: string): FieldDef => ({
  key,
  label,
  type: 'boolean',
})

export const CASE_TYPES: CaseTypeDef[] = [
  {
    value: 'Death',
    shortCode: 'DE',
    fields: [
      yesNo('body_identified', 'Is the body identified?'),
      { key: 'death_location', label: 'Location of death (if known)', type: 'text' },
      { key: 'hospital_name', label: 'Hospital name (if applicable)', type: 'text' },
      { key: 'kin_contact', label: 'Next of kin — name and phone number', type: 'text' },
      { key: 'unidentified_body_gender', label: 'Unidentified body gender', type: 'text' },
    ],
    attachments: [
      { key: 'death_certificate', label: 'Death Certificate' },
      { key: 'unidentified_body_photo', label: 'Photo of Unidentified Body' },
    ],
  },
  {
    value: 'Missing Person',
    shortCode: 'MP',
    fields: [
      { key: 'last_seen_location', label: 'Last seen location', type: 'text' },
      yesNo('police_complaint_filed', 'Have you filed a police complaint?'),
      { key: 'travel_history', label: 'Travel history (if any)', type: 'text' },
      yesNo('has_employer_details', 'Do you have employer details?'),
    ],
    attachments: [],
  },
  {
    value: 'Absconding',
    shortCode: 'AB',
    fields: [
      yesNo('has_employer_details', 'Do you have employer details?'),
      yesNo('has_valid_visa', 'Does the individual have a valid visa?'),
      { key: 'visa_expiry_date', label: 'Visa expiry date (if known)', type: 'date' },
      { key: 'estimated_overstay_days', label: 'Estimated overstay days', type: 'number' },
      { key: 'last_seen_location', label: 'Last seen location (if any)', type: 'text' },
    ],
    attachments: [],
  },
  {
    value: 'Employer Harassment / Abuse',
    shortCode: 'EH',
    fields: [
      { key: 'abuse_type', label: 'Type of abuse', type: 'text' },
      yesNo('documents_withheld', 'Have documents been withheld?'),
      yesNo('has_employer_details', 'Do you have employer details?'),
    ],
    attachments: [{ key: 'labor_contract', label: 'Offer Letter / Labor Contract' }],
  },
  {
    value: 'Overstay / Illegal Status',
    shortCode: 'OS',
    fields: [
      { key: 'visa_expiry_date', label: 'Visa expiry date', type: 'date' },
      { key: 'overstay_reason', label: 'Reason for overstay', type: 'text' },
      { key: 'intent_exit_or_legalize', label: 'Intent to exit or legalize?', type: 'select', options: ['Exit', 'Legalize'] },
    ],
    attachments: [],
  },
  {
    value: 'Hospitalized / Medical Emergency',
    shortCode: 'HM',
    fields: [
      { key: 'hospital_name', label: 'Hospital name', type: 'text' },
      { key: 'admission_date', label: 'Date of admission', type: 'date', pastOnly: true },
      { key: 'diagnosis', label: 'Diagnosis / Condition', type: 'text' },
      { key: 'kin_contact_number', label: 'Next of kin — contact number', type: 'text' },
      yesNo('has_employer_details', 'Do you have employer details?'),
      yesNo('has_valid_insurance', 'Does the person have valid insurance?'),
    ],
    attachments: [{ key: 'medical_report', label: 'Medical Report' }],
  },
  {
    value: 'Police Case / Detention',
    shortCode: 'PC',
    fields: [
      { key: 'police_station', label: 'Police station name', type: 'text' },
      { key: 'charges', label: 'Charges (if known)', type: 'text' },
      { key: 'arrest_date', label: 'Date of arrest', type: 'date', pastOnly: true },
      { key: 'lawyer_name', label: 'Legal representative / lawyer name (if any)', type: 'text' },
      { key: 'case_number', label: 'Case number (if known)', type: 'text' },
      yesNo('has_employer_details', 'Do you have employer details?'),
    ],
    attachments: [],
  },
  {
    value: 'Visa Fraud / Fake Agent',
    shortCode: 'VF',
    fields: [
      { key: 'amount_paid', label: 'Amount paid', type: 'number' },
      yesNo('police_complaint_filed', 'Police complaint filed?'),
    ],
    attachments: [{ key: 'proof_document', label: 'Proof Document' }],
  },
  {
    value: 'Unpaid Salary / Labor Exploitation',
    shortCode: 'US',
    fields: [
      yesNo('has_employer_details', 'Do you have employer details?'),
      { key: 'amount_due', label: 'Amount due', type: 'number' },
      yesNo('mol_complaint_filed', 'Have you filed a complaint with MOL?'),
    ],
    attachments: [{ key: 'pay_slips', label: 'Pay Slips / Contract' }],
  },
  {
    value: 'Stranded Without Support',
    shortCode: 'ST',
    fields: [
      { key: 'current_location', label: 'Current location', type: 'text' },
      { key: 'duration_stranded', label: 'How long stranded?', type: 'text' },
    ],
    attachments: [],
  },
  {
    value: 'Request for Exit / Amnesty Case',
    shortCode: 'EX',
    fields: [
      { key: 'current_visa_status', label: 'Current visa status', type: 'text' },
      { key: 'overstay_fine_details', label: 'Overstay fine details (if known)', type: 'text' },
      yesNo('willing_to_leave', 'Willing to leave voluntarily?'),
      yesNo('has_employer_details', 'Do you have employer details?'),
    ],
    attachments: [{ key: 'letter_of_intent', label: 'Letter of Intent' }],
  },
  {
    value: 'Family Dispute / Marital Issues',
    shortCode: 'FD',
    fields: [],
    attachments: [],
  },
  {
    value: 'Mental Health / Behavioral Crisis',
    shortCode: 'MH',
    fields: [],
    attachments: [],
  },
  {
    value: 'Suicidal Risk / Trauma',
    shortCode: 'SR',
    fields: [],
    attachments: [],
  },
  {
    value: 'Child Welfare / Abandonment',
    shortCode: 'CW',
    fields: [
      { key: 'child_age', label: "Child's age", type: 'number' },
      { key: 'school_or_home_location', label: 'School or home location', type: 'text' },
      { key: 'guardian_info', label: 'Guardian or caretaker information', type: 'text' },
      yesNo('consulate_coordination_needed', 'Is consulate coordination needed?'),
    ],
    attachments: [],
  },
  {
    value: 'Documents Withheld by Employer',
    shortCode: 'DW',
    fields: [
      yesNo('has_employer_details', 'Do you have employer details?'),
      yesNo('documents_being_withheld', 'Documents being withheld?'),
      { key: 'which_documents', label: 'Which documents are withheld?', type: 'text' },
    ],
    attachments: [],
  },
  {
    value: 'Repatriation of Dead Body',
    shortCode: 'RD',
    fields: [
      yesNo('documents_available', 'Documents available?'),
      { key: 'relation_to_deceased', label: 'Relation to deceased', type: 'text' },
      yesNo('embassy_coordination_started', 'Coordination with embassy started?'),
    ],
    attachments: [{ key: 'death_certificate', label: 'Death Certificate' }],
  },
  {
    value: 'Legal Aid / Court Case Support',
    shortCode: 'LA',
    fields: [],
    attachments: [],
  },
  {
    value: 'Job Scam / Absconded Agents',
    shortCode: 'JS',
    fields: [
      { key: 'agent_approach_mode', label: 'Mode of agent approach', type: 'text' },
      yesNo('has_scammer_details', 'Do you have employer / scammer details?'),
      { key: 'amount_paid', label: 'How much was paid?', type: 'number' },
    ],
    attachments: [
      { key: 'job_offer_letter', label: 'Job Offer Letter' },
      { key: 'proof_of_scam', label: 'Proof of Scam' },
    ],
  },
  {
    value: 'Unlisted',
    shortCode: 'UN',
    fields: [],
    attachments: [],
  },
]

/** Generic supporting-document slots offered on every case (ported from attachmentColumnMap). */
export const COMMON_ATTACHMENTS: AttachmentSlot[] = [
  { key: 'passport_copy', label: 'Passport Copy' },
  { key: 'eid_copy', label: 'EID Copy' },
  { key: 'supporting_documents', label: 'Supporting Documents' },
  { key: 'other_1', label: 'Other Supporting Document 1' },
  { key: 'other_2', label: 'Other Supporting Document 2' },
  { key: 'other_3', label: 'Other Supporting Document 3' },
]

const BY_VALUE = new Map(CASE_TYPES.map((c) => [c.value, c]))

export function getCaseType(value: string): CaseTypeDef | undefined {
  return BY_VALUE.get(value)
}

/** Two-letter code for the case ID; 'XX' when the type is unknown (mirrors old script). */
export function shortCodeFor(value: string): string {
  return BY_VALUE.get(value)?.shortCode ?? 'XX'
}

export const CASE_TYPE_VALUES = CASE_TYPES.map((c) => c.value)
