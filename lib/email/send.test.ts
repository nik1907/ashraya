import { describe, expect, it } from 'vitest'

import { computeRecipients } from './send'

const env = {
  EMAIL_ABU_DHABI: 'abudhabi@embassy.test',
  EMAIL_DUBAI: 'dubai@consulate.test',
  EMAIL_CC: 'records@tfa.test',
}

describe('email routing', () => {
  it('sends to Abu Dhabi by default', () => {
    const r = computeRecipients('Abu Dhabi', null, env)
    expect(r.to).toBe('abudhabi@embassy.test')
    expect(r.cc).toContain('records@tfa.test')
    expect(r.cc).not.toContain('abudhabi@embassy.test')
  })

  it('routes "Other emirates" to Dubai and CCs Abu Dhabi', () => {
    const r = computeRecipients('Other emirates', null, env)
    expect(r.to).toBe('dubai@consulate.test')
    expect(r.cc).toContain('abudhabi@embassy.test')
  })

  it('CCs the reporter when they have a valid email', () => {
    const r = computeRecipients('Abu Dhabi', 'reporter@example.com', env)
    expect(r.cc).toContain('reporter@example.com')
  })

  it('ignores an invalid reporter email', () => {
    const r = computeRecipients('Abu Dhabi', 'not-an-email', env)
    expect(r.cc).not.toContain('not-an-email')
  })

  it('de-duplicates CC addresses', () => {
    const r = computeRecipients('Other emirates', 'abudhabi@embassy.test', env)
    expect(r.cc.filter((x) => x === 'abudhabi@embassy.test')).toHaveLength(1)
  })
})
