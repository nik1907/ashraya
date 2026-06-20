// Moderate validation for case submissions. The server action is the
// authoritative gate; the form adds lightweight browser hints on top.

export const EID_RE = /^784-\d{4}-\d{7}-\d$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSPORT_RE = /^[A-Za-z0-9]{5,20}$/

/**
 * Format raw input into the Emirates ID shape `784-YYYY-NNNNNNN-N` as the user
 * types — so they can type just the 15 digits and the dashes appear.
 */
export function formatEid(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 15)
  let out = d.slice(0, 3)
  if (d.length > 3) out += '-' + d.slice(3, 7)
  if (d.length > 7) out += '-' + d.slice(7, 14)
  if (d.length > 14) out += '-' + d.slice(14, 15)
  return out
}

export const isEmail = (v: string) => EMAIL_RE.test(v.trim())
export const isEid = (v: string) => EID_RE.test(v.trim())
export const isPassport = (v: string) => PASSPORT_RE.test(v.trim())
export const isPhone = (v: string) => {
  const digits = v.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export type CaseValidationInput = {
  name: string
  description: string
  age: string | null
  passport: string | null
  eid: string | null
  phone: string | null
  companyEmail: string | null
  companyPhone: string | null
  dateOfIncident: string | null
  reporterName: string
  reporterPhone: string
  reporterEmail: string | null
  reporterPassport: string | null
  reporterEid: string | null
  /** Case-type-specific numeric fields, by label, for ">= 0" checks. */
  detailNumbers: { label: string; value: string }[]
}

const has = (v: string | null | undefined) => !!v && v.trim() !== ''

/** Returns the first validation error message, or null if the input is valid. */
export function validateCase(
  i: CaseValidationInput,
  now: Date = new Date(),
): string | null {
  if (!has(i.name)) return 'Affected individual name is required.'
  if (i.description.trim().length < 10)
    return 'Please give a description of at least 10 characters.'

  if (has(i.age) && (!/^\d+$/.test(i.age!.trim()) || +i.age! > 120))
    return 'Age must be a whole number between 0 and 120.'

  if (has(i.eid) && !isEid(i.eid!))
    return 'Emirates ID must look like 784-1234-1234567-1.'
  if (has(i.passport) && !isPassport(i.passport!))
    return 'Passport number looks invalid (5–20 letters/numbers).'
  if (has(i.phone) && !isPhone(i.phone!)) return 'Phone number looks invalid.'
  if (has(i.companyEmail) && !isEmail(i.companyEmail!))
    return 'Company email address looks invalid.'
  if (has(i.companyPhone) && !isPhone(i.companyPhone!))
    return 'Company phone number looks invalid.'

  if (has(i.dateOfIncident)) {
    const d = new Date(i.dateOfIncident!)
    if (!Number.isNaN(d.getTime()) && d.getTime() > now.getTime())
      return 'Date of incident cannot be in the future.'
  }

  if (!has(i.reporterName)) return 'Reporter name is required.'
  if (!has(i.reporterPhone)) return 'Reporter phone is required.'
  if (has(i.reporterPhone) && !isPhone(i.reporterPhone))
    return 'Reporter phone number looks invalid.'
  if (has(i.reporterEmail) && !isEmail(i.reporterEmail!))
    return 'Reporter email address looks invalid.'
  if (has(i.reporterEid) && !isEid(i.reporterEid!))
    return 'Reporter Emirates ID must look like 784-1234-1234567-1.'
  if (has(i.reporterPassport) && !isPassport(i.reporterPassport!))
    return 'Reporter passport number looks invalid (5–20 letters/numbers).'
  if (!has(i.reporterPassport) && !has(i.reporterEid))
    return 'The reporter must provide a Passport number or an Emirates ID.'

  for (const n of i.detailNumbers) {
    if (has(n.value) && (!/^\d+(\.\d+)?$/.test(n.value.trim()) || +n.value < 0))
      return `"${n.label}" must be a number of 0 or more.`
  }

  return null
}
