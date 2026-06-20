import { describe, expect, it } from 'vitest'

import { computeRecipients } from './send'

const env = {
  EMAIL_ABU_DHABI: 'abudhabi@embassy.test',
  EMAIL_DUBAI: 'dubai@consulate.test',
  EMAIL_CC: 'records@tfa.test',
}

describe('email routing — 4 cases', () => {
  it('case 1: reporting Dubai + Dubai visa → TO Dubai, CC Abu Dhabi', () => {
    const r = computeRecipients('Other emirates', 'Other Emirates', null, env)
    expect(r.to).toBe('dubai@consulate.test')
    expect(r.cc).toContain('abudhabi@embassy.test')
  })

  it('case 2: reporting Abu Dhabi + Abu Dhabi visa → TO Abu Dhabi, no embassy CC', () => {
    const r = computeRecipients('Abu Dhabi', 'Abu Dhabi', null, env)
    expect(r.to).toBe('abudhabi@embassy.test')
    expect(r.cc).not.toContain('dubai@consulate.test')
  })

  it('case 3: reporting Abu Dhabi + Dubai visa → TO Abu Dhabi, CC Dubai', () => {
    const r = computeRecipients('Abu Dhabi', 'Other Emirates', null, env)
    expect(r.to).toBe('abudhabi@embassy.test')
    expect(r.cc).toContain('dubai@consulate.test')
  })

  it('case 4: reporting Dubai + Abu Dhabi visa → TO Dubai, CC Abu Dhabi', () => {
    const r = computeRecipients('Other emirates', 'Abu Dhabi', null, env)
    expect(r.to).toBe('dubai@consulate.test')
    expect(r.cc).toContain('abudhabi@embassy.test')
  })

  it('always includes the standing CC list', () => {
    const r = computeRecipients('Abu Dhabi', 'Abu Dhabi', null, env)
    expect(r.cc).toContain('records@tfa.test')
  })

  it('CCs the reporter when they have a valid email', () => {
    const r = computeRecipients('Abu Dhabi', 'Abu Dhabi', 'reporter@example.com', env)
    expect(r.cc).toContain('reporter@example.com')
  })

  it('ignores an invalid reporter email', () => {
    const r = computeRecipients('Abu Dhabi', 'Abu Dhabi', 'not-an-email', env)
    expect(r.cc).not.toContain('not-an-email')
  })

  it('de-duplicates CC addresses', () => {
    const r = computeRecipients('Other emirates', 'Abu Dhabi', 'abudhabi@embassy.test', env)
    expect(r.cc.filter((x) => x === 'abudhabi@embassy.test')).toHaveLength(1)
  })
})
