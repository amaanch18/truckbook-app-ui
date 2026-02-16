const handleStartFree = () => {
  const url = new URL(window.location.href)
  url.pathname = '/auth'
  url.searchParams.set('mode', 'start')
  window.history.pushState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

export default function FeaturesPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-20">
      <section className="pt-6 sm:pt-10">
        <p className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-deep/10 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-deep/60 sm:text-xs">
          TruckBook features
        </p>
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Everything you need to run trips cleanly.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-deep/70 sm:text-lg">
          Trips, fuel, tolls, driver expenses, settlements and reports — in one place.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-start">
          <button
            className="w-56 rounded-xl bg-[var(--brand-blue)] px-8 py-4 text-base font-semibold text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.45)] shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-[var(--brand-blue-hover)]"
            type="button"
            onClick={handleStartFree}
          >
            Start Free
          </button>
          <button
            className="inline-flex w-56 items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-white px-7 py-4 text-base font-semibold text-emerald-700 transition hover:border-emerald-700"
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
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          {
            title: 'Trips & Billing',
            items: [
              'Create & track trips',
              'Freight, fuel, tolls, driver expense logs',
              'Settlement-based payments (party-wise)',
              'Auto allocation (oldest first)',
            ],
          },
          {
            title: 'Trucks & Compliance',
            items: [
              'Truck master + status',
              'Insurance / Permit / Fitness expiry tracking',
              'Repairs & tyre costs per truck',
            ],
          },
          {
            title: 'Settlements (Party-wise)',
            items: [
              'Outstanding by Party / Truck',
              'Drilldown to trips',
              'Apply/Allocate payments when party pays lump sum',
              'Credits (unallocated) and Net Due',
            ],
          },
          {
            title: 'Reports',
            items: [
              'Overview summary',
              'Profit view (revenue vs expenses)',
              'Operating vs Revenue trends (groupBy)',
            ],
          },
        ].map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-emerald-700/15 bg-white/90 p-5 text-sm text-ink/80 shadow-sm"
          >
            <h3 className="text-base font-semibold text-ink">{section.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-deep/70">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-700/15 bg-white/80 px-6 py-5 text-sm text-ink/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-ink">Need a quick demo?</h3>
            <p className="mt-1 text-sm text-deep/70">
              We can show how settlements and reports work for your routes.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-700"
            type="button"
          >
            Talk on WhatsApp
          </button>
        </div>
      </section>
    </main>
  )
}
