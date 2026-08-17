import 'server-only'

import { getCaseType } from '@/lib/caseConfig'

export type PolishInput = {
  description: string
  caseType: string
  name: string | null
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

const POLISH_SYSTEM = `You are a case officer at the Telangana Friends Association (TFA), UAE. You write concise, factual welfare case reports for Indian Embassy officers. Your role is to present the facts clearly — not to advise the embassy on what to do.

STRUCTURE — follow exactly, no deviations:
Para 1 (Who + What): 2 sentences max. Name, age, employer if known, and the single core problem. Nothing else.
Para 2 (Background + identifying details): 2–3 sentences max. Include ALL of the following that are provided: dates, how long the situation has been unresolved, circumstances that led to it, last known clothing or physical description, last known activity, last known location. Do not repeat Para 1.
Para 3 (Current status): 1–2 sentences. Where things stand right now — complaint filed or not, whether the person is reachable by phone, current whereabouts or location if known. Facts only. Do NOT suggest, request, or recommend any action for the embassy.

STRICT RULES:
- Write ONLY from facts provided. Do NOT invent names, locations, or details not in the input.
- If something is unknown, say so explicitly ("police complaint not yet filed", "current whereabouts unknown") — do not guess.
- NEVER omit identifying or locating details: clothing description, last known activity, last known location, and phone/contact reachability are essential facts for the embassy — include every one that is provided.
- No phrase may repeat a fact already stated in a previous paragraph.
- Plain English only — no diplomatic filler, no appeals, no recommendations.
- Do NOT include numbered action points or tell the embassy what to do. This is a factual report, not a directive.
- Do NOT add any closing or sign-off ("Yours sincerely", "Kind regards", reporter name, phone, or org). End with the last factual sentence only.
- Total length: 90–130 words. Facts take priority — never drop a provided detail to hit the lower bound.
- Begin exactly with: Dear Sir/Madam,`

function buildUserMessage(input: PolishInput): string {
  const extra = relevantDetailsText(input.caseType, input.details)

  const individual = [
    input.name            ? `Name: ${input.name}`                       : null,
    input.gender          ? `Gender: ${input.gender}`                   : null,
    input.age             ? `Age: ${input.age}`                         : null,
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
  ].filter(Boolean).join('\n')

  return `Write a formal consular letter for the following welfare case.

Case type: ${input.caseType}

Affected individual:
${individual || 'Details not provided'}

Employer / sponsor:
${employer || 'Not provided'}

Reported by (TFA volunteer — for context only; do not include in the letter body):
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
  const prompt = `You are preparing a quick-reference fact card for an Indian Embassy officer who must decide what action to take on this welfare case.

Write exactly 4 to 5 bullet points. Output ONLY the bullet lines — no intro, no preamble, no closing text.

FORMAT RULES — follow exactly:
- Each bullet is ONE short fact in "Label: value" style, under 15 words
- One bullet per line, separated by a newline character
- Do NOT write sentences or paragraphs. Do NOT merge multiple facts into one line.
- No numbers, no dashes, no bullet markers

EXAMPLE OUTPUT (exact format to follow):
Patient: Ravi Kumar, 47M — hospitalized at Al Qassimi Hospital, Abu Dhabi since 5 Aug 2026
Situation: Unpaid salary 4 months — AED 8,400 owed, visa sponsor has absconded
Action taken: None — no MoHRE complaint filed, no police report
Request: Intercede with employer via MoHRE, assist with emergency travel document if visa cancelled
Unknown: Employer current whereabouts, whether absconding case already filed

BULLETS TO WRITE (in this order, using only facts present in the input):
Line 1 — Who and where: name, age/gender, current location (hospital, police station, city)
Line 2 — Situation: core problem, severity, how long unresolved
Line 3 — Action taken: complaints filed, contacts made — say "None" if nothing done
Line 4 — Request: what TFA is asking the Embassy to DO — be specific (e.g. intercede with hospital, issue emergency travel document, coordinate with police, facilitate repatriation, assist with MoHRE). This line is MANDATORY.
Line 5 — Unknown (only if meaningful): what is still unconfirmed or missing

Case type: ${input.caseType}
Affected person: ${input.name ?? 'Unknown'}, ${input.gender ?? ''} ${input.age ? `age ${input.age}` : ''}
Phone: ${input.phone ?? 'Not provided'}
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
        model: 'gpt-4o',
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
        model: 'gpt-4o',
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
