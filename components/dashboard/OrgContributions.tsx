'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type { PanelCase } from './CaseSidePanel'

// ── colours cycling through orgs ─────────────────────────────────────────────

const ORG_PALETTE = [
  '#185FA5',
  '#1D9E75',
  '#7F77DD',
  '#D4537E',
  '#D85A30',
  '#EF9F27',
  '#E24B4A',
  '#888780',
]

// ── helpers ───────────────────────────────────────────────────────────────────

// Canonical grouping key — always the abbreviation prefix in the case ID so that
// legacy cases (no org_id) and linked cases from the same NGO land in one bucket.
function orgKey(c: PanelCase): string {
  return c.case_id?.split('-')[0] ?? c.organizations?.name ?? 'Unknown'
}

// Human-readable label: full org name when available, abbreviation otherwise.
function orgDisplayName(c: PanelCase): string {
  return c.organizations?.name ?? c.case_id?.split('-')[0] ?? 'Unknown'
}

// ── sub-components ────────────────────────────────────────────────────────────

function TypeRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 min-w-0 truncate text-sm text-brand-fg">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-brand-border">
          <div className="h-1 rounded-full bg-brand-navy/30" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 text-right text-sm font-semibold tabular-nums text-brand-navy">
          {count}
        </span>
      </div>
    </div>
  )
}

function OrgRow({
  name,
  total,
  share,
  color,
  byType,
}: {
  name: string
  total: number
  share: number
  color: string
  byType: { type: string; count: number }[]
}) {
  const [open, setOpen] = useState(false)
  const maxTypeCount = byType[0]?.count ?? 1

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      {/* ── header row ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-brand-navy/5"
      >
        {/* colour dot */}
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: color }}
        />

        {/* org name */}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-navy">
          {name}
        </span>

        {/* progress bar + count */}
        <div className="flex items-center gap-3">
          <div className="hidden w-28 overflow-hidden rounded-full bg-brand-border sm:block" style={{ height: 5 }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${share}%`, background: color }}
            />
          </div>
          <span className="w-8 text-right text-sm font-bold tabular-nums" style={{ color }}>
            {total}
          </span>
        </div>

        {/* chevron */}
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 text-brand-muted transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── expanded breakdown ── */}
      {open && (
        <div className="border-t border-brand-border px-4 py-4 flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted mb-1">
            Case type breakdown
          </p>
          {byType.map(t => (
            <TypeRow key={t.type} label={t.type} count={t.count} max={maxTypeCount} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── public component ──────────────────────────────────────────────────────────

export function OrgContributions({ cases }: { cases: PanelCase[] }) {
  const orgs = useMemo(() => {
    const map = new Map<string, { name: string; byType: Map<string, number> }>()

    for (const c of cases) {
      const key  = orgKey(c)
      const name = orgDisplayName(c)
      if (!map.has(key)) map.set(key, { name, byType: new Map() })
      const entry = map.get(key)!
      // Upgrade to full name if we see it on a linked case
      if (c.organizations?.name) entry.name = c.organizations.name
      entry.byType.set(c.case_type, (entry.byType.get(c.case_type) ?? 0) + 1)
    }

    return [...map.values()]
      .map(o => ({
        name:   o.name,
        total:  [...o.byType.values()].reduce((s, n) => s + n, 0),
        byType: [...o.byType.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
      }))
      .sort((a, b) => b.total - a.total)
  }, [cases])

  const grandTotal = orgs.reduce((s, o) => s + o.total, 0)

  if (orgs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-brand-muted italic">
        No cases in this period
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {orgs.map((o, i) => (
        <OrgRow
          key={o.name}
          name={o.name}
          total={o.total}
          share={grandTotal > 0 ? Math.round((o.total / grandTotal) * 100) : 0}
          color={ORG_PALETTE[i % ORG_PALETTE.length]}
          byType={o.byType}
        />
      ))}
    </div>
  )
}
