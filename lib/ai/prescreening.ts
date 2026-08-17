import 'server-only'

export type PrescreeningInput = {
  caseType: string
  narrative: string
  hasAttachments: boolean
  attachmentLabels: string[]
  affectedName: string | null
  affectedGender: string | null
  affectedAge: number | null
  companyName: string | null
  dateOfIncident: string | null
  reporterName: string | null
  reporterPhone: string | null
  emirate: string
}

export type PrescreeningResult = {
  completeness: { pass: boolean; issues: string[] }
  consistency:  { pass: boolean; issues: string[] }
  documents:    { pass: boolean; issues: string[] }
  redFlags:     { pass: boolean; issues: string[] }
  summary:      string
  confidence:   'high' | 'medium' | 'low'
}

const SYSTEM_PROMPT = `You are a welfare case quality reviewer for the Telangana Friends Association (TFA), UAE. A volunteer has just submitted a welfare case that will be forwarded to the Indian Embassy. Your job is to check four things and return a JSON object — nothing else.

Return this exact JSON shape:
{
  "completeness": { "pass": true/false, "issues": ["..."] },
  "consistency":  { "pass": true/false, "issues": ["..."] },
  "documents":    { "pass": true/false, "issues": ["..."] },
  "redFlags":     { "pass": true/false, "issues": ["..."] },
  "summary":      "1-2 sentence plain-English note for the admin",
  "confidence":   "high" or "medium" or "low"
}

Rules:
- completeness: Are key fields present for this case type? (e.g. employer name for labour cases, location for missing persons, date of incident where relevant)
- consistency: Does the narrative match the declared case type? Does the timeline make sense? Flag obvious mismatches only.
- documents: Were attachments provided? For death/medical/police cases, flag if none are present.
- redFlags: Future dates, contradictory details, implausible facts, generic filler text. This is NOT a fraud verdict — it is a note for a human admin to look closer.
- confidence: "high" if all checks pass or issues are minor; "medium" if 1-2 issues; "low" if multiple concerns.
- Keep issues concise — one short sentence each. If a check passes, issues array is empty.
- NEVER invent facts. Only assess what is provided.`

function buildUserMessage(input: PrescreeningInput): string {
  return [
    `Today's date: ${new Date().toISOString().split('T')[0]}`,
    `Case type: ${input.caseType}`,
    `Emirate: ${input.emirate}`,
    `Affected person: ${input.affectedName ?? 'Not provided'}, ${input.affectedGender ?? 'gender unknown'}, age ${input.affectedAge ?? 'unknown'}`,
    `Employer / company: ${input.companyName ?? 'Not provided'}`,
    `Date of incident: ${input.dateOfIncident ?? 'Not provided'}`,
    `Reporter: ${input.reporterName ?? 'Not provided'} · ${input.reporterPhone ?? 'no phone'}`,
    `Attachments: ${input.hasAttachments ? input.attachmentLabels.join(', ') : 'None'}`,
    '',
    'Case narrative:',
    input.narrative || '(no narrative provided)',
  ].join('\n')
}

/**
 * Run GPT-4o pre-screening on a newly submitted case.
 * Returns null if OPENAI_API_KEY is not set or the call fails — non-fatal.
 * Never receives passport numbers or Emirates IDs (not in PrescreeningInput).
 */
export async function prescreenCase(
  input: PrescreeningInput,
): Promise<PrescreeningResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserMessage(input) },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content) as PrescreeningResult
  } catch {
    return null
  }
}
