import 'server-only'

import { getCaseType } from '@/lib/caseConfig'

export type PolishInput = {
  description: string
  caseType: string
  name: string | null
  passport: string | null
  eid: string | null
  phone: string | null
  gender: string | null
  age: number | null
  reporterName: string | null
  reporterPhone: string | null
  details: Record<string, unknown>
}

/** Case-type-specific details as plain text, mirroring getRelevantCaseDetailsText. */
function relevantDetailsText(caseType: string, details: Record<string, unknown>): string {
  const def = getCaseType(caseType)
  if (!def) return ''
  const lines = def.fields
    .map((f) => {
      const v = details[f.key]
      if (v === null || v === undefined || v === '') return null
      const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
      return `${f.label}: ${display}`
    })
    .filter(Boolean)
  return lines.length
    ? `\n\nAdditional Relevant Case Information:\n${lines.join('\n')}`
    : ''
}

function buildPrompt(input: PolishInput): string {
  const extra = relevantDetailsText(input.caseType, input.details)
  return `Rewrite the following case summary in formal, diplomatic English for an official email to the Indian Embassy.

Begin with: "Dear Sir/Madam".
Do not list raw fields or label headers. Instead, craft a strong, concise narrative using all provided information.

• Clearly describe the situation with respect to the affected individual.
• Mention personal identifiers like passport, EID, phone, age, gender — but only if they help contextualize the case.
• If uploads are mentioned, say "supporting documents are attached" — do not include hyperlinks or file names.
• Emphasize the urgency or hardship where relevant.
• End the email with the reporter's name and contact number — do not include the affected individual's identifiers in the closing.

Affected Individual:
- Name: ${input.name ?? 'Not Provided'}
- Passport: ${input.passport ?? 'Not Provided'}
- EID: ${input.eid ?? 'Not Provided'}
- Phone: ${input.phone ?? 'Not Provided'}
- Gender: ${input.gender ?? 'Not Provided'}
- Age: ${input.age ?? 'Not Provided'}

Case Type: ${input.caseType}

Description:
"""
${input.description}
"""${extra}

Close with reporter name (${input.reporterName ?? 'Not Provided'}) and phone (${input.reporterPhone ?? 'Not Provided'}).`
}

export type BriefInput = {
  description: string
  caseType: string
  name: string | null
  passport: string | null
  eid: string | null
  phone: string | null
  gender: string | null
  age: number | null
  companyName: string | null
  reporterName: string | null
  details: Record<string, unknown>
}

/**
 * Generate a 3-line ambassador briefing for a case using GPT-4o.
 * Each line is one clear sentence covering: what happened, urgency, embassy action needed.
 * Returns null if the API key is not configured or the call fails.
 */
export async function generateCaseBrief(input: BriefInput): Promise<string | null> {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) return null

  const extra = relevantDetailsText(input.caseType, input.details)
  const prompt = `You are briefing the Indian Embassy ambassador on a community welfare case.
Write EXACTLY 3 bullet points — one per line, no numbers, no dashes, no extra text.

Line 1: What happened and when (incident type, date, key facts — be specific).
Line 2: Current situation and urgency (severity, immediate risk, how long it has been waiting).
Line 3: What specific action the embassy should take next.

Each line must be one clear, complete sentence. Plain English. No diplomatic filler.

Case type: ${input.caseType}
Affected person: ${input.name ?? 'Unknown'}, ${input.gender ?? ''} ${input.age ? `age ${input.age}` : ''}
Passport: ${input.passport ?? 'Not provided'} | EID: ${input.eid ?? 'Not provided'} | Phone: ${input.phone ?? 'Not provided'}
Employer: ${input.companyName ?? 'Not provided'}
Reporter: ${input.reporterName ?? 'Not provided'}
Description:
"""
${input.description}
"""${extra}`

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'sarvam-30b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

// ─── Mission one-liner ────────────────────────────────────────────────────────

type MissionOneLinerInput = {
  status: 'UNDER_CONTROL' | 'ELEVATED' | 'CRITICAL'
  totalOpen: number
  crisisCount: number
  topType: string
  slaBreaches: number
  employerAlerts: number
  avgDaysOpen: number
}

/**
 * One crisp sentence (≤ 25 words) shown in the Mission Status Strip.
 * Returns null if OPENAI_API_KEY is not set or the call fails.
 */
export async function generateMissionOneLiner(input: MissionOneLinerInput): Promise<string | null> {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) return null

  const prompt = `Write ONE sentence (max 22 words) as a mission status line on the Indian Embassy Ambassador's welfare dashboard.
Status: ${input.status}. Direct, no filler, no "I". Mention the most critical fact.
Data: ${input.totalOpen} open cases, ${input.crisisCount} critical, top type: ${input.topType || 'various'}, ${input.slaBreaches} SLA breach${input.slaBreaches !== 1 ? 'es' : ''}, ${input.employerAlerts} employer alert${input.employerAlerts !== 1 ? 's' : ''}, avg ${input.avgDaysOpen}d open.`

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'sarvam-30b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 60,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.choices?.[0]?.message?.content?.trim() as string) || null
  } catch {
    return null
  }
}

// ─── Case polish ──────────────────────────────────────────────────────────────

/**
 * Rewrite a raw case description into a formal embassy summary using GPT-4o.
 * If no API key is configured, returns the raw description unchanged so the
 * pipeline still works in development (the email just won't be AI-polished).
 */
export async function polishDescription(input: PolishInput): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) {
    return input.description
  }

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sarvam-30b',
        messages: [{ role: 'user', content: buildPrompt(input) }],
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      console.error('Sarvam error', res.status, await res.text())
      return input.description
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || input.description
  } catch (err) {
    console.error('Sarvam request failed', err)
    return input.description
  }
}
