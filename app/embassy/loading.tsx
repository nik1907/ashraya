export default function EmbassyLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* header skeleton */}
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-8 w-20 animate-pulse rounded bg-white/20" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* top bar skeleton */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-border bg-brand-card px-4 py-2.5">
          <div className="h-5 w-40 animate-pulse rounded bg-brand-border" />
          <div className="flex gap-2">
            <div className="h-7 w-7 animate-pulse rounded bg-brand-border" />
            <div className="h-7 w-20 animate-pulse rounded bg-brand-border" />
          </div>
        </div>
        {/* tab bar skeleton */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-brand-border bg-brand-card p-1">
          {[100, 120, 90, 80, 110].map((w, i) => (
            <div key={i} style={{ minWidth: w }} className="h-8 animate-pulse rounded-lg bg-brand-border" />
          ))}
        </div>
        {/* lane cards */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-brand-border bg-brand-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-3 w-32 animate-pulse rounded bg-brand-border" />
                <div className="h-5 w-8 animate-pulse rounded-full bg-brand-border" />
              </div>
              <div className="space-y-2">
                {[0, 1].map((j) => (
                  <div key={j} className="flex items-center gap-3 rounded border border-brand-border px-3 py-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-brand-border" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-brand-border" />
                    <div className="h-3 w-12 animate-pulse rounded bg-brand-border" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
