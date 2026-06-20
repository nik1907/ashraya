import { describe, expect, it } from 'vitest'

import { isEid, isEmail, isPhone, validateCase, type CaseValidationInput } from './validation'

const now = new Date('2026-06-20T12:00:00Z')

function valid(): CaseValidationInput {
  return {
    name: 'Test Person',
    description: 'A clear description of the situation.',
    age: '34',
    passport: 'X1234567',
    eid: null,
    phone: '+971500000000',
    companyEmail: null,
    companyPhone: null,
    dateOfIncident: '2026-06-18',
    reporterName: 'Reporter One',
    reporterPhone: '+971511111111',
    reporterEmail: 'reporter@example.com',
    reporterPassport: 'A9876543',
    reporterEid: null,
    detailNumbers: [],
  }
}

describe('field helpers', () => {
  it('validates Emirates ID format', () => {
    expect(isEid('784-1990-1234567-1')).toBe(true)
    expect(isEid('784-99-1234567-1')).toBe(false)
    expect(isEid('1234567890')).toBe(false)
  })
  it('validates email', () => {
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('not-an-email')).toBe(false)
  })
  it('validates phone by digit count', () => {
    expect(isPhone('+971 50 123 4567')).toBe(true)
    expect(isPhone('123')).toBe(false)
  })
})

describe('validateCase', () => {
  it('accepts a valid submission', () => {
    expect(validateCase(valid(), now)).toBeNull()
  })
  it('requires a name', () => {
    expect(validateCase({ ...valid(), name: '  ' }, now)).toMatch(/name is required/i)
  })
  it('requires a description of at least 10 chars', () => {
    expect(validateCase({ ...valid(), description: 'short' }, now)).toMatch(/10 characters/i)
  })
  it('rejects an out-of-range age', () => {
    expect(validateCase({ ...valid(), age: '200' }, now)).toMatch(/age/i)
  })
  it('rejects a malformed Emirates ID', () => {
    expect(validateCase({ ...valid(), eid: '784-1-2-3' }, now)).toMatch(/Emirates ID/i)
  })
  it('rejects a future incident date', () => {
    expect(validateCase({ ...valid(), dateOfIncident: '2026-12-31' }, now)).toMatch(/future/i)
  })
  it('requires reporter to give a passport or Emirates ID', () => {
    const r = validateCase({ ...valid(), reporterPassport: null, reporterEid: null }, now)
    expect(r).toMatch(/Passport number or an Emirates ID/i)
  })
  it('accepts reporter with only an Emirates ID', () => {
    expect(
      validateCase({ ...valid(), reporterPassport: null, reporterEid: '784-1990-1234567-1' }, now),
    ).toBeNull()
  })
  it('rejects a negative amount in a detail field', () => {
    expect(
      validateCase({ ...valid(), detailNumbers: [{ label: 'Amount due', value: '-5' }] }, now),
    ).toMatch(/Amount due/i)
  })
})
