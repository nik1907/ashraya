export default function AmbassadorLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <div className="h-14 bg-brand-navy" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="h-2.5 w-48 rounded bg-brand-border" />
              <div className="h-5 w-64 rounded bg-brand-border" />
              <div className="h-2 w-32 rounded bg-brand-border/60" />
            </div>
            <div className="h-9 w-72 rounded-xl bg-brand-border" />
          </div>
          <div className="h-16 rounded-xl bg-brand-border" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-brand-border" />)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 h-56 rounded-xl bg-brand-border" />
            <div className="h-56 rounded-xl bg-brand-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-40 rounded-xl bg-brand-border" />
            <div className="h-40 rounded-xl bg-brand-border" />
          </div>
        </div>
      </main>
    </div>
  )
}
