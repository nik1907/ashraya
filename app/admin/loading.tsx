export default function AdminLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* header skeleton */}
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-8 w-20 animate-pulse rounded bg-white/20" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {/* tab bar skeleton */}
        <div className="mb-6 flex gap-4 border-b border-brand-border pb-3">
          {[80, 60, 110].map((w) => (
            <div key={w} className={`h-4 w-${w === 80 ? '20' : w === 60 ? '16' : '28'} animate-pulse rounded bg-brand-border`} />
          ))}
        </div>
        {/* stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-brand-border bg-brand-card p-4">
              <div className="mb-2 h-3 w-16 animate-pulse rounded bg-brand-border" />
              <div className="h-8 w-12 animate-pulse rounded bg-brand-border" />
            </div>
          ))}
        </div>
        {/* list skeleton */}
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-brand-border bg-brand-card px-4 py-3">
              <div className="h-3 w-24 animate-pulse rounded bg-brand-border" />
              <div className="h-3 flex-1 animate-pulse rounded bg-brand-border" />
              <div className="h-3 w-16 animate-pulse rounded bg-brand-border" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-brand-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
