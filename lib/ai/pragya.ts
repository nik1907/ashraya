import 'server-only'

import { sarvamJSON } from './sarvam'

// ── public types ──────────────────────────────────────────────────────────────

export type PragyaMission = 'all' | 'abu-dhabi' | 'dubai'
export type PragyaPeriod  = '30d' | '90d' | '6m' | '1y'

export type PragyaPattern = {
  icon:     'cluster' | 'spike' | 'slowdown' | 'geographic' | 'escalation'
  headline: string
  evidence: string
  mission:  string
}

export type PragyaPrediction = {
  signal:     string
  confidence: 'data-backed' | 'watch'
  direction:  'up' | 'down' | 'stable'
}

export type PragyaConnection = {
  type:      'employer-nexus' | 'location-cluster' | 'timing-cluster'
  summary:   string
  caseCount: number
}

export type PragyaRecommendation = {
  action:    string
  target:    string
  rationale: string
}

export type PragyaOutput = {
  riskLevel:       'LOW' | 'ELEVATED' | 'CRITICAL'
  brief:           string[]
  patterns:        PragyaPattern[]
  predictions:     PragyaPrediction[]
  connections:     PragyaConnection[]
  recommendations: PragyaRecommendation[]
}

// Minimal shape needed from case rows
export type AggCase = {
  id:                string
  case_id:           string | null
  case_type:         string
  status:            string
  assigned_emirate:  string
  created_at:        string
  company_name:      string | null
  company_location?: string | null
  date_of_incident?: string | null
}

// ── helpers ───────────────────────────────────────────────────────────────────

function periodMs(period: PragyaPeriod): number {
  const days = { '30d': 30, '90d': 90, '6m': 180, '1y': 365 }[period]
  return days * 86_400_000
}

function matchesMission(c: AggCase, mission: PragyaMission): boolean {
  if (mission === 'all') return true
  if (mission === 'abu-dhabi') return c.assigned_emirate === 'Abu Dhabi'
  return c.assigned_emirate !== 'Abu Dhabi'
}

function toCategory(t: string): string {
  const l = t.toLowerCase()
  if (l.includes('death') || l.includes('dead') || l.includes('repatriat')) return 'Death & Repatriation'
  if (l.includes('medical') || l.includes('health') || l.includes('hospital') || l.includes('accident')) return 'Medical'
  if (l.includes('salary') || l.includes('labour') || l.includes('labor') || l.includes('employ') || l.includes('wage')) return 'Labour'
  if (l.includes('legal') || l.includes('court') || l.includes('arrest') || l.includes('police') || l.includes('detent')) return 'Legal'
  if (l.includes('family') || l.includes('marital') || l.includes('divorce') || l.includes('domestic')) return 'Family'
  if (l.includes('financial') || l.includes('fraud') || l.includes('scam') || l.includes('theft')) return 'Financial'
  if (l.includes('missing')) return 'Missing Person'
  if (l.includes('passport') || l.includes('document') || l.includes('visa') || l.includes('overstay')) return 'Documents'
  return 'Other'
}

function getSlaHours(caseType: string): number {
  const crit = ['police', 'detent', 'arrest', 'death', 'traffick', 'missing', 'medic']
  return crit.some(k => caseType.toLowerCase().includes(k)) ? 48 : 7 * 24
}

// ── aggregation ───────────────────────────────────────────────────────────────

type CategoryStat    = { label: string; current: number; prior: number; pctChange: number }
type EmployerCluster = { key: string; realName: string; cases: number; types: string[] }
type LocationCluster = { zone: string; cases: number; employers: number }

