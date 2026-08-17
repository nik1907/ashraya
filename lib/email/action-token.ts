import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

export const EXPIRY_SECONDS = 90 * 24 * 60 * 60 // 90 days

export type ActionTokenAction = 'request-info' | 'under-process' | 'resolved' | 'reporter-follow-up'
export type TokenPayload = { caseRowId: string; action: ActionTokenAction }

function secret(): string {
  const s = process.env.ACTION_TOKEN_SECRET
  if (!s) throw new Error('ACTION_TOKEN_SECRET not configured')
  return s
}

function b64(buf: Buffer): string {
  return buf.toString('base64url')
}

/**
 * Signs a time-limited HMAC-SHA256 token for a no-login email action.
 * Returns null if ACTION_TOKEN_SECRET is not set.
 */
export function signActionToken(caseRowId: string, action: ActionTokenAction): string | null {
  try {
    const expiry = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS
    const payload = `${caseRowId}|${action}|${expiry}`
    const sig = createHmac('sha256', secret()).update(payload).digest()
    return `${b64(Buffer.from(payload, 'utf8'))}.${b64(sig)}`
  } catch {
    return null
  }
}

/**
 * Verifies a signed token. Returns the payload or null if invalid / expired.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyActionToken(token: string): TokenPayload | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 0) return null

    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)

    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
    const parts = payload.split('|')
    if (parts.length !== 3) return null

    const [caseRowId, action, expiryStr] = parts
    const expiry = parseInt(expiryStr, 10)
    if (isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) return null

    const expected = createHmac('sha256', secret()).update(payload).digest()
    const given = Buffer.from(sigB64, 'base64url')

    if (expected.length !== given.length) return null
    if (!timingSafeEqual(expected, given)) return null

    if (action !== 'request-info' && action !== 'under-process' && action !== 'resolved' && action !== 'reporter-follow-up') return null

    return { caseRowId, action: action as ActionTokenAction }
  } catch {
    return null
  }
}
