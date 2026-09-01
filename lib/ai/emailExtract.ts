import 'server-only'

import { sarvamJSON } from './sarvam'

export type EmailExtracted = {
  name: string | null
  phone: string | null
  emirate: 'Abu Dhabi' | 'Dubai' | null
  issue_type: string | null
  urgency: 'low' | 'medium' | 'high'
  summary: string
  confidence: number
}

const SYSTEM = `You are an AI triage assistant for the Embassy of India in the UAE. You process emails forwarded to the welfare inbox and extract structured data for case management.

Extract these fields from the email:
- name: full name of the AFFECTED Indian national (not the sender, unless sender is reporting their own case)
- phone: phone number if mentioned (any format)
- emirate: "Abu Dhabi" or "Dubai" — infer from company location, mentioned city, or context. Null if unclear.
- issue_type: one of: "Labour Dispute", "Repatriation", "Medical Emergency", "Missing Person", "Domestic Abuse", "Passport/Document Issues", "Imprisonment/Legal", "Other"
- urgency: "high" (life-threatening / missing / medical / detained), "medium" (unpaid wages, stranded), "low" (document queries, general)
- summary: 2–3 sentences, factual, no fluff. What happened, who it affects, what is needed.
- confidence: 0.0–1.0 — how confident you are this is a real welfare case needing a file. 0.9+ for clear welfare distress; 0.5 for possible cases needing officer judgement; below 0.3 for spam, auto-replies, or clearly non-welfare emails.

Respond with ONLY valid JSON matching the schema above. No explanation, no markdown.`

const JSON_SCHEMA = {
  name: 'email_extracted',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      name:       { type: ['string', 'null'] },
      phone:      { type: ['string', 'null'] },
      emirate:    { type: ['string', 'null'], enum: ['Abu Dhabi', 'Dubai', null] },
      issue_type: { type: ['string', 'null'] },
      urgency:    { type: 'string', enum: ['low', 'medium', 'high'] },
      summary:    { type: 'string' },
      confidence: { type: 'number' },
    },
    required: ['name', 'phone', 'emirate', 'issue_type', 'urgency', 'summary', 'confidence'],
    additionalProperties: false,
  },
}

export async function extractEmailToCase(
  subject: string,
  fromEmail: string,
  fromName: string | null,
  body: string,
): Promise<EmailExtracted | null> {
  const prompt = `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}
Subject: ${subject ?? '(no subject)'}
---
${body.slice(0, 3000)}`

  const raw = await sarvamJSON(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: prompt },
    ],
    {
      max_tokens:      4000,
      temperature:     0.1,
      response_format: { type: 'json_schema', json_schema: JSON_SCHEMA },
    },
  )

  if (!raw) return null
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as EmailExtracted
  } catch {
    return null
  }
}