function computeAggregates(cases: AggCase[], mission: PragyaMission, period: PragyaPeriod) {
  const now        = Date.now()
  const ms         = periodMs(period)
  const cutoff     = new Date(now - ms)
  const priorStart = new Date(now - 2 * ms)

  const all     = cases.filter(c => matchesMission(c, mission))
  const current = all.filter(c => new Date(c.created_at) >= cutoff)
  const prior   = all.filter(c => { const d = new Date(c.created_at); return d >= priorStart && d < cutoff })
  const open    = current.filter(c => !['resolved', 'closed'].includes(c.status))

  // Category breakdown with % change vs prior period
  const catCurrent  = new Map<string, number>()
  const catPrior    = new Map<string, number>()
  for (const c of current) { const k = toCategory(c.case_type); catCurrent.set(k, (catCurrent.get(k) ?? 0) + 1) }
  for (const c of prior)   { const k = toCategory(c.case_type); catPrior.set(k,   (catPrior.get(k)   ?? 0) + 1) }
  const categoryBreakdown: CategoryStat[] = [...catCurrent.entries()]
    .map(([label, count]) => {
      const p = catPrior.get(label) ?? 0
      return { label, current: count, prior: p, pctChange: p > 0 ? Math.round((count - p) / p * 100) : 0 }
    })
    .sort((a, b) => b.current - a.current)

  // SLA breaches in open cases
  const slaBreached = open.filter(c => {
    const hrs = (now - new Date(c.created_at).getTime()) / 3_600_000
    return hrs > getSlaHours(c.case_type)
  }).length

  // Avg resolution days (resolved in period)
  const resolved = current.filter(c => c.status === 'resolved')
  const avgResolutionDays = resolved.length
    ? Math.round(resolved.reduce((s, c) => s + Math.floor((now - new Date(c.created_at).getTime()) / 86_400_000), 0) / resolved.length)
    : 0

  // Mission split
  const missionSplit = {
    abuDhabi: current.filter(c => c.assigned_emirate === 'Abu Dhabi').length,
    dubai:    current.filter(c => c.assigned_emirate !== 'Abu Dhabi').length,
  }

  // Employer clusters (>= 2 cases), redacted keys for GPT
  const empMap = new Map<string, AggCase[]>()
  for (const c of current) {
    if (!c.company_name) continue
    if (!empMap.has(c.company_name)) empMap.set(c.company_name, [])
    empMap.get(c.company_name)!.push(c)
  }
  const employerClusters: EmployerCluster[] = [...empMap.entries()]
    .filter(([, cs]) => cs.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([name, cs], i) => ({
      key:      `[EMPLOYER-${i + 1}]`,
      realName: name,
      cases:    cs.length,
      types:    [...new Set(cs.map(c => toCategory(c.case_type)))],
    }))

  // Location clusters (>= 2 cases from >= 2 employers in same zone)
  const locMap = new Map<string, { cases: number; employers: Set<string> }>()
  for (const c of current) {
    if (!c.company_location) continue
    if (!locMap.has(c.company_location)) locMap.set(c.company_location, { cases: 0, employers: new Set() })
    const entry = locMap.get(c.company_location)!
    entry.cases++
    if (c.company_name) entry.employers.add(c.company_name)
  }
  const locationClusters: LocationCluster[] = [...locMap.entries()]
    .filter(([, v]) => v.cases >= 2 && v.employers.size >= 2)
    .map(([zone, v]) => ({ zone, cases: v.cases, employers: v.employers.size }))

  // Monthly trend (last 6 months) for top 3 categories
  const top3cats = categoryBreakdown.slice(0, 3).map(c => c.label)
  const trendVelocity = top3cats.map(cat => {
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now)
      start.setMonth(start.getMonth() - (5 - i))
      start.setDate(1); start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      return all.filter(c => toCategory(c.case_type) === cat && new Date(c.created_at) >= start && new Date(c.created_at) < end).length
    })
    return { label: cat, monthly }
  })

  // Status funnel
  const statusFunnel = {
    sent:         current.filter(c => c.status === 'sent').length,
    acknowledged: current.filter(c => c.status === 'acknowledged').length,
    inProgress:   current.filter(c => c.status === 'in_progress').length,
    needMoreInfo: current.filter(c => c.status === 'need_more_info').length,
    resolved:     current.filter(c => ['resolved', 'closed'].includes(c.status)).length,
  }

  return {
    period,
    mission,
    totalCases:        current.length,
    openCases:         open.length,
    criticalCases:     open.filter(c => getSlaHours(c.case_type) <= 48).length,
    avgResolutionDays,
    slaBreached,
    categoryBreakdown,
    missionSplit,
    employerClusters,
    locationClusters,
    trendVelocity,
    statusFunnel,
    _nameMap: Object.fromEntries(employerClusters.map(e => [e.key, e.realName])),
  }
}

// ── Sarvam integration ────────────────────────────────────────────────────────

async function callGPT(prompt: string): Promise<string | null> {
  return sarvamJSON(
    [{ role: 'user', content: prompt }],
    { max_tokens: 6000, temperature: 0.2, response_format: { type: 'json_object' } },
  )
}

