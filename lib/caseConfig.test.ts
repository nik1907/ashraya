import { describe, expect, it } from 'vitest'

import {
  CASE_TYPES,
  getCaseType,
  shortCodeFor,
} from './caseConfig'

describe('case config', () => {
  it('has all 20 case types from the original script', () => {
    expect(CASE_TYPES).toHaveLength(20)
  })

  it('gives every case type a unique 2-letter short code', () => {
    const codes = CASE_TYPES.map((c) => c.shortCode)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has unique field keys within each case type', () => {
    for (const c of CASE_TYPES) {
      const keys = c.fields.map((f) => f.key)
      expect(new Set(keys).size, `duplicate field key in ${c.value}`).toBe(
        keys.length,
      )
    }
  })

  it('has unique attachment keys within each case type', () => {
    for (const c of CASE_TYPES) {
      const keys = c.attachments.map((a) => a.key)
      expect(new Set(keys).size, `duplicate attachment key in ${c.value}`).toBe(
        keys.length,
      )
    }
  })

  it('preserves the original short codes', () => {
    expect(shortCodeFor('Death')).toBe('DE')
    expect(shortCodeFor('Missing Person')).toBe('MP')
    expect(shortCodeFor('Job Scam / Absconded Agents')).toBe('JS')
    expect(shortCodeFor('Unlisted')).toBe('UN')
  })

  it('falls back to XX for an unknown case type (matching old script)', () => {
    expect(shortCodeFor('Nonexistent')).toBe('XX')
    expect(getCaseType('Nonexistent')).toBeUndefined()
  })

  it('only uses known field types', () => {
    const allowed = new Set(['text', 'textarea', 'date', 'boolean', 'number', 'select'])
    for (const c of CASE_TYPES) {
      for (const f of c.fields) {
        expect(allowed.has(f.type), `${c.value}.${f.key} type ${f.type}`).toBe(true)
      }
    }
  })
})
