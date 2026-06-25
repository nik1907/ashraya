import Image from 'next/image'

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
          <p className="mt-5 border-t border-white/15 pt-4 text-xs text-white/50">
            Community welfare case reporting for Indian nationals in the UAE.
            Submitted in good faith by community volunteers.
          </p>
        </div>
      </div>
    </footer>
  )
}
