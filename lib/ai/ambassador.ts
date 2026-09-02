import 'server-only'

import { sarvamProse, sarvamJSON } from './sarvam'

export type AmbassadorBriefInput = {
  activeCases: number
  criticalCases: number
  avgResolutionDays: number
  responseRate: number
  topCategory: string
  topCategoryPct: number
  dubaiPct: number
  dubaiTrend: number
  medicalTrend: number | null
  recentEmployerAlert: string | null
  repatriationRising: boolean
  slaBreaches: number
  avgDaysOpen: number
  topEmployers: { name: string; count: number }[]
  allCategories: { label: string; count: number; pct: number }[]
  statusBreakdown: { label: string; count: number }[]
}

export type RiskItem = {
  level: 'high' | 'medium' | 'info'
  text: string
}

export type RiskScoreResult = {
  score: 'low' | 'medium' | 'high'
  signals: number
}

function metricsSummary(input: AmbassadorBriefInput): string {
  return [
    `Active welfare cases: ${input.activeCases} (${input.criticalCases} critical, ${input.activeCases - input.criticalCases} non-critical)`,
    `Average resolution time: ${input.avgResolutionDays} days (target: ≤10 days)`,
    `Average days open for active cases: ${input.avgDaysOpen} days`,
    `Embassy response rate: ${input.responseRate}% of cases acknowledged within 48h`,
    `SLA performance (target: resolve within 10 days): ${
      input.slaBreaches === 0
        ? 'all targets met — 0 breaches'
        : `${input.slaBreaches} breach${input.slaBreaches !== 1 ? 'es' : ''} — targets not fully met`
    }`,
    input.allCategories?.length > 0
      ? `Case type breakdown: ${input.allCategories.slice(0, 8).map(c => `${c.label} ${c.count} (${c.pct}%)`).join(', ')}`
      : `Top case category: ${input.topCategory} (${input.topCategoryPct}% of all cases)`,
    input.statusBreakdown?.length > 0
      ? `Case pipeline status: ${input.statusBreakdown.map(s => `${s.label} ${s.count}`).join(', ')}`
      : null,
    `Geographic split: Dubai & other emirates ${input.dubaiPct}% of cases, ${input.dubaiTrend > 0 ? '+' : ''}${input.dubaiTrend}% vs last month`,
    input.medicalTrend != null
      ? `Medical cases trend: ${input.medicalTrend > 0 ? '+' : ''}${input.medicalTrend}% this month`
      : null,
    input.repatriationRising ? 'Repatriation requests: increasing trend this period' : 'Repatriation requests: stable',
    input.topEmployers?.length > 0
      ? `Employers by open case count: ${input.topEmployers.slice(0, 5).map(e => `"${e.name}" ${e.count} case${e.count !== 1 ? 's' : ''}`).join(', ')}`
      : 'No employers with multiple open cases',
  ].filter(Boolean).join('\n')
}

export async function generateAmbassadorBrief(
  input: AmbassadorBriefInput,
  briefType: 'daily' | 'weekly' | 'monthly' = 'daily',
): Promise<string | null> {
  const timeLabel = briefType === 'daily' ? 'morning' : briefType === 'weekly' ? 'week' : 'month'
  const greeting = briefType === 'daily' ? 'Good morning' : briefType === 'weekly' ? 'This week' : 'This month'

  const prompt = `You are the AI chief of staff for the Indian Ambassador to the UAE.

Generate a concise executive welfare briefing for the Ambassador's ${timeLabel} review.
Tone: direct, professional, no filler. The Ambassador has 45 seconds to read this.

FORMAT (follow exactly):
Opening: "${greeting}, Your Excellency."
Then 4–5 bullet points covering the most important welfare situation facts.
Then "Recommended attention:" with 2 specific, actionable items.
End with a single line: "— Ashraya AI, Welfare Platform"

CURRENT METRICS:
${metricsSummary(input)}

Keep total under 200 words. Every bullet must carry a fact, not a generality.`

  return sarvamProse(
    [{ role: 'user', content: prompt }],
    { max_tokens: 1500, temperature: 0.35 },
  )
}

