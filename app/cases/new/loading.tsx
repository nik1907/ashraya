export default function NewCaseLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-8 w-20 animate-pulse rounded bg-white/20" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 space-y-5">
        <div className="h-6 w-40 animate-pulse rounded bg-brand-border" />
        <div className="space-y-4 rounded-2xl border border-brand-border bg-brand-card p-6">
          {[200, 160, 180, 140, 200, 160].map((w, i) => (
            <div key={i} className="space-y-1">
              <div className={`h-3 w-${i % 2 === 0 ? '24' : '20'} animate-pulse rounded bg-brand-border`} />
              <div className="h-9 w-full animate-pulse rounded bg-brand-border" />
            </div>
          ))}
          <div className="h-10 w-full animate-pulse rounded-lg bg-brand-navy/20" />
        </div>
      </main>
    </div>
  )
}
