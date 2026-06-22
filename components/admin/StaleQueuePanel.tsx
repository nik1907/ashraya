'use client'

import { useState } from 'react'

import { sendFollowUp } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'
import { StatusBadge } from '@/components/CasesList'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'
import { getPriority, PRIORITY_DOT } from '@/lib/caseUtils'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function isStale(c: PanelCase, thresholdDays: number): boolean {
  if (['resolved', 'closed'].includes(c.status)) return false
  const ts = c.updated_at ?? c.created_at
  return daysSince(ts) > thresholdDays
}

// ── types ─────────────────────────────────────────────────────────────────────

const THRESHOLDS = [3, 7, 14, 21] as const
type Threshold = (typeof THRESHOLDS)[number]

// ── component ─────────────────────────────────────────────────────────────────

export function StaleQueuePanel({
  cases,
  thresholdDays = 7,
}: {
  cases: PanelCase[]
  thresholdDays?: number
}) {
  const [threshold, setThreshold] = useState<Threshold>(
    (THRESHOLDS.includes(thresholdDays as Threshold) ? thresholdDays : 7) as Threshold,
  )
  const [open, setOpen] = useState(true)

  // Stalest first: biggest daysSince(updated_at ?? created_at)
  const staleCases = cases
    .filter((c) => isStale(c, threshold))
    .sort((a, b) => {
      const dA = daysSince(a.updated_at ?? a.created_at)
      const dB = daysSince(b.updated_at ?? b.created_at)
      return dB - dA
    })

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card shadow-sm">
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left hover:bg-brand-navy/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🕐</span>
          <span className="text-sm font-semibold text-brand-navy">
            Stale Cases — No Activity in {threshold}d+
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              staleCases.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {staleCases.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Threshold pill switcher — stop propagation so clicking pills doesn't toggle panel */}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-brand-border bg-white p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {THRESHOLDS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThreshold(t)}
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  threshold === t
                    ? 'bg-brand-navy text-white'
                    : 'text-brand-muted hover:text-brand-navy'
                }`}
              >
                {t}d
              </button>
            ))}
          </div>
          <span className="text-[11px] text-brand-muted">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="border-t border-brand-border">
          {staleCases.length === 0 ? (
            <p className="px-4 py-5 text-sm text-green-700">
              All cases had activity within {threshold} days ✓
            </p>
          ) : (
            <div className="divide-y divide-brand-border">
              {staleCases.map((c) => {
                const priority = getPriority(c.case_type, c.status, c.created_at)
                const staleAge = daysSince(c.updated_at ?? c.created_at)

                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    {/* Priority dot */}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PRIORITY_DOT[priority] }}
                      title={priority}
                    />

                    {/* Name */}
                    <span className="min-w-[120px] font-medium text-brand-navy text-sm">
                      {c.name ?? '—'}
                    </span>

                    {/* Case type */}
                    <span className="hidden truncate text-xs text-brand-muted sm:block max-w-[160px]">
                      {c.case_type}
                    </span>

                    {/* Days stale */}
                    <span
                      className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
                        staleAge >= 21
                          ? 'text-red-600'
                          : staleAge >= 14
                          ? 'text-amber-600'
                          : 'text-brand-muted'
                      }`}
                    >
                      {staleAge}d ago
                    </span>

                    {/* Status badge */}
                    <StatusBadge status={c.status} />

                    {/* Emirate */}
                    {c.assigned_emirate && (
                      <span className="hidden text-xs text-brand-muted sm:block">
                        {c.assigned_emirate}
                      </span>
                    )}

                    {/* Follow up button */}
                    <form action={sendFollowUp} className="ml-auto">
                      <input type="hidden" name="case_id" value={c.id} />
                      <SubmitButton
                        pendingText="Sending…"
                        className="rounded border border-brand-border bg-white px-2.5 py-1 text-xs font-medium text-brand-muted hover:border-brand-navy hover:text-brand-navy transition-colors"
                      >
                        Follow up
                      </SubmitButton>
                    </form>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
