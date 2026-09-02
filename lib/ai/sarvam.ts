import 'server-only'

// Sarvam AI — OpenAI-compatible endpoint
// sarvam-105b          : reasoning model, for structured JSON extraction
// sarvam-105b-conversations : dialogue model, no reasoning overhead, for prose

const SARVAM_BASE = 'https://api.sarvam.ai/v1'
const OPENAI_BASE = 'https://api.openai.com/v1'

export const SARVAM_REASON = 'sarvam-105b'
export const SARVAM_CONV   = 'sarvam-105b-conversations'

type Message = { role: string; content: string }

interface CallOpts {
  temperature?: number
  max_tokens: number
  response_format?: { type: string; json_schema?: unknown }
}

const TIMEOUT_MS = 28_000

async function callEndpoint(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  opts: CallOpts,
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens:  opts.max_tokens,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const content: unknown = data.choices?.[0]?.message?.content
    return typeof content === 'string' && content.length > 0 ? content.trim() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Call Sarvam for prose output.
 * Falls back to GPT-4o if Sarvam returns empty (silent — caller never knows).
 */
export async function sarvamProse(
  messages: Message[],
  opts: { max_tokens: number; temperature?: number },
): Promise<string | null> {
  const sarvamKey = process.env.SARVAM_API_KEY
  if (sarvamKey) {
    const result = await callEndpoint(SARVAM_BASE, sarvamKey, SARVAM_CONV, messages, opts)
    if (result) return result
    // Sarvam returned empty — fall through to GPT-4o
  }
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return null
  return callEndpoint(OPENAI_BASE, openaiKey, 'gpt-4o', messages, opts)
}

/**
 * Call Sarvam for JSON output (reasoning model).
 * Falls back to GPT-4o if Sarvam key is absent or the call fails/times out.
 */
export async function sarvamJSON(
  messages: Message[],
  opts: CallOpts,
): Promise<string | null> {
  const sarvamKey = process.env.SARVAM_API_KEY
  if (sarvamKey) {
    const result = await callEndpoint(SARVAM_BASE, sarvamKey, SARVAM_REASON, messages, opts)
    if (result) return result
    // Sarvam failed or timed out — fall through to GPT-4o
  }
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return null
  return callEndpoint(OPENAI_BASE, openaiKey, 'gpt-4o', messages, opts)
}
