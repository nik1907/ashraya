'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { updateCaseStatus } from '@/app/admin/actions'
import { CaseSidePanel, type PanelCase } from '@/components/dashboard/CaseSidePanel'
import { EMBASSY_STATUS_OPTIONS } from '@/lib/types'

const PAGE_SIZE = 15

// ─── priority ─────────────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'normal'

const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, normal: 3 }
const PRIORITY_COLOR: Record<Priority, string>  = {
  critical: '#E24B4A', high: '#EF9F27', medium: '#EEA82A', normal: '#639922',
}
const PRIORITY_LABEL: Record<Priority, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', normal: 'Normal',
}

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function getPriority(caseType: string, status: string, createdAt: string): Priority {
  const t = caseType.toLowerCase()
  const age = daysOpen(createdAt)
  if (
    t.includes('police') || t.includes('detent') || t.includes('arrest') ||
    t.includes('death')  || t.includes('traffick') || t.includes('medical') ||
    t.includes('missing')
  ) return 'critical'
  if (status === 'sent') {
    if (age >= 3) return 'critical'
    if (age >= 1) return 'high'
  }
  if (
    t.includes('passport') || t.includes('harass') || t.includes('abscond') ||
    t.includes('exit')     || t.includes('human')  || t.includes('overstay')
  ) return 'high'
  if (age >= 21) return 'critical'
  if (age >= 14) return 'high'
  if (age >= 7)  return 'medium'
  return 'normal'
}

// ─── status display ───────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, string> = {
  submitted:      'Processing',
  sent:           'Received',
  acknowledged:   'Acknowledged',
  need_more_info: 'Info Requested',
  in_progress:    'In Progress',
  resolved:       'Resolved/Closed',
  closed:         'Resolved/Closed',
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  sent:           { bg: '#E6F1FB', text: '#0C447C' },
  acknowledged:   { bg: '#EEEDFE', text: '#3C3489' },
  need_more_info: { bg: '#FBEAF0', text: '#4B1528' },
  in_progress:    { bg: '#FAEEDA', text: '#633806' },
  submitted:      { bg: '#F1EFE8', text: '#444441' },
  resolved:       { bg: '#EAF3DE', text: '#27500A' },
  closed:         { bg: '#EAF3DE', text: '#27500A' },
}

// ─── filter pills ─────────────────────────────────────────────────────────────

type Pill = { label: string; match: (s: string) => boolean }

const PILLS: Pill[] = [
  { label: 'All',               match: () => true },
  { label: 'Received',          match: s => s === 'sent' },
  { label: 'Acknowledged',      match: s => s === 'acknowledged' },
  { label: 'Info Requested',    match: s => s === 'need_more_info' },
  { label: 'In Progress',       match: s => s === 'in_progress' },
  { label: 'Resolved / Closed', match: s => s === 'resolved' || s === 'closed' },
]

// ─── sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'priority' | 'case_id' | 'case_type' | 'name' | 'status' | 'days'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={11} className="inline ml-1 text-brand-muted opacity-50" />
  return dir === 'asc'
    ? <ChevronUp   size={11} className="inline ml-1 text-brand-navy" />
    : <ChevronDown size={11} className="inline ml-1 text-brand-navy" />
}

// ─── component ────────────────────────────────────────────────────────────────

