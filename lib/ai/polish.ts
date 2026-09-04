import 'server-only'

import { getCaseType } from '@/lib/caseConfig'
import { sarvamProse } from './sarvam'

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

const POLISH_SYSTEM = `You are a welfare case officer at the Telangana Friends Association (TFA), UAE. You are preparing a formal welfare case referral for submission to the Embassy of India. The letter will be reviewed by a consular officer who will decide what action to take.

Write a structured, professional narrative. Use precise, formal language appropriate for diplomatic correspondence — factual and authoritative, not emotional or hollow.

STRUCTURE — follow exactly, with a blank line between every paragraph:
Para 1 (Identity and core issue): 2–3 sentences. Full name, age, gender, nationality if stated, employer/sponsor if known, and the primary welfare concern. Establish who this person is and what has happened.

Para 2 (Chronology and circumstances): 3–4 sentences. How the situation developed, key dates, duration of the unresolved issue, events that led to the current state. For missing persons: include last known clothing, last known activity, and last known location — every detail matters for tracing. Do not repeat Para 1.

Para 3 (Current status): 2–3 sentences. Present-tense status as of the date of this report — whether a formal complaint has been filed (and with whom), whether the affected individual is reachable by phone, current whereabouts or location if known.

Para 4 (Gaps and unknowns — include only if meaningful): 1–2 sentences. State clearly what remains unconfirmed or unknown that the consular officer should be aware of before acting. Omit this paragraph entirely if there are no material unknowns.

STRICT RULES:
- Write ONLY from facts provided. Do NOT invent, infer, or extrapolate any detail not explicitly present in the input.
- If a detail is unknown, state it plainly ("no formal complaint has been filed to date", "the individual's current location is unknown") — never guess.
- Include EVERY identifying and locating detail provided: clothing description, last known activity, last known location, contact reachability. These details are operationally essential for consular action — omitting them defeats the purpose of the referral.
- No phrase may repeat a fact already stated in a previous paragraph.
- Professional formal English throughout. Avoid hollow diplomatic filler ("humbly request", "kindly consider") and avoid emotional appeals. State facts with precision.
- Do NOT include numbered action points, directives, or recommendations to the embassy. This is a referral report — it informs, it does not instruct.
- Do NOT add any closing, sign-off, or attribution ("Yours sincerely", "Kind regards", reporter name, phone, or organisation). End with the final factual sentence only.
- Total length: 130–200 words. Completeness takes priority — never drop a provided detail to meet a word limit.
- Begin exactly with: Honourable Sir/Madam,`

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
 * Generate a 4–5 bullet fact card for an Indian Embassy officer.
 * Primary: Sarvam-105B-conversations. Falls back to GPT-4o if empty.
 */
export async function generateCaseBrief(input: BriefInput): Promise<string | null> {
  const extra = relevantDetailsText(input.caseType, input.details)
  const prompt = `You are preparing a quick-reference fact card for an Indian Embassy officer who must decide what action to take on this welfare case.

Write exactly 4 to 5 bullet points. Output ONLY the bullet lines — no intro, no preamble, no closing text.

FORMAT RULES — follow exactly:
- Each bullet is ONE short fact in "Label: value" style, under 15 words
- One bullet per line, separated by a newline character
- Do NOT write sentences or paragraphs. Do NOT merge multiple facts into one line.
- No numbers, no dashes, no bullet markers

EXAMPLE OUTPUT (exact format to follow):
Worker: Ravi Kumar, 47M — stranded in Al Ain since 5 Aug 2026, no shelter
Situation: Unpaid salary 4 months — AED 8,400 owed, visa sponsor has absconded
Action taken: None — no MoHRE complaint filed, no police report
Request: Intercede with employer via MoHRE, assist with emergency travel document if visa cancelled
Unknown: Employer current whereabouts, whether absconding case already filed

BULLETS TO WRITE (in this order, using only facts present in the input):
Line 1 — Who and where: name, age/gender, current location. Use the label that fits the case type — Patient (medical/hospital), Worker (labor/salary/visa), Individual (missing person), Detainee (arrested/legal), Victim (abuse/domestic violence)
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

  return sarvamProse(
    [{ role: 'user', content: prompt }],
    { max_tokens: 1500, temperature: 0.3 },
  )
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
 */
export async function generateMissionOneLiner(input: MissionOneLinerInput): Promise<string | null> {
  const prompt = `Write ONE sentence (max 22 words) as a mission status line on the Indian Embassy Ambassador's welfare dashboard.
Status: ${input.status}. Direct, no filler, no "I". Mention the most critical fact.
Data: ${input.totalOpen} open cases, ${input.crisisCount} critical, top type: ${input.topType || 'various'}, ${input.slaBreaches} SLA breach${input.slaBreaches !== 1 ? 'es' : ''}, ${input.employerAlerts} employer alert${input.employerAlerts !== 1 ? 's' : ''}, avg ${input.avgDaysOpen}d open.`

  return sarvamProse(
    [{ role: 'user', content: prompt }],
    { max_tokens: 500, temperature: 0.3 },
  )
}

// ─── Case polish ──────────────────────────────────────────────────────────────

/**
 * Rewrite a raw case description into a formal embassy referral letter.
 * Primary: Sarvam-105B-conversations. Falls back to GPT-4o if empty.
 * If both fail, returns the raw description unchanged.
 */
export async function polishDescription(input: PolishInput): Promise<string> {
  const result = await sarvamProse(
    [
      { role: 'system', content: POLISH_SYSTEM },
      { role: 'user',   content: buildUserMessage(input) },
    ],
    { max_tokens: 2000, temperature: 0.2 },
  )
  return result ?? input.description
}
