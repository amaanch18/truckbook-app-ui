const handleStartFree = () => {
  const url = new URL(window.location.href)
  url.pathname = '/auth'
  url.searchParams.set('mode', 'start')
  window.history.pushState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

const steps = [
  {
    title: 'Add trucks',
    body: 'Create your truck list with number, type, and status.',
  },
  {
    title: 'Create a trip',
    body: 'Select truck + party, route, and freight amount.',
  },
  {
    title: 'Add logs',
    body: 'Log fuel, tolls, and driver expenses during the trip.',
  },
  {
    title: 'Mark trip completed',
    body: 'Finish the trip once delivered to close costs.',
  },
  {
    title: 'Create settlement',
    body: 'When party pays lump sum, allocate oldest trips first.',
  },
  {
    title: 'Track net due + profit',
    body: 'Use reports to see net due, profit and operating ratio.',
  },
]

const faqs = [
  {
    q: 'Can I use it on mobile?',
    a: 'Yes, the web app works on phone and laptop.',
  },
  {
    q: 'Do I need to allocate every payment?',
    a: 'Not immediately. Unallocated stays as credit for the party.',
  },
  {
    q: 'Can I export reports?',
    a: 'Exports are coming soon. You can use summary data in the meantime.',
  },
]

export default function HowItWorksPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-20">
      <section className="pt-6 sm:pt-10">
        <p className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-deep/10 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-deep/60 sm:text-xs">
          How it works
        </p>
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Start in 10 minutes.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-deep/70 sm:text-lg">
          Add your trucks, create trips, log costs, and settle party payments.
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
            Talk on WhatsApp
          </button>
        </div>
      </section>

      <section className="mt-12">
        <div className="space-y-4 md:space-y-6 md:border-l md:border-slate-200 md:pl-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-emerald-700/15 bg-white/90 p-5 shadow-sm"
            >
              <span className="hidden md:flex absolute -left-[44px] top-6 h-8 w-8 items-center justify-center rounded-full border border-emerald-700/30 bg-white text-sm font-semibold text-emerald-700">
                {index + 1}
              </span>
              <div className="flex items-center gap-3 md:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-700/30 bg-white text-sm font-semibold text-emerald-700">
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold text-ink">{step.title}</h3>
              </div>
              <h3 className="hidden text-base font-semibold text-ink md:block">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-deep/70">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-emerald-700/15 bg-white/90 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-ink">FAQs</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-deep/70"
            >
              <summary className="cursor-pointer font-semibold text-ink">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-deep/70">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
