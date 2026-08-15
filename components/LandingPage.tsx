import Image from 'next/image'
import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'

// All case types exactly as they appear in the form (caseConfig.ts)
const CASE_TYPES = [
  'Death',
  'Missing Person',
  'Absconding',
  'Employer Harassment / Abuse',
  'Overstay / Illegal Status',
  'Hospitalized / Medical Emergency',
  'Police Case / Detention',
  'Visa Fraud / Fake Agent',
  'Unpaid Salary / Labor Exploitation',
  'Stranded Without Support',
  'Request for Exit / Amnesty Case',
  'Family Dispute / Marital Issues',
  'Mental Health / Behavioral Crisis',
  'Suicidal Risk / Trauma',
  'Child Welfare / Abandonment',
  'Documents Withheld by Employer',
  'Repatriation of Mortal Remains',
  'Legal Aid / Court Case Support',
  'Job Scam / Absconded Agents',
  'Unlisted',
]

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-surface font-sans">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-brand-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image
              src="/tfa-logo.jpg"
              alt="Telangana Friends Association"
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="h-5 w-px bg-brand-border" />
            <Logo size={28} />
            <span className="text-base font-semibold text-brand-navy">
              Ashraya <span className="text-xs font-normal text-brand-muted">आश्रय</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-brand-muted sm:flex">
            <a href="#mission"      className="transition-colors hover:text-brand-navy">Mission</a>
            <a href="#how-it-works" className="transition-colors hover:text-brand-navy">How it works</a>
            <a href="#features"     className="transition-colors hover:text-brand-navy">Features</a>
            <a href="#contact"      className="transition-colors hover:text-brand-navy">Contact</a>
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
          {/* TFA badge */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Image
              src="/tfa-logo.jpg"
              alt="Telangana Friends Association · Abu Dhabi, UAE"
              width={96}
              height={96}
              className="rounded-full ring-4 ring-brand-saffron/40"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-saffron/40 bg-brand-saffron/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-brand-saffron">
                Telangana Friends Association · UAE
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-medium text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-saffron" />
                Recognized by Indian Embassy Abu Dhabi
              </span>
            </div>
          </div>

          <h1 className="mt-2 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            When an Indian national needs help,<br />
            <span className="text-brand-saffron">we take it to the Embassy.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70">
            Ashraya enables TFA's authorized volunteers to document welfare cases and
            formally submit them to the <strong className="text-white/90">Indian Embassy, Abu Dhabi</strong>{' '}
            and its Associate Office in <strong className="text-white/90">Dubai</strong> —
            organised, fast, and tracked from first report to final resolution.
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
            The community bridge to the Indian Embassy
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-brand-muted">
            Thousands of Indian nationals live and work in the UAE. When something goes
            wrong — a police detention, a missing person, a medical crisis, a labour
            dispute — TFA authorized volunteers step in, document the case, and formally
            submit it to the Indian Embassy, Abu Dhabi or its Associate Office in Dubai.
            Ashraya makes sure every case reaches the right authority, with the right
            information, without delay.
          </p>

          {/* Embassy recognition strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-5 py-3">
              <span className="text-xl">🏛️</span>
              <div>
                <p className="text-xs font-semibold text-brand-navy">Indian Embassy</p>
                <p className="text-[11px] text-brand-muted">Abu Dhabi, UAE</p>
              </div>
            </div>
            <div className="text-sm text-brand-muted">+</div>
            <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-5 py-3">
              <span className="text-xl">🏛️</span>
              <div>
                <p className="text-xs font-semibold text-brand-navy">Consulate General of India</p>
                <p className="text-[11px] text-brand-muted">Dubai (Associate Office)</p>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: '🤝',
                title: 'Community first',
                desc: 'Every feature in Ashraya was built around the real needs of TFA volunteers and the Indian nationals they represent — not generic case management software.',
              },
              {
                icon: '📁',
                title: 'Every case documented',
                desc: 'From first contact to final resolution, every detail is recorded securely and submitted formally — so nothing gets lost and accountability is built in.',
              },
              {
                icon: '⚡',
                title: 'Fast when it matters',
                desc: 'Welfare situations are urgent. Ashraya moves quickly — from intake to formal embassy submission in minutes, not days.',
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

      {/* ── Who we represent ─────────────────────────────────── */}
      <section className="px-6 py-16 bg-brand-surface">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            Who we represent
          </p>
          <h2 className="mt-2 text-center text-xl font-semibold text-brand-navy sm:text-2xl">
            Indian nationals across the UAE
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-brand-muted">
            TFA advocates for Indian workers, families, and individuals facing welfare
            crises in the UAE — formally representing their cases to the Indian Embassy
            and its Associate Office. Below are the situations we handle.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {CASE_TYPES.map((t) => (
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

          <div className="mt-14 flex flex-col items-center gap-0 lg:flex-row lg:items-start lg:justify-center">
            {[
              {
                step: '1',
                icon: '📞',
                title: 'Case reported',
                desc: 'An authorized volunteer receives a distress call and submits the case with all relevant details and documents.',
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
                title: 'Submitted to Embassy',
                desc: 'The case is formally submitted to the Indian Embassy, Abu Dhabi or the Dubai Associate Office with full documentation.',
                border: 'border-green-200',
                bg: 'bg-green-50',
                head: 'bg-brand-green text-white',
              },
              {
                step: '4',
                icon: '✅',
                title: 'Resolution tracked',
                desc: 'Every update — submitted, sent, acknowledged, in progress, resolved — is logged and the reporter is notified at each stage.',
                border: 'border-indigo-200',
                bg: 'bg-indigo-50',
                head: 'bg-indigo-700 text-white',
              },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex flex-col items-center lg:flex-row lg:items-start">
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
                  <div className="flex items-center justify-center lg:mt-16">
                    <span className="mx-3 hidden text-xl text-brand-muted lg:block">→</span>
                    <span className="my-3 text-xl text-brand-muted lg:hidden">↓</span>
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
                desc: 'GPT-4o converts a volunteer\'s raw notes into a clear, formal, professional case summary ready for embassy submission.',
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
                desc: 'Role-based access means volunteers, coordinators, and embassy officers each see only what they need — nothing more.',
              },
              {
                icon: '📁',
                title: 'Document management',
                desc: 'Attach passports, medical reports, contracts, and photos — stored securely and accessible to the right people.',
              },
              {
                icon: '📧',
                title: 'Automatic updates',
                desc: 'The person who reported a case is notified by email at every status change — no manual follow-up needed.',
              },
              {
                icon: '📋',
                title: 'Full audit trail',
                desc: 'Every action is logged with a timestamp — who changed what, and when — providing complete accountability.',
              },
              {
                icon: '📄',
                title: 'PDF export',
                desc: 'Export any case as a PDF document in one click — ready for records, handovers, or formal embassy submissions.',
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
            Ashraya is available to authorized TFA volunteers. If you have been given
            access, sign in below. To get involved with TFA, reach out to us directly.
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
            Authorized volunteers only.
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
        <div className="mb-5 flex justify-center">
          <Image
            src="/tfa-logo.jpg"
            alt="Telangana Friends Association"
            width={56}
            height={56}
            className="rounded-full ring-2 ring-white/20"
          />
        </div>
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
