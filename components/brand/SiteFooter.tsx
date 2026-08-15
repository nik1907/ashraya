import Image from 'next/image'

function ArgovIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 34 34" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <filter id="afglw" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="17" cy="17" r="16" fill="#0b1628" />
      <circle cx="17" cy="17" r="15" fill="none" stroke="#c97c2a" strokeWidth="1.5" />
      <line x1="17" y1="3"  x2="17" y2="11" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="23" x2="17" y2="31" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3"  y1="17" x2="11" y2="17" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="17" x2="31" y2="17" stroke="#4db8ff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="17" r="4.5" fill="#4db8ff" opacity="0.2" filter="url(#afglw)" />
      <circle cx="17" cy="17" r="2.2" fill="#4db8ff" />
      <circle cx="17" cy="17" r="1.1" fill="#ffffff" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="tricolour" />
      <div className="bg-brand-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-semibold tracking-wide">Ashraya</p>
              <p className="mt-1 text-white/70">
                Community Welfare Case Reporting — UAE
              </p>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <Image
                src="/tfa-logo.jpg"
                alt="Telangana Friends Association"
                width={40}
                height={40}
                className="rounded-full ring-1 ring-white/20"
              />
              <div className="text-white/70 sm:text-right">
                <p>A community initiative by</p>
                <p className="text-white font-medium">Telangana Friends Association</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-4 sm:flex-row sm:items-center">
            <p className="text-xs text-white/50">
              Community welfare case reporting for Indian nationals in the UAE.
              Submitted in good faith by community volunteers.
            </p>
            <a
              href="https://argov.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:bg-white/10"
              title="AI Governance by ARGOV"
            >
              <ArgovIcon />
              <span className="text-xs text-white/60">
                Powered by{' '}
                <span className="font-semibold tracking-wide text-white/80">
                  ARGOV<span className="text-[#4db8ff]">™</span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
