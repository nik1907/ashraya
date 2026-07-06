import { describe, expect, it } from 'vitest'

import { buildEmailHtml, buildSubject, type CaseEmailInput } from './template'

const base: CaseEmailInput = {
  org_name: 'Telangana Friends Association',
  case_id: 'TFA-190626-HM-001',
  case_type: 'Hospitalized / Medical Emergency',
  severity: 'critical',
  case_brief: 'Worker hospitalized after workplace accident.\nCondition is serious and untreated.\nWhat the embassy still needs to verify.',
  date_of_incident: '2026-06-18',
  name: 'Test Person',
  gender: 'Male',
  age: 34,
  passport: 'X1234567',
  eid: null,
  phone: '+971500000000',
  company_name: 'Acme LLC',
  company_phone: null,
  company_email: null,
  company_location: null,
  reporter_name: 'Reporter One',
  reporter_passport: null,
  reporter_eid: null,
  reporter_phone: '+971511111111',
  reporter_email: 'reporter@example.com',
  visa_emirate: 'Abu Dhabi',
  details: { hospital_name: 'City Hospital', has_valid_insurance: true },
  polished_summary: 'Line one.\nLine two.',
  attachments: [{ label: 'Medical Report', url: 'https://example.com/f' }],
}

describe('embassy email', () => {
  it('builds the subject with severity prefix and em-dash', () => {
    expect(buildSubject(base)).toBe(
      '[CRISIS] TFA-190626-HM-001: Hospitalized / Medical Emergency — Test Person',
    )
  })

  it('omits prefix for normal and medium severity', () => {
    expect(buildSubject({ ...base, severity: 'normal' })).toBe(
      'TFA-190626-HM-001: Hospitalized / Medical Emergency — Test Person',
    )
    expect(buildSubject({ ...base, severity: 'medium' })).toBe(
      'TFA-190626-HM-001: Hospitalized / Medical Emergency — Test Person',
    )
    expect(buildSubject({ ...base, severity: 'high' })).toContain('[URGENT]')
  })

  it('includes affected individual and reporter details', () => {
    const html = buildEmailHtml(base)
    expect(html).toContain('Test Person')
    expect(html).toContain('Reporter One')
    expect(html).toContain('City Hospital')
  })

  it('renders booleans as Yes/No using field labels', () => {
    const html = buildEmailHtml(base)
    expect(html).toContain('Does the person have valid insurance?')
    expect(html).toContain('Yes')
  })

  it('converts newlines in the summary to <br>', () => {
    const html = buildEmailHtml(base)
    expect(html).toContain('Line one.<br>Line two.')
  })

  it('escapes HTML to prevent injection from user input', () => {
    const html = buildEmailHtml({ ...base, name: '<script>x</script>' })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('omits the employer section when no company info is present', () => {
    const html = buildEmailHtml({
      ...base,
      company_name: null,
      company_phone: null,
      company_email: null,
      company_location: null,
    })
    expect(html).not.toContain('Employer / agent')
  })

  it('renders a severity bar with CRISIS label and BLUF before the data tables', () => {
    const html = buildEmailHtml(base)
    // Severity bar uses the dark background colour for critical
    expect(html).toContain('CRISIS')
    expect(html).toContain('#7B1111')
    // BLUF shows line 1 of case_brief (what happened) — not an action suggestion
    expect(html).toContain('Worker hospitalized after workplace accident.')
    // Severity bar appears before the affected individual section
    expect(html.indexOf('CRISIS')).toBeLessThan(html.indexOf('Affected individual'))
  })

  it('falls back to first sentence of polished_summary when no brief is available', () => {
    const html = buildEmailHtml({ ...base, case_brief: null })
    // First sentence of polished_summary used as BLUF
    expect(html).toContain('Line one.')
  })
})
