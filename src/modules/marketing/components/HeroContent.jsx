const bulletPoints = [
  {
    label: 'Track trips easily',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M4 16.5C6.5 14.5 9.5 9.5 12 9.5c2 0 3.5 2.5 5.5 2.5 1.5 0 2.8-1 4.5-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Log fuel in parts',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M7 4h7a2 2 0 0 1 2 2v12H7V4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M16 8h2l2 2v8a2 2 0 0 1-2 2h-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9 7h5v4H9z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: 'Know pending payments',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M4 7h16v10H4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M4 10h16" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16.5" cy="14" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Manage trucks and drivers in one view',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M3 12h9l2-4h3l4 4v5h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="17" r="2" fill="currentColor" />
        <circle cx="17" cy="17" r="2" fill="currentColor" />
      </svg>
    ),
  },
]

export default function HeroContent() {
  const handleStartFree = () => {
    const url = new URL(window.location.href)
    url.pathname = '/auth'
    url.searchParams.set('mode', 'start')
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  return (
    <section>
      <p className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-deep/10 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-deep/60 sm:text-xs">
        All your transport records in one place
      </p>
      <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Manage your trucks, drivers and money — with complete clarity.
      </h1>
      <p className="mt-4 hidden max-w-xl text-lg text-deep/70 sm:block">
        Track trips, fuel and payments in one place. Designed for day-to-day
        transport operations.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
        <div className="flex flex-col items-center gap-3">
          <button
            className="w-60 rounded-xl bg-[var(--brand-blue)] px-8 py-4 text-base font-semibold text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.45)] shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-[var(--brand-blue-hover)]"
            type="button"
            onClick={handleStartFree}
          >
            Start Free
          </button>
          <p className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700/20 bg-white/80 px-4 py-1 text-sm font-semibold text-ink/80 shadow-sm text-center">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
            Free to start · No credit card required
          </p>
        </div>
        <button
          className="inline-flex w-60 items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-white px-7 py-4 text-base font-semibold text-emerald-700 transition hover:border-emerald-700"
          type="button"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5">
              <path
                fill="currentColor"
                d="M16.02 5.33c-5.87 0-10.64 4.77-10.64 10.64 0 1.86.49 3.68 1.42 5.28L5.2 26.67l5.6-1.48a10.6 10.6 0 0 0 5.22 1.38h.01c5.87 0 10.64-4.77 10.64-10.64 0-2.84-1.11-5.52-3.12-7.52a10.6 10.6 0 0 0-7.53-3.11Zm0 19.48h-.01a8.9 8.9 0 0 1-4.52-1.24l-.33-.2-3.32.88.89-3.23-.22-.33a8.88 8.88 0 0 1-1.37-4.76c0-4.9 3.98-8.88 8.88-8.88 2.37 0 4.6.92 6.28 2.6a8.83 8.83 0 0 1 2.6 6.28c0 4.9-3.98 8.88-8.88 8.88Zm4.86-6.63c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.14-1.14-.42-2.18-1.34-.81-.72-1.36-1.6-1.52-1.87-.16-.27-.02-.42.12-.56.12-.12.27-.31.4-.46.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.14-.61-1.48-.83-2.03-.22-.52-.44-.45-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.26 0 1.33.97 2.62 1.11 2.8.14.18 1.91 2.92 4.63 4.09.65.28 1.15.45 1.54.57.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32Z"
              />
            </svg>
          </span>
          Talk on WhatsApp
        </button>
      </div>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {bulletPoints.map((item) => (
          <div
            key={item.label}
            className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-emerald-700/15 bg-white/90 px-4 py-3 text-sm font-semibold text-ink/80 shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-700">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