export function EmbassyCasesList({
  cases,
  userFullName,
}: {
  cases: PanelCase[]
  userFullName: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [pillIdx,       setPillIdx]       = useState(0)
  const [sortKey,       setSortKey]       = useState<SortKey>('priority')
  const [sortDir,       setSortDir]       = useState<SortDir>('asc')
  const [page,          setPage]          = useState(1)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [localStatuses,  setLocalStatuses]  = useState<Record<string, string>>({})
  const [pendingResolve, setPendingResolve] = useState<{ caseId: string; status: string } | null>(null)
  const [resolvedBy,     setResolvedBy]     = useState('')
  const [resolutionNote, setResolutionNote] = useState('')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function handleStatusChange(caseId: string, newStatus: string) {
    if (newStatus === 'resolved' || newStatus === 'closed') {
      setResolvedBy(userFullName)
      setResolutionNote('')
      setPendingResolve({ caseId, status: newStatus })
      return
    }
    commitStatus(caseId, newStatus)
  }

  function commitStatus(caseId: string, newStatus: string, extra?: { resolvedBy: string; note: string }) {
    setLocalStatuses(prev => ({ ...prev, [caseId]: newStatus }))
    const fd = new FormData()
    fd.set('case_id', caseId)
    fd.set('status', newStatus)
    if (extra?.resolvedBy) fd.set('resolved_by', extra.resolvedBy)
    if (extra?.note)       fd.set('resolution_note', extra.note)
    startTransition(async () => {
      await updateCaseStatus(fd)
      router.refresh()
    })
  }

  function confirmResolve() {
    if (!pendingResolve) return
    commitStatus(pendingResolve.caseId, pendingResolve.status, { resolvedBy: resolvedBy.trim(), note: resolutionNote.trim() })
    setPendingResolve(null)
  }

  const filtered = useMemo(() =>
    cases.filter(c => PILLS[pillIdx].match(localStatuses[c.id] ?? c.status)),
    [cases, pillIdx, localStatuses],
  )

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      const sa = localStatuses[a.id] ?? a.status
      const sb = localStatuses[b.id] ?? b.status
      switch (sortKey) {
        case 'priority': cmp = PRIORITY_ORDER[getPriority(a.case_type, sa, a.created_at)] - PRIORITY_ORDER[getPriority(b.case_type, sb, b.created_at)]; break
        case 'case_id':  cmp = (a.case_id ?? '').localeCompare(b.case_id ?? ''); break
        case 'case_type':cmp = a.case_type.localeCompare(b.case_type); break
        case 'name':     cmp = (a.name ?? '').localeCompare(b.name ?? ''); break
        case 'status':   cmp = sa.localeCompare(sb); break
        case 'days':     cmp = daysOpen(b.created_at) - daysOpen(a.created_at); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, localStatuses])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedCase = selectedId ? cases.find(c => c.id === selectedId) ?? null : null
  const effectiveSelected = selectedCase
    ? { ...selectedCase, status: localStatuses[selectedCase.id] ?? selectedCase.status }
    : null

  const Th = ({ label, sk }: { label: string; sk: SortKey }) => (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-4 py-2.5 hover:text-brand-navy"
      onClick={() => toggleSort(sk)}
    >
      {label}<SortIcon active={sortKey === sk} dir={sortDir} />
    </th>
  )

  return (
    <div className="flex gap-0 overflow-hidden">

      {/* ── left: pills + table + pagination ── */}
      <div className={`min-w-0 transition-all ${selectedCase ? 'flex-1' : 'w-full'}`}>

        {/* status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PILLS.map((p, i) => {
            const count  = cases.filter(c => p.match(localStatuses[c.id] ?? c.status)).length
            const active = pillIdx === i
            return (
              <button
                key={p.label}
                onClick={() => { setPillIdx(i); setPage(1); setSelectedId(null) }}
                className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-brand-navy bg-brand-navy text-white'
                    : 'border-brand-border text-brand-muted hover:border-brand-navy hover:text-brand-navy'
                }`}
              >
                {p.label}
                <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-brand-muted'}`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-border bg-brand-card p-6 text-sm text-brand-muted">
            No cases in this status.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-navy/5 text-xs uppercase tracking-wide text-brand-navy">
                <tr>
                  <th className="px-3 py-2.5 text-center" title="Priority">!</th>
                  <Th label="Case ID"  sk="case_id"   />
                  <Th label="Type"     sk="case_type"  />
                  <Th label="Person"   sk="name"        />
                  {!selectedCase && <th className="px-4 py-2.5">Emirate</th>}
                  <Th label="Status"   sk="status"     />
                  <Th label="Days"     sk="days"        />
                </tr>
              </thead>
              <tbody>
                {paged.map(c => {
                  const effectiveStatus = localStatuses[c.id] ?? c.status
                  const style    = STATUS_STYLE[effectiveStatus] ?? { bg: '#F1EFE8', text: '#444441' }
                  const priority = getPriority(c.case_type, effectiveStatus, c.created_at)
                  const days     = daysOpen(c.created_at)
                  const isSelected = selectedId === c.id
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(isSelected ? null : c.id)}
                      className={`cursor-pointer border-t border-brand-border transition-colors hover:bg-brand-navy/5 ${isSelected ? 'bg-brand-navy/10' : ''}`}
                    >
                      {/* priority dot */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: PRIORITY_COLOR[priority] }}
                          title={PRIORITY_LABEL[priority]}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-brand-navy-light">
                        {c.case_id ?? <span className="text-brand-muted">—</span>}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-2.5 text-xs">{c.case_type}</td>
                      <td className="px-4 py-2.5 font-medium text-brand-navy">{c.name ?? '—'}</td>
                      {!selectedCase && <td className="px-4 py-2.5 text-xs text-brand-muted">{c.assigned_emirate}</td>}
                      {/* inline status dropdown — email is sent automatically on change */}
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <select
                          value={effectiveStatus}
                          onChange={e => handleStatusChange(c.id, e.target.value)}
                          className="rounded-full border-0 px-2 py-0.5 text-[10px] font-medium outline-none focus:ring-2 focus:ring-brand-navy/30"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {EMBASSY_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{STATUS_DISPLAY[s] ?? s}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-4 py-2.5 text-xs tabular-nums ${days >= 14 ? 'font-medium text-red-600' : days >= 7 ? 'text-amber-600' : 'text-brand-muted'}`}>
                        {days === 0 ? 'Today' : `${days}d`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-xs text-brand-muted">
              Page {page} of {totalPages} · {sorted.length} case{sorted.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="px-1 text-brand-muted">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`rounded border px-2.5 py-1 text-xs transition-all ${
                        page === p
                          ? 'border-brand-navy bg-brand-navy font-medium text-white'
                          : 'border-brand-border text-brand-muted hover:text-brand-navy'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-brand-border px-3 py-1 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── right: brief panel ── */}
      {effectiveSelected && (
        <CaseSidePanel
          c={effectiveSelected}
          onClose={() => setSelectedId(null)}
          userFullName={userFullName}
          hideStatusForm
        />
      )}

      {/* ── resolve/close modal ── */}
      {pendingResolve && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPendingResolve(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-brand-border bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-brand-navy">
              Mark as Resolved/Closed
            </h3>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-brand-muted">Handled by</span>
                <input
                  type="text"
                  value={resolvedBy}
                  onChange={e => setResolvedBy(e.target.value)}
                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-navy/30"
                  placeholder="Your name"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-brand-muted">Resolution note</span>
                <textarea
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-navy/30"
                  placeholder="Brief note on how this was resolved…"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingResolve(null)}
                className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-muted hover:text-brand-navy"
              >
                Cancel
              </button>
              <button
                onClick={confirmResolve}
                className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90"
              >
                Confirm &amp; notify reporter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
