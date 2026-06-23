export default function CaseDetailLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* header skeleton */}
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-8 w-20 animate-pulse rounded bg-white/20" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-6 py-6">
        {/* back link */}
        <div className="h-4 w-20 animate-pulse rounded bg-brand-border" />

        {/* case header card */}
        <div className="rounded-2xl border border-brand-border bg-brand-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 w-64 animate-pulse rounded bg-brand-border" />
              <div className="h-4 w-40 animate-pulse rounded bg-brand-border" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-brand-border" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-16 animate-pulse rounded bg-brand-border" />
                <div className="h-4 w-24 animate-pulse rounded bg-brand-border" />
              </div>
            ))}
          </div>
        </div>

        {/* summary card */}
        <div className="rounded-2xl border border-brand-border bg-brand-card p-6 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-brand-border" />
          <div className="h-3 w-full animate-pulse rounded bg-brand-border" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-brand-border" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-brand-border" />
        </div>

        {/* timeline */}
        <div className="rounded-2xl border border-brand-border bg-brand-card p-6 space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-brand-border" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-1 h-3 w-3 flex-shrink-0 animate-pulse rounded-full bg-brand-border" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-40 animate-pulse rounded bg-brand-border" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-brand-border" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
