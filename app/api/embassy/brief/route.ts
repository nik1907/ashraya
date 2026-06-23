import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type Range = '7d' | '30d' | '90d' | '1y' | 'all'
const RANGE_DAYS: Record<Range, number | null> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null }

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role?.startsWith('embassy'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const range = ((req.nextUrl.searchParams.get('range') ?? '30d') as Range)
  const days  = RANGE_DAYS[range] ?? null

  // RLS automatically scopes to the user's emirate
  const { data: cases, error: dbError } = await supabase
    .from('cases')
    .select('id, case_type, status, company_name, created_at')
    .order('created_at', { ascending: false })

  if (dbError || !cases)
    return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 })

  const cutoff   = days ? new Date(Date.now() - days * 86_400_000) : null
  const inRange  = cutoff ? cases.filter(c => new Date(c.created_at) >= cutoff) : cases
  const total    = inRange.length

  if (total === 0)
    return NextResponse.json({ bullets: ['No cases found in the selected period.'] })

  // ── compute aggregated statistics (no raw case content goes to the AI) ──

  const statusCounts: Record<string, number> = {}
  inRange.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1 })

  const typeCounts = new Map<string, number>()
  inRange.forEach(c => typeCounts.set(c.case_type, (typeCounts.get(c.case_type) ?? 0) + 1))
  const topTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([type, count]) => ({ type, count, pct: Math.round(count / total * 100) }))

  const companyCounts = new Map<string, number>()
  inRange.forEach(c => { if (c.company_name) companyCounts.set(c.company_name, (companyCounts.get(c.company_name) ?? 0) + 1) })
  const repeatEmployers = [...companyCounts.entries()]
    .filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const openCases      = inRange.filter(c => !['resolved', 'closed'].includes(c.status))
  const slaBreaches    = openCases.filter(c => daysOpen(c.created_at) >= 21).length
  const urgentCount    = openCases.filter(c => daysOpen(c.created_at) >= 7).length
  const resolvedCount  = inRange.filter(c => ['resolved', 'closed'].includes(c.status)).length
  const resolutionRate = Math.round(resolvedCount / total * 100)
  const oldestDays     = openCases.length > 0 ? Math.max(...openCases.map(c => daysOpen(c.created_at))) : 0

  // trend vs previous period
  const prevCutoff  = cutoff && days ? new Date(cutoff.getTime() - days * 86_400_000) : null
  const prevTotal   = prevCutoff && cutoff
    ? cases.filter(c => { const t = new Date(c.created_at); return t >= prevCutoff && t < cutoff }).length
    : null
  const trendPct    = prevTotal !== null && prevTotal > 0
    ? Math.round((total - prevTotal) / prevTotal * 100)
    : null

  const periodLabel = range === 'all' ? 'all time' : `last ${range}`
  const statusText  = Object.entries(statusCounts)
    .map(([k, v]) => `${k}=${v}`).join(', ') || 'none'
  const typesText   = topTypes.map(t => `${t.type}: ${t.count} (${t.pct}%)`).join('; ')
  const employerText = repeatEmployers.length > 0
    ? repeatEmployers.map(e => `${e.name}: ${e.count} cases`).join('; ')
    : 'none'
  const trendText = trendPct !== null
    ? `${trendPct > 0 ? '+' : ''}${trendPct}% vs previous ${range} period (prev: ${prevTotal} cases)`
    : 'insufficient prior data for trend'

  const statsBlock = [
    `Period: ${periodLabel}`,
    `Total cases: ${total}`,
    `Status breakdown: ${statusText}`,
    `Top case types: ${typesText}`,
    `Employers with 2+ cases: ${employerText}`,
    `Open cases: ${openCases.length}`,
    `Open >7 days (urgent): ${urgentCount}`,
    `Open >21 days (SLA breach): ${slaBreaches}`,
    `Resolved/closed in period: ${resolvedCount} (${resolutionRate}%)`,
    `Oldest open case: ${oldestDays} days`,
    `Trend: ${trendText}`,
  ].join('\n')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured on this server' }, { status: 503 })

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5.5-2026-04-23',
        temperature: 0.7,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `You are a senior welfare-case analyst briefing the Indian Embassy.

Output EXACTLY 7 numbered lines using this format:
1. [sentence]
2. [sentence]
3. [sentence]
4. [sentence]
5. [sentence]
6. [sentence]
7. [sentence]

Lines 1–5: concise professional briefing statements — factual, data-grounded.
Lines 6–7: hidden pattern observations — non-obvious concentrations, anomalies, or trends.

STRICT RULES:
1. Every line MUST cite at least one specific number from the STATISTICS.
2. Never speculate. Never use "may", "might", "could", "seems", "suggests".
3. Each sentence is maximum 15 words. No sub-clauses. No semicolons. Active voice.
4. Each number (1–7) must be on its own line with a newline after it.
5. No blank lines between numbered items.`,
          },
          {
            role: 'user',
            content: `Write exactly 7 lines based ONLY on these statistics:\n\n${statsBlock}`,
          },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 502 })

    const json = await res.json()
    const raw  = (json.choices?.[0]?.message?.content ?? '').trim()

    // Split by newlines; if the model still returns one paragraph, split by ". " as fallback
    let lines = raw
      .split('\n')
      .map((l: string) => l.replace(/^[\s•\-\*\d\.\)]+/, '').trim())
      .filter((l: string) => l.length > 10)

    if (lines.length < 4) {
      lines = raw
        .split(/\.\s+/)
        .map((l: string) => l.replace(/^[\s•\-\*\d\.\)]+/, '').trim())
        .filter((l: string) => l.length > 10)
        .map((l: string) => l.endsWith('.') ? l : l + '.')
    }

    const bullets  = lines.slice(0, 5)
    const patterns = lines.slice(5, 7)

    return NextResponse.json({ bullets, patterns })
  } catch {
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
  }
}
