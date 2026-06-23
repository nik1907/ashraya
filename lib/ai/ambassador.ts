import 'server-only'

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
}

export type RiskItem = {
  level: 'high' | 'medium' | 'info'
  text: string
}

export type RiskScoreResult = {
  score: 'low' | 'medium' | 'high'
  signals: number
}

const MODEL = 'gpt-4o'

async function callGPT(prompt: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

function metricsSummary(input: AmbassadorBriefInput): string {
  return [
    `Active welfare cases: ${input.activeCases} (${input.criticalCases} critical)`,
    `Average resolution time: ${input.avgResolutionDays} days`,
    `Embassy response rate: ${input.responseRate}% of cases acknowledged within 48h`,
    `Top case category: ${input.topCategory} (${input.topCategoryPct}% of all cases)`,
    `Dubai & other emirates: ${input.dubaiPct}% of cases, ${input.dubaiTrend > 0 ? '+' : ''}${input.dubaiTrend}% vs last month`,
    input.medicalTrend != null
      ? `Medical cases: ${input.medicalTrend > 0 ? '+' : ''}${input.medicalTrend}% this month`
      : null,
    input.recentEmployerAlert
      ? `Employer alert: "${input.recentEmployerAlert}" has multiple open welfare cases`
      : null,
    input.repatriationRising ? 'Repatriation requests increasing (rising trend)' : null,
    `SLA breaches (cases open >10 days unresolved): ${input.slaBreaches}`,
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

  return callGPT(prompt, 450)
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

  const raw = await callGPT(prompt, 700)
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
The Ambassador has asked: "${question}"

Current welfare platform metrics:
${metricsSummary(input)}

Answer directly and concisely — 3 to 6 sentences. Be specific. Use the numbers. No filler, no hedging.
If the question asks for a comparison, give exact numbers. If it asks for a recommendation, give a specific action.`

  return callGPT(prompt, 350)
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
