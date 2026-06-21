'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  FileText,
  LayoutDashboard,
  List,
  Plus,
  Search,
  Shield,
  Users,
} from 'lucide-react'

import { CASE_STATUS_LABELS } from '@/lib/types'

type CaseResult = {
  id: string
  case_id: string | null
  case_type: string
  status: string
  name: string | null
}

type NavItem = {
  kind: 'nav'
  id: string
  label: string
  hint: string
  href: string
  icon: React.ReactNode
  scope?: string // pathname prefix — only show when on this prefix
}

const NAV_ITEMS: NavItem[] = [
  { kind: 'nav', id: 'admin-overview', label: 'Admin overview',    hint: 'Dashboard & stats',        href: '/admin',            icon: <LayoutDashboard size={14} />, scope: '/admin' },
  { kind: 'nav', id: 'admin-cases',    label: 'All cases',         hint: 'Browse & filter cases',    href: '/admin?tab=cases',  icon: <List size={14} />,            scope: '/admin' },
  { kind: 'nav', id: 'admin-access',   label: 'Access control',    hint: 'Team & pending approvals', href: '/admin?tab=access', icon: <Users size={14} />,           scope: '/admin' },
  { kind: 'nav', id: 'audit-log',      label: 'Audit log',         hint: 'All system events',        href: '/admin/audit',      icon: <BookOpen size={14} />,        scope: '/admin' },
  { kind: 'nav', id: 'embassy-portal', label: 'Embassy portal',    hint: 'Emirates case queue',      href: '/embassy',          icon: <Shield size={14} />,          scope: '/embassy' },
  { kind: 'nav', id: 'new-case',       label: 'Report a new case', hint: 'Open intake form',         href: '/cases/new',        icon: <Plus size={14} /> },
]

type Item = NavItem | ({ kind: 'case' } & CaseResult)

export function CommandPalette() {
  const router   = useRouter()
  const pathname = usePathname()

  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<CaseResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const navItems = NAV_ITEMS.filter(n => !n.scope || pathname.startsWith(n.scope))
  const items: Item[] = query.length >= 2
    ? results.map(r => ({ kind: 'case' as const, ...r }))
    : navItems

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setFocusIdx(0)
  }, [])

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => { if (!o) setFocusIdx(0); return !o })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        setResults(await res.json())
        setFocusIdx(0)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Arrow / Enter / Esc navigation
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, items.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Escape')    { close() }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = items[focusIdx]
        if (!item) return
        if (item.kind === 'nav')  router.push(item.href)
        if (item.kind === 'case') router.push(`/cases/${item.id}`)
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, focusIdx, router, close])

  if (!open) return null

  function select(item: Item) {
    if (item.kind === 'nav')  router.push(item.href)
    if (item.kind === 'case') router.push(`/cases/${item.id}`)
    close()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[18vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      {/* Palette */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-brand-border px-4 py-3">
          <Search size={15} className="shrink-0 text-brand-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusIdx(0) }}
            placeholder="Search cases or navigate…"
            className="flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-brand-muted/50"
          />
          {loading && <span className="animate-pulse text-xs text-brand-muted/60">…</span>}
          <kbd className="rounded border border-brand-border bg-brand-surface px-1.5 py-0.5 font-mono text-[10px] text-brand-muted">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <ul className="max-h-72 overflow-y-auto py-1">
          {!query && (
            <li className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted/50">
              Quick navigate
            </li>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-brand-muted">
              No cases found for &ldquo;{query}&rdquo;
            </li>
          )}

          {items.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => select(item)}
                onMouseEnter={() => setFocusIdx(idx)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                  idx === focusIdx ? 'bg-brand-navy/5' : 'hover:bg-brand-navy/[0.03]'
                }`}
              >
                {item.kind === 'nav' ? (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-brand-muted">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-navy">{item.label}</p>
                      <p className="text-xs text-brand-muted">{item.hint}</p>
                    </div>
                    <ArrowRight size={13} className="shrink-0 text-brand-muted/40" />
                  </>
                ) : (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-surface">
                      <FileText size={13} className="text-brand-muted" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy">{item.name ?? '—'}</p>
                      <p className="text-xs text-brand-muted">
                        {item.case_id ?? 'ID pending'} · {item.case_type}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-navy/5 px-2 py-0.5 text-[10px] text-brand-muted">
                      {CASE_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-brand-border px-4 py-2 text-[10px] text-brand-muted/50">
          <span>↑↓ navigate · Enter select</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  )
}
