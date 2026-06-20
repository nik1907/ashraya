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
              Ashraya <span className="text-xs font-normal text-brand-muted">आश्रय</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-brand-muted sm:flex">
            <a href="#mission" className="transition-colors hover:text-brand-navy">Mission</a>
            <a href="#how-it-works" className="transition-colors hover:text-brand-navy">How it works</a>
            <a href="#features" className="transition-colors hover:text-brand-navy">Features</a>
            <a href="#contact" className="transition-colors hover:text-brand-navy">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm text-white transition-colors hover:bg-brand-navy-light"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-navy px-6 py-24 text-center sm:py-32">
        <div className="tricolour absolute left-0 right-0 top-0" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)',
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full border border-brand-saffron/40 bg-brand-saffron/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-brand-saffron">
            By Telangana Friends Association · UAE
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            When an Indian national needs help,<br />
            <span className="text-brand-saffron">we make sure they get it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70">
            Ashraya is TFA's welfare case management platform — a secure, organised way to
            receive reports of distress, document them properly, and make sure every case
            is followed through to resolution.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-saffron px-7 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-orange-500"
            >
              Sign in to your portal →
            </Link>
            <a
              href="#mission"
              className="rounded-lg border border-white/20 px-7 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Learn about our mission
            </a>
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────── */}
      <section id="mission" className="bg-white px-6 py-20 border-b border-brand-border">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Our mission
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            Standing beside the Indian community in UAE
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-brand-muted">
            Thousands of Indian nationals live and work in the UAE. When something goes wrong —
            a medical emergency, a labour dispute, a missing person, a legal crisis —
            TFA volunteers step in. Ashraya gives them the tools to act fast, stay organised,
            and ensure no case falls through the cracks.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: '🤝',
                title: 'Community first',
                desc: 'Every feature in Ashraya was built around the real needs of TFA volunteers and the people they help — not generic case management software.',
              },
              {
                icon: '📁',
                title: 'Every case documented',
                desc: 'From first contact to final resolution, every detail is recorded securely — so nothing gets lost and accountability is built in.',
              },
              {
                icon: '⚡',
                title: 'Fast when it matters',
                desc: 'Welfare situations are urgent. Ashraya is designed to move quickly — from intake to escalation in minutes, not days.',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-brand-border bg-brand-surface p-6 text-center"
              >
                <div className="mb-3 text-3xl">{c.icon}</div>
                <h3 className="text-sm font-semibold text-brand-navy">{c.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-brand-muted">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we help ──────────────────────────────────────── */}
      <section className="px-6 py-16 bg-brand-surface">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Who we help
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-brand-navy sm:text-2xl">
            Cases we handle every day
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {[
              'Medical emergency',
              'Labour / salary dispute',
              'Missing person',
              'Domestic violence',
              'Passport / document issues',
              'Deportation support',
              'Death / repatriation',
              'Stranded worker',
              'Human trafficking',
              'Mental health crisis',
              'Legal assistance',
              'Housing emergency',
              'Child welfare',
              'Runaway domestic worker',
              'Financial distress',
              '+ more',
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-brand-border bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            How it works
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            A clear process from report to resolution
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-brand-muted">
            Every welfare case follows the same structured journey — so nothing slips through.
          </p>

          <div className="mt-14 flex flex-col items-center gap-0 sm:flex-row sm:items-start sm:justify-center">
            {[
              {
                step: '1',
                icon: '📞',
                title: 'Case reported',
                desc: 'A TFA volunteer receives a distress call and submits the case with all relevant details and documents.',
                border: 'border-blue-200',
                bg: 'bg-blue-50',
                head: 'bg-brand-navy text-white',
              },
              {
                step: '2',
                icon: '🤖',
                title: 'AI documents it',
                desc: 'The system generates a formal, structured case summary and assigns a unique case ID automatically.',
                border: 'border-orange-200',
                bg: 'bg-orange-50',
                head: 'bg-brand-saffron text-white',
              },
              {
                step: '3',
                icon: '📤',
                title: 'Escalated properly',
                desc: 'The case is routed to the right authority with full documentation — no manual back-and-forth.',
                border: 'border-green-200',
                bg: 'bg-green-50',
                head: 'bg-brand-green text-white',
              },
              {
                step: '4',
                icon: '✅',
                title: 'Resolution tracked',
                desc: 'Status updates are logged end-to-end, and the reporter is notified when the case is resolved.',
                border: 'border-indigo-200',
                bg: 'bg-indigo-50',
                head: 'bg-indigo-700 text-white',
              },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex flex-col items-center sm:flex-row sm:items-start">
                <div
                  className={`w-52 overflow-hidden rounded-2xl border ${item.border} ${item.bg} shadow-sm`}
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
                    <span className="mx-3 hidden text-xl text-brand-muted sm:block">→</span>
                    <span className="my-3 text-xl text-brand-muted sm:hidden">↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="border-t border-brand-border bg-brand-surface px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Features
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-brand-navy sm:text-3xl">
            Built for real welfare work
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-brand-muted">
            Every feature exists because a volunteer needed it in the field.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '📋',
                title: 'Structured intake',
                desc: '20+ welfare case types with smart follow-up questions tailored to each situation — so nothing important is missed.',
              },
              {
                icon: '🤖',
                title: 'AI-assisted documentation',
                desc: 'GPT-4o converts a volunteer\'s raw notes into a clear, formal, professional case summary ready for escalation.',
              },
              {
                icon: '🔍',
                title: 'Instant case search',
                desc: 'Find any case by name, ID, employer, or location in seconds — even with partial or misspelled inputs.',
              },
              {
                icon: '📊',
                title: 'Pattern intelligence',
                desc: 'One-click AI briefing highlights top welfare trends, urgent open cases, and hidden patterns across all submissions.',
              },
              {
                icon: '🔐',
                title: 'Secure by design',
                desc: 'Role-based access means volunteers, coordinators, and authorities each see only what they need — nothing more.',
              },
              {
                icon: '📁',
                title: 'Document management',
                desc: 'Attach passports, medical reports, contracts, and photos — stored securely and accessible to the right people.',
              },
              {
                icon: '📧',
                title: 'Automatic updates',
                desc: 'The person who reported a case is notified by email whenever the status changes — no manual follow-up needed.',
              },
              {
                icon: '📋',
                title: 'Full audit trail',
                desc: 'Every action is logged with a timestamp — who changed what, and when — providing complete accountability.',
              },
              {
                icon: '📄',
                title: 'PDF export',
                desc: 'Export any case as a PDF document in one click — ready for records, handovers, or formal submissions.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="text-sm font-semibold text-brand-navy">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-brand-navy px-6 py-24 text-center">
        <div className="tricolour absolute left-0 right-0 -mt-24" />
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Join TFA in serving the community
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Ashraya is available to authorised TFA members. If you have been given access,
            sign in below. To get involved with TFA, reach out to us directly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-brand-saffron px-8 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-orange-500"
            >
              Sign in to Ashraya →
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Access is for authorised TFA members only.
          </p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="border-t border-brand-border bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Get in touch
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-brand-navy">
            Contact Telangana Friends Association
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-brand-muted">
            Whether you need help, want to volunteer, or have a question about Ashraya —
            we are here.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            {[
              {
                icon: '📧',
                title: 'Email us',
                value: 'tfa.abudhabi@gmail.com',
                href: 'mailto:tfa.abudhabi@gmail.com',
              },
              {
                icon: '🏢',
                title: 'Find us',
                value: 'Telangana Friends Association\nAbu Dhabi, UAE',
                href: null,
              },
            ].map((c) => (
              <div
                key={c.title}
                className="flex w-60 items-start gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5"
              >
                <span className="text-xl">{c.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-brand-navy">{c.title}</p>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="mt-1 block text-xs text-brand-muted hover:text-brand-navy"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="mt-1 whitespace-pre-line text-xs text-brand-muted">{c.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-brand-border bg-brand-navy px-6 py-10 text-center">
        <div className="tricolour mx-auto mb-5 w-20 rounded-sm" />
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} Telangana Friends Association, Abu Dhabi.
          Serving the Indian community in the UAE with care and commitment.
        </p>
        <p className="mt-2 text-xs text-white/25">
          Ashraya आश्रय — शरण · Sanctuary · Protection
        </p>
      </footer>

    </div>
  )
}
