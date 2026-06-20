'use client'

import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useCallback, useState } from 'react'

type Range = '7d' | '30d' | '90d' | '1y' | 'all'

export function EmbassyAIBrief({ range }: { range: Range }) {
  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [bullets,       setBullets]       = useState<string[]>([])
  const [patterns,      setPatterns]      = useState<string[]>([])
  const [error,         setError]         = useState<string | null>(null)
  const [generatedAt,   setGeneratedAt]   = useState<string | null>(null)

  const fetchBrief = useCallback(async () => {
    setLoading(true); setError(null); setBullets([]); setPatterns([])
    try {
      const res = await fetch(`/api/embassy/brief?range=${range}`)
      if (!res.ok) { setError('Brief unavailable — please try again.'); return }
      const { bullets: b, patterns: p, error: e } = await res.json()
      if (e) { setError(e); return }
      setBullets(b ?? [])
      setPatterns(p ?? [])
      setGeneratedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }, [range])

  function openAndFetch() {
    setOpen(true)
    if (bullets.length === 0 && !loading) fetchBrief()
  }

  return (
    <>
      <button
        onClick={openAndFetch}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 60%, #6D28D9 100%)',
          boxShadow: '0 0 10px rgba(124,58,237,0.35)',
        }}
        title="AI Brief — 5-point data-grounded summary"
      >
        <Sparkles size={11} className="animate-pulse" /> AI Brief
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-brand-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand-saffron" />
                <span className="text-sm font-semibold text-brand-navy">AI Brief</span>
                <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] text-brand-muted">
                  {range === 'all' ? 'All time' : `Last ${range}`} · data-grounded
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchBrief}
                  disabled={loading}
                  className="rounded p-1.5 text-brand-muted transition-colors hover:text-brand-navy disabled:opacity-40"
                  title="Regenerate"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setOpen(false)} className="rounded p-1.5 text-brand-muted transition-colors hover:text-brand-navy">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="p-5">
              {loading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="h-4 animate-pulse rounded-full bg-brand-navy/10"
                      style={{ width: `${68 + i * 6}%` }}
                    />
                  ))}
                  <p className="mt-3 text-[11px] text-brand-muted">
                    Analysing {range === 'all' ? 'all cases' : `last ${range}`}…
                  </p>
                </div>
              )}

              {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && bullets.length > 0 && (
                <div className="space-y-4">
                  <ul className="space-y-3.5">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-brand-navy">{b}</span>
                      </li>
                    ))}
                  </ul>

                  {patterns.length > 0 && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles size={12} className="text-violet-600" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                          Interesting Hidden Patterns
                        </span>
                      </div>
                      <ul className="space-y-3">
                        {patterns.map((p, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
                              {i + 1}
                            </span>
                            <span className="text-sm leading-relaxed text-violet-900">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {generatedAt && !loading && bullets.length > 0 && (
              <div className="border-t border-brand-border px-5 py-2.5">
                <p className="text-[10px] text-brand-muted">
                  Generated {generatedAt} · Based only on your actual case data · No speculation
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
