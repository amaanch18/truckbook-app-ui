export default function Navbar({ isOpen, setIsOpen, variant = 'default', disableHome = false }) {
  const navigatePath = (path) => {
    const url = new URL(window.location.href)
    url.pathname = path
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
    setIsOpen?.(false)
  }

  const navigateTo = (mode) => {
    const url = new URL(window.location.href)
    url.pathname = '/auth'
    url.searchParams.set('mode', mode)
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
    setIsOpen?.(false)
  }

  const navigateHome = () => {
    if (disableHome) return
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const isAuth = variant === 'auth'

  return (
    <header className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-6 py-2 sm:pb-6 sm:pt-10">
      <div className="flex items-center justify-between">
        <button
          className={`flex items-center gap-3 text-left ${disableHome ? 'cursor-default' : ''}`}
          type="button"
          onClick={navigateHome}
          aria-label="Go to TruckBook landing page"
          aria-disabled={disableHome || undefined}
        >
          <img
            className="h-16 w-16 object-contain sm:h-16 sm:w-20"
            src="/logoIcon.png"
            alt="Truckbook logo"
          />
          <span className="font-display text-xl font-semibold text-ink">TruckBook</span>
        </button>

        {!isAuth && (
          <div className="flex items-center gap-4 md:hidden">
            {!isOpen && (
              <button
                className="rounded-full border border-deep/20 px-3 py-1 text-xs font-semibold text-deep transition hover:border-deep/50 hover:text-ink"
                type="button"
                onClick={() => navigateTo('login')}
              >
                Login
              </button>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-deep/10 bg-white text-ink shadow-sm transition hover:border-deep/30"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsOpen((value) => !value)}
            >
              <span className="text-2xl leading-none">{isOpen ? '⋮' : '⋯'}</span>
            </button>
          </div>
        )}

        {!isAuth && (
          <nav className="hidden items-center gap-8 text-sm font-semibold text-deep/70 md:flex">
            <button className="transition hover:text-ink" type="button" onClick={() => navigatePath('/features')}>
              Features
            </button>
            <button className="transition hover:text-ink" type="button" onClick={() => navigatePath('/how-it-works')}>
              How it works
            </button>
            <button className="transition hover:text-ink" type="button" onClick={() => navigatePath('/pricing')}>
              Pricing
            </button>
            <button
              className="rounded-xl border border-deep/40 px-4 py-2 text-sm font-semibold text-deep transition hover:border-deep/70 hover:text-ink"
              type="button"
              onClick={() => navigateTo('login')}
            >
              Login
            </button>
            <button
              className="rounded-xl bg-[var(--brand-blue)] px-8 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.45)] shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-[var(--brand-blue-hover)]"
            type="button"
            onClick={() => navigateTo('start')}
          >
            Create Account
          </button>
          </nav>
        )}

      </div>

      {!isAuth && isOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-deep/10 bg-white/90 p-4 text-sm font-semibold text-deep/80 md:hidden">
          <button className="text-left transition hover:text-ink" type="button" onClick={() => navigatePath('/features')}>
            Features
          </button>
          <button className="text-left transition hover:text-ink" type="button" onClick={() => navigatePath('/how-it-works')}>
            How it works
          </button>
          <button className="text-left transition hover:text-ink" type="button" onClick={() => navigatePath('/pricing')}>
            Pricing
          </button>
          <button
            className="rounded-xl border border-deep/40 px-4 py-2 text-sm font-semibold text-deep transition hover:border-deep/70 hover:text-ink"
            type="button"
            onClick={() => navigateTo('login')}
          >
            Login
          </button>
          <button
            className="rounded-xl bg-[var(--brand-blue)] px-5 py-2 text-sm font-semibold tracking-wide text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.45)] shadow-md transition hover:bg-[var(--brand-blue-hover)]"
            type="button"
            onClick={() => navigateTo('start')}
          >
            Create Account
          </button>
        </div>
      )}
    </header>
  )
}
