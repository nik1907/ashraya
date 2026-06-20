import Link from 'next/link'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-surface font-sans">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-brand-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-sm font-bold text-white">
              A
            </div>
            <span className="text-base font-semibold text-brand-navy">
              Ashraya <span className="text-brand-muted font-normal text-sm">आश्रय</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-brand-muted sm:flex">
            <a href="#how-it-works" className="hover:text-brand-navy transition-colors">How it works</a>
            <a href="#features" className="hover:text-brand-navy transition-colors">Features</a>
            <a href="#contact" className="hover:text-brand-navy transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm text-brand-navy hover:bg-brand-navy/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm text-white hover:bg-brand-navy-light transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy px-6 py-20 text-center sm:py-28">
        <div className="tricolour absolute top-0 left-0 right-0" />
        {/* subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)',
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full border border-brand-saffron/40 bg-brand-saffron/10 px-4 py-1 text-xs font-medium text-brand-saffron tracking-wide uppercase">
            Powered by TFA · Indian Community UAE
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Welfare case management<br />
            <span className="text-brand-saffron">built for the embassy.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70">
            Ashraya is the digital backbone Telangana Friends Association uses to
            receive, track, and resolve welfare cases for Indian nationals in the UAE —
            from first report to embassy action.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-saffron px-7 py-3 text-sm font-medium text-white shadow hover:bg-orange-500 transition-colors"
            >
              Sign up / Sign in →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-white/20 px-7 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="border-b border-brand-border bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-brand-border sm:grid-cols-4">
          {[
            { value: '20+', label: 'Case types handled' },
            { value: '2', label: 'Embassy missions' },
            { value: '4', label: 'Role-based portals' },
            { value: 'AI', label: 'Brief generation' },
          ].map((s) => (
            <div key={s.label} className="px-8 py-6 text-center">
              <p className="text-2xl font-semibold text-brand-navy">{s.value}</p>
              <p className="mt-1 text-xs text-brand-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            How it works
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            From report to resolution — end to end
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-brand-muted">
            A welfare case touches four parties. Ashraya keeps all of them in sync automatically.
          </p>

          {/* Flow diagram */}
          <div className="mt-14 flex flex-col items-center gap-0 sm:flex-row sm:items-start sm:justify-center">
            {[
              {
                step: '1',
                icon: '🧑‍💼',
                title: 'Volunteer submits',
                desc: "A TFA volunteer fills the intake form with the affected person's details, incident info, and documents.",
                color: 'bg-blue-50 border-blue-200',
                head: 'bg-brand-navy text-white',
              },
              {
                step: '2',
                icon: '🤖',
                title: 'AI polishes & routes',
                desc: 'GPT-4o rewrites the description into a formal diplomatic email, assigns a case ID, and routes to the correct embassy.',
                color: 'bg-orange-50 border-orange-200',
                head: 'bg-brand-saffron text-white',
              },
              {
                step: '3',
                icon: '🏛️',
                title: 'Embassy receives & acts',
                desc: 'The embassy gets the email and can log into their portal to track progress, request info, or mark it resolved.',
                color: 'bg-green-50 border-green-200',
                head: 'bg-brand-green text-white',
              },
              {
                step: '4',
                icon: '📋',
                title: 'TFA admin oversees',
                desc: 'TFA admins see every case across both missions, manage the team, and audit the full trail.',
                color: 'bg-indigo-50 border-indigo-200',
                head: 'bg-indigo-700 text-white',
              },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex flex-col items-center sm:flex-row sm:items-start">
                <div
                  className={`w-52 rounded-2xl border ${item.color} overflow-hidden shadow-sm`}
                >
                  <div className={`${item.head} px-4 py-2.5 text-center text-xs font-semibold tracking-wide`}>
                    Step {item.step}
                  </div>
                  <div className="p-4 text-center">
                    <div className="mb-2 text-3xl">{item.icon}</div>
                    <p className="text-sm font-semibold text-brand-navy">{item.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{item.desc}</p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center justify-center sm:mt-16">
                    <span className="mx-3 text-xl text-brand-muted hidden sm:block">→</span>
                    <span className="my-3 text-xl text-brand-muted sm:hidden">↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case status flow viz ──────────────────────────────── */}
      <section className="bg-brand-navy/5 px-6 py-16 border-y border-brand-border">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Case lifecycle
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-brand-navy sm:text-2xl">
            Every case moves through a clear pipeline
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Processing',        color: 'bg-slate-100 text-slate-700',     dot: '#94a3b8' },
              { label: 'With Embassy',      color: 'bg-blue-100 text-blue-800',       dot: '#3b82f6' },
              { label: 'Embassy Received',  color: 'bg-indigo-100 text-indigo-800',   dot: '#6366f1' },
              { label: 'Info Requested',    color: 'bg-purple-100 text-purple-800',   dot: '#a855f7' },
              { label: 'In Progress',       color: 'bg-amber-100 text-amber-800',     dot: '#f59e0b' },
              { label: 'Resolved',          color: 'bg-green-100 text-green-800',     dot: '#22c55e' },
              { label: 'Closed',            color: 'bg-gray-200 text-gray-700',       dot: '#9ca3af' },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.color}`}>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: s.dot }}
                  />
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-brand-muted text-sm">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-brand-muted">
            Volunteers, embassy staff, and TFA admins each see only the statuses relevant to their role.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Features
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            Everything a welfare team needs
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '⚡',
                title: 'Smart intake form',
                desc: '20+ welfare case types with dynamic follow-up questions, document upload, and automatic validation.',
              },
              {
                icon: '🤖',
                title: 'AI-drafted embassy email',
                desc: 'GPT-4o converts raw volunteer notes into a polished, diplomatic formal email — zero editing needed.',
              },
              {
                icon: '🏛️',
                title: 'Dual-mission routing',
                desc: 'Cases auto-route to Abu Dhabi or Dubai Consulate based on emirate. Both receive the correct case automatically.',
              },
              {
                icon: '🔍',
                title: 'Smart case search',
                desc: 'Fuzzy search across names, case IDs, employers, and locations — find anything in seconds.',
              },
              {
                icon: '📊',
                title: 'AI intel brief',
                desc: 'One-click 7-point AI summary of all cases in the period: top patterns, SLA breaches, and hidden trends.',
              },
              {
                icon: '📋',
                title: 'Full audit trail',
                desc: 'Every status change, login, email, and action is logged with GST timestamps — full accountability.',
              },
              {
                icon: '🔐',
                title: 'Role-based access',
                desc: 'Volunteers, TFA admins, Abu Dhabi embassy, and Dubai consulate — each with a scoped, secure portal.',
              },
              {
                icon: '📧',
                title: 'Automatic notifications',
                desc: 'Reporters receive email confirmations whenever their case status changes — no chasing required.',
              },
              {
                icon: '📄',
                title: 'One-click PDF export',
                desc: 'Print or export any case detail page as a PDF for embassy records or legal documentation.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="text-sm font-semibold text-brand-navy">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────── */}
      <section className="border-y border-brand-border bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Who it's for
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            Four portals. One shared mission.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                role: 'Volunteer',
                icon: '🧑‍💼',
                color: 'border-blue-200 bg-blue-50',
                badge: 'bg-blue-100 text-blue-800',
                points: ['Submit new welfare cases', 'Track your own submissions', 'Upload documents securely', 'Get notified on updates'],
              },
              {
                role: 'TFA Admin',
                icon: '👩‍💻',
                color: 'border-orange-200 bg-orange-50',
                badge: 'bg-orange-100 text-orange-700',
                points: ['See all cases across UAE', 'Approve volunteers', 'Manage team members', 'Full audit log access'],
              },
              {
                role: 'Abu Dhabi Embassy',
                icon: '🏛️',
                color: 'border-green-200 bg-green-50',
                badge: 'bg-green-100 text-green-800',
                points: ['View Abu Dhabi cases only', 'Update case status', 'Download attachments', 'AI intel briefing'],
              },
              {
                role: 'Dubai Consulate',
                icon: '🌆',
                color: 'border-indigo-200 bg-indigo-50',
                badge: 'bg-indigo-100 text-indigo-800',
                points: ['View Dubai cases only', 'Update case status', 'Download attachments', 'AI intel briefing'],
              },
            ].map((r) => (
              <div key={r.role} className={`rounded-2xl border ${r.color} p-5`}>
                <div className="mb-2 text-2xl">{r.icon}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.badge}`}>
                  {r.role}
                </span>
                <ul className="mt-3 space-y-1.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-brand-muted">
                      <span className="mt-0.5 text-brand-green">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-brand-navy px-6 py-20 text-center">
        <div className="tricolour-top pointer-events-none absolute left-0 right-0" />
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Ready to help your community?
          </h2>
          <p className="mt-4 text-sm text-white/70">
            If you're a TFA volunteer or team member, sign in with your assigned account.
            New to the system? Your TFA admin will create your account.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-saffron px-8 py-3 text-sm font-medium text-white hover:bg-orange-500 transition-colors shadow"
            >
              Sign in to your portal →
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Access is by invitation only. Contact your TFA admin to get started.
          </p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="border-t border-brand-border bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Contact
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-brand-navy">
            Get in touch with TFA
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-6">
            <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 text-sm w-64">
              <span className="text-xl">📧</span>
              <div>
                <p className="font-semibold text-brand-navy">Email</p>
                <a
                  href="mailto:tfa.abudhabi@gmail.com"
                  className="mt-0.5 block text-xs text-brand-muted hover:text-brand-navy"
                >
                  tfa.abudhabi@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 text-sm w-64">
              <span className="text-xl">🏢</span>
              <div>
                <p className="font-semibold text-brand-navy">Organisation</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Telangana Friends Association<br />Abu Dhabi, UAE
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 text-sm w-64">
              <span className="text-xl">🏛️</span>
              <div>
                <p className="font-semibold text-brand-navy">Missions served</p>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Embassy of India, Abu Dhabi<br />Consulate General, Dubai
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-brand-border bg-brand-navy px-6 py-8 text-center">
        <div className="tricolour mb-4 mx-auto w-24 rounded-sm" />
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} Telangana Friends Association, Abu Dhabi.
          Built to serve the Indian community in the UAE.
        </p>
        <p className="mt-1 text-xs text-white/30">
          Ashraya आश्रय — शरण · Sanctuary · Protection
        </p>
      </footer>
    </div>
  )
}
