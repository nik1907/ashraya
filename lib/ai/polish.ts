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

/**
 * Rewrite a raw case description into a formal embassy summary using GPT-4o.
 * If no API key is configured, returns the raw description unchanged so the
 * pipeline still works in development (the email just won't be AI-polished).
 */
export async function polishDescription(input: PolishInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return input.description
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: buildPrompt(input) }],
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      console.error('OpenAI error', res.status, await res.text())
      return input.description
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || input.description
  } catch (err) {
    console.error('OpenAI request failed', err)
    return input.description
  }
}
