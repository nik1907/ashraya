export default function AmbassadorLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-8 w-20 animate-pulse rounded bg-white/20" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* KPI bar skeleton */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-brand-border bg-brand-card p-4">
              <div className="mb-2 h-2.5 w-16 animate-pulse rounded bg-brand-border" />
              <div className="h-7 w-12 animate-pulse rounded bg-brand-border" />
              <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded bg-brand-border" />
            </div>
          ))}
        </div>
        {/* Charts row skeleton */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="col-span-2 h-52 animate-pulse rounded-xl border border-brand-border bg-brand-card" />
          <div className="h-52 animate-pulse rounded-xl border border-brand-border bg-brand-card" />
        </div>
        {/* Lower row skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-44 animate-pulse rounded-xl border border-brand-border bg-brand-card" />
          <div className="h-44 animate-pulse rounded-xl border border-brand-border bg-brand-card" />
          <div className="h-44 animate-pulse rounded-xl border border-brand-border bg-brand-card" />
        </div>
      </div>
    </div>
  )
}
