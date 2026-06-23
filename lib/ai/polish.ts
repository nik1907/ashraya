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
  dateOfIncident: string | null
  companyName: string | null
  companyPhone: string | null
  companyEmail: string | null
  companyLocation: string | null
  reporterName: string | null
  reporterPhone: string | null
  reporterPassport: string | null
  reporterEid: string | null
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
    ? `\n\nCase-specific details (confirmed intake data — incorporate into the letter body):\n${lines.join('\n')}`
    : ''
}

const POLISH_SYSTEM = `You are a case officer at the Telangana Friends Association (TFA), UAE. You write clear, factual case summaries for Indian Embassy welfare officers who need to quickly understand a situation and decide what action to take.

Your reader is a busy embassy welfare officer. They need to grasp: who is affected, what happened, how serious it is, and what is being requested — in under two minutes. Plain, direct English works better than formal diplomatic language.

STRUCTURE — follow exactly:
Para 1 (Situation): In 2–3 sentences, state who the person is, what type of case this is, and the core problem. Use plain language — "employer withheld passport" not "documents were impounded".
Para 2 (Key facts): State the most important facts — dates, employer name, what specifically happened, current situation. If salary is unpaid, state how many months. If documents are withheld, list which ones. Be specific and factual.
Para 3 (What we need): State clearly what action the Mission is being asked to take. Keep it to 2–3 numbered points maximum.
Close: Yours sincerely, [Reporter Name], [Phone], Telangana Friends Association.

RULES:
- Write ONLY from facts provided. Do not invent any detail.
- The "Case-specific details" block contains confirmed intake data — incorporate every field into the summary.
- Use plain English. Avoid over-formal phrases. The goal is clarity, not impressiveness.
- Do not add urgency or emotion that is not in the raw account.
- Begin exactly with: Dear Sir/Madam,
- Total length: 130–180 words. Every sentence must carry information.`

function buildUserMessage(input: PolishInput): string {
  const extra = relevantDetailsText(input.caseType, input.details)

  const individual = [
    input.name            ? `Name: ${input.name}`                       : null,
    input.gender          ? `Gender: ${input.gender}`                   : null,
    input.age             ? `Age: ${input.age}`                         : null,
    input.passport        ? `Passport: ${input.passport}`               : null,
    input.eid             ? `EID: ${input.eid}`                         : null,
    input.phone           ? `Phone: ${input.phone}`                     : null,
    input.dateOfIncident  ? `Date of incident: ${input.dateOfIncident}` : null,
  ].filter(Boolean).join('\n')

  const employer = [
    input.companyName     ? `Name: ${input.companyName}`                : null,
    input.companyPhone    ? `Phone: ${input.companyPhone}`              : null,
    input.companyEmail    ? `Email: ${input.companyEmail}`              : null,
    input.companyLocation ? `Location: ${input.companyLocation}`        : null,
  ].filter(Boolean).join('\n')

  const reporter = [
    input.reporterName     ? `Name: ${input.reporterName}`             : null,
    input.reporterPhone    ? `Phone: ${input.reporterPhone}`           : null,
    input.reporterPassport ? `Passport: ${input.reporterPassport}`     : null,
    input.reporterEid      ? `EID: ${input.reporterEid}`               : null,
  ].filter(Boolean).join('\n')

  return `Write a formal consular letter for the following welfare case.

Case type: ${input.caseType}

Affected individual:
${individual || 'Details not provided'}

Employer / sponsor:
${employer || 'Not provided'}

Reported by (TFA volunteer — use their name and phone in the closing):
${reporter || 'Not provided'}

Raw account (worker's own words — convert into formal facts, do not copy verbatim):
"""
${input.description}
"""${extra}`
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
  const apiKey = process.env.OPENAI_API_KEY
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
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.5-2026-04-23',
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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const prompt = `Write ONE sentence (max 22 words) as a mission status line on the Indian Embassy Ambassador's welfare dashboard.
Status: ${input.status}. Direct, no filler, no "I". Mention the most critical fact.
Data: ${input.totalOpen} open cases, ${input.crisisCount} critical, top type: ${input.topType || 'various'}, ${input.slaBreaches} SLA breach${input.slaBreaches !== 1 ? 'es' : ''}, ${input.employerAlerts} employer alert${input.employerAlerts !== 1 ? 's' : ''}, avg ${input.avgDaysOpen}d open.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.5-2026-04-23',
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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return input.description

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: POLISH_SYSTEM },
          { role: 'user',   content: buildUserMessage(input) },
        ],
        temperature: 0.2,
      }),
    })
    if (!res.ok) {
      console.error('GPT-4o polish error', res.status, await res.text())
      return input.description
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || input.description
  } catch (err) {
    console.error('GPT-4o polish failed', err)
    return input.description
  }
}