function buildPrompt(agg: ReturnType<typeof computeAggregates>): string {
  const categoryLines = agg.categoryBreakdown.length
    ? agg.categoryBreakdown
        .map(({ label, current, pctChange }) => {
          const trend = pctChange > 0 ? `+${pctChange}% vs prior` : pctChange < 0 ? `${pctChange}% vs prior` : 'flat vs prior'
          return `  - ${label}: ${current} case${current !== 1 ? 's' : ''} (${trend})`
        })
        .join('\n')
    : '  (no cases in this period)'

  const employerLines = agg.employerClusters.length
    ? agg.employerClusters
        .map(({ key, cases, types }) => `  - ${key}: ${cases} cases — ${types.join(', ')}`)
        .join('\n')
    : '  (no employer clusters detected)'

  const locationLines = agg.locationClusters.length
    ? agg.locationClusters
        .map(({ zone, cases, employers }) => `  - ${zone}: ${cases} cases from ${employers} different employers`)
        .join('\n')
    : '  (no location clusters detected)'

  return `You are Pragya, a strategic intelligence engine for the Embassy of India's welfare case management system.

CRITICAL OUTPUT RULES — FAILURE TO FOLLOW THESE MAKES THE OUTPUT UNUSABLE:
1. Write ALL text fields as plain English sentences. NEVER include JSON key names ("pctChange", "slaBreached", "openCases", "criticalCases", "avgResolutionDays") in any text field.
2. Every "brief" bullet must read as a sentence a senior diplomat could speak aloud, with a number embedded naturally.
   CORRECT: "Financial welfare cases surged 400% over the past 90 days — 5 active cases require immediate attention."
   WRONG:   "Financial category pctChange: 400"
   WRONG:   "openCases: 16, slaBreached: 10"
3. "patterns[].headline" must be a short strategic title, never a raw label.
   CORRECT: "Financial Cases Quadrupled This Quarter"
   WRONG:   "Significant increase in Financial cases"
4. "patterns[].evidence" must be readable data: e.g. "5 cases · +400% · All Missions"
5. "predictions[].signal" must be a forward-looking sentence: "Financial caseload is expected to continue rising through the next quarter."
6. "connections[].summary" must be a plain English strategic observation about the relationship.
7. Employer names appear as [EMPLOYER-1], [EMPLOYER-2] etc — use those exact keys in your output; they are replaced before display.
8. Return valid JSON only. No markdown, no code fences, no prose outside the JSON object.
9. riskLevel: CRITICAL if slaBreached > 0 or criticalCases >= 3 or any category increased >50%; ELEVATED if criticalCases >= 1 or any employer has >= 4 cases; otherwise LOW.
10. If no finding exists for a section, return an empty array — never fabricate patterns.

CASE DATA (${agg.period} window · ${agg.mission} missions):
  Total cases: ${agg.totalCases}
  Open / unresolved: ${agg.openCases}
  Critical case types (48h SLA): ${agg.criticalCases}
  SLA breached: ${agg.slaBreached}
  Avg days to resolution: ${agg.avgResolutionDays}
  Abu Dhabi: ${agg.missionSplit.abuDhabi} cases | Dubai: ${agg.missionSplit.dubai} cases

Case categories vs prior ${agg.period}:
${categoryLines}

Employer clusters (2+ cases from same employer):
${employerLines}

Location clusters (2+ cases from 2+ employers in same zone):
${locationLines}

Return this exact JSON shape — all arrays may be empty:
{
  "riskLevel": "LOW" | "ELEVATED" | "CRITICAL",
  "brief": ["plain English sentence with a number", "..."],
  "patterns": [{ "icon": "cluster"|"spike"|"slowdown"|"geographic"|"escalation", "headline": "short strategic title", "evidence": "N cases · metric · mission", "mission": "All"|"Abu Dhabi"|"Dubai" }],
  "predictions": [{ "signal": "forward-looking sentence", "confidence": "data-backed"|"watch", "direction": "up"|"down"|"stable" }],
  "connections": [{ "type": "employer-nexus"|"location-cluster"|"timing-cluster", "summary": "plain English strategic observation", "caseCount": N }],
  "recommendations": [{ "action": "action verb phrase", "target": "entity or category name (or [EMPLOYER-N])", "rationale": "N cases · supporting detail" }]
}`
}

function resubstituteNames(output: PragyaOutput, nameMap: Record<string, string>): PragyaOutput {
  const sub = (s: string) => s.replace(/\[EMPLOYER-\d+\]/g, m => nameMap[m] ?? m)
  return {
    ...output,
    patterns:        output.patterns.map(p => ({ ...p, headline: sub(p.headline), evidence: sub(p.evidence) })),
    connections:     output.connections.map(c => ({ ...c, summary: sub(c.summary) })),
    recommendations: output.recommendations.map(r => ({ ...r, target: sub(r.target), rationale: sub(r.rationale) })),
  }
}

// ── public export ─────────────────────────────────────────────────────────────

export async function generatePragyaInsights(
  cases:   AggCase[],
  mission: PragyaMission,
  period:  PragyaPeriod,
): Promise<PragyaOutput> {
  const agg  = computeAggregates(cases, mission, period)
  const raw  = await callGPT(buildPrompt(agg))

  const fallback: PragyaOutput = {
    riskLevel: agg.slaBreached > 0 || agg.criticalCases >= 3 ? 'CRITICAL'
             : agg.criticalCases >= 1 ? 'ELEVATED'
             : 'LOW',
    brief: [
      `${agg.openCases} of ${agg.totalCases} cases remain open; ${agg.slaBreached} ${agg.slaBreached === 1 ? 'has' : 'have'} breached SLA thresholds.`,
      agg.categoryBreakdown[0]
        ? `${agg.categoryBreakdown[0].label} is the leading welfare category with ${agg.categoryBreakdown[0].current} cases in the past ${agg.period}.`
        : 'No case category data is available for the selected period.',
      agg.avgResolutionDays > 0
        ? `Average time to resolution is ${agg.avgResolutionDays} days across resolved cases in this window.`
        : 'No resolved cases recorded in this period.',
    ],
    patterns:        [],
    predictions:     [],
    connections:     [],
    recommendations: [],
  }

  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as PragyaOutput
    return resubstituteNames(parsed, agg._nameMap)
  } catch {
    return fallback
  }
}