export async function generateEmergingRisks(input: AmbassadorBriefInput): Promise<RiskItem[]> {
  const prompt = `You are the AI risk analyst for the Indian Ambassador UAE welfare platform.

Based on the metrics below, identify exactly 5 emerging risks.
Each risk is ONE specific sentence stating what is happening and why it matters to the Ambassador.
No vague generalities. Every risk must name a specific number or trend.

METRICS:
${metricsSummary(input)}

Return a JSON array only — no markdown, no explanation, nothing else:
[{"level":"high"|"medium"|"info","text":"..."},...]

level: "high"=immediate attention, "medium"=monitor closely, "info"=awareness only`

  const raw = await sarvamJSON(
    [{ role: 'user', content: prompt }],
    { max_tokens: 600, temperature: 0.35, response_format: { type: 'json_object' } },
  )

  if (!raw) return fallbackRisks(input)
  try {
    const text = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text.startsWith('[') ? text : `[${text}]`)
    const items = Array.isArray(parsed) ? parsed : (parsed.risks ?? parsed.items ?? [])
    if (items.length === 0) return fallbackRisks(input)
    return (items as RiskItem[]).slice(0, 5)
  } catch {
    return fallbackRisks(input)
  }
}

export function computeAIRiskScore(input: AmbassadorBriefInput): RiskScoreResult {
  let signals = 0
  if (input.criticalCases > 15) signals++
  if (input.avgResolutionDays > 10) signals++
  if (input.responseRate < 80) signals++
  if (input.medicalTrend != null && input.medicalTrend > 15) signals++
  if (input.recentEmployerAlert !== null) signals++
  if (input.slaBreaches > 10) signals++
  if (input.dubaiTrend > 20) signals++
  const score = signals >= 4 ? 'high' : signals >= 2 ? 'medium' : 'low'
  return { score, signals }
}

export async function askAshrayaAI(
  question: string,
  input: AmbassadorBriefInput,
): Promise<string | null> {
  const prompt = `You are Ashraya AI, the welfare intelligence assistant for the Indian Ambassador to the UAE.
You answer questions about the welfare platform using the metrics below. Reason directly from the numbers — compare, rank, identify trends, and draw conclusions.

Current welfare platform metrics:
${metricsSummary(input)}

The Ambassador has asked: "${question}"

Rules:
- Use the metrics above to answer. If a question can be partially answered, answer the part you can and say clearly what you cannot determine from the available data.
- Only reply with exactly "I can only answer questions about the welfare platform's data, and I don't have that information here." when the question is entirely about something external — e.g., world news, embassy policies not reflected in the data, personal details of specific individuals, or events in other countries. This refusal is a last resort, not a default.
- For any question that touches case counts, categories, employers, statuses, trends, SLA, response rates, or geographic splits — answer it. Those are all in the metrics above.
- Be direct. Use exact numbers. 2–5 sentences. No filler, no hedging, no restating the question.
- Comparisons: name the higher and lower values explicitly. Recommendations: anchor them to a specific metric.`

  return sarvamProse(
    [{ role: 'user', content: prompt }],
    { max_tokens: 1500, temperature: 0.35 },
  )
}

function fallbackRisks(input: AmbassadorBriefInput): RiskItem[] {
  const risks: RiskItem[] = []
  if (input.criticalCases > 10) risks.push({ level: 'high', text: `${input.criticalCases} critical cases require immediate embassy attention — life risk or time-sensitive.` })
  if (input.medicalTrend != null && input.medicalTrend > 10) risks.push({ level: 'high', text: `Medical assistance cases rising ${input.medicalTrend}% this month — highest rate this year.` })
  if (input.recentEmployerAlert) risks.push({ level: 'medium', text: `Employer "${input.recentEmployerAlert}" linked to multiple open welfare cases — possible systemic violation.` })
  if (input.avgResolutionDays > 10) risks.push({ level: 'medium', text: `Average resolution time of ${input.avgResolutionDays} days exceeds the 10-day mission target.` })
  if (input.repatriationRising) risks.push({ level: 'medium', text: 'Repatriation requests rising — elderly and vulnerable citizens most affected this period.' })
  if (input.slaBreaches > 10) risks.push({ level: 'medium', text: `${input.slaBreaches} cases breached the 10-day SLA — unresolved backlog building.` })
  if (input.dubaiTrend > 15) risks.push({ level: 'info', text: `Dubai case volume growing ${input.dubaiTrend}% vs last month — construction sector labour disputes suspected.` })
  if (risks.length < 5) risks.push({ level: 'info', text: `${input.topCategory} cases represent ${input.topCategoryPct}% of all welfare reports — highest single category.` })
  return risks.slice(0, 5)
}
