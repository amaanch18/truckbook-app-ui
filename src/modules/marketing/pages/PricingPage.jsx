import { useMemo, useState } from 'react'

const WHATSAPP_NUMBER = '911234567890'
const WHATSAPP_MESSAGE = 'Hi! I need help choosing a TruckBook plan.'

const handleStartFree = () => {
  const url = new URL(window.location.href)
  url.pathname = '/auth'
  url.searchParams.set('mode', 'start')
  window.history.pushState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

const plans = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: '₹0',
    note: 'Free',
    features: [
      { label: 'Up to 1 truck' },
      { label: 'Trips + basic logs' },
      { label: 'Limited reports' },
    ],
    cta: 'Start Free',
    action: handleStartFree,
  },
  {
    id: 'GROWTH',
    name: 'Growth (Launch Offer)',
    price: '₹999 / month',
    note: 'Up to 10 trucks',
    features: [
      { label: 'Everything in Starter' },
      { label: 'Settlements + outstanding drilldowns' },
      { label: 'Reports: profit + operating vs revenue' },
    ],
    cta: 'Start Free Trial',
    action: handleStartFree,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '₹1999 / month',
    note: 'Unlimited trucks',
    tag: 'UNLIMITED TRUCKS',
    features: [
      { label: 'Unlimited trucks' },
      { label: 'Everything in Growth' },
      { label: 'Priority support' },
      { label: 'Advanced reports + exports', soon: true },
    ],
    cta: 'Start Free Trial',
    action: handleStartFree,
  },
]

const faqs = [
  {
    q: 'Can I upgrade later?',
    a: 'Yes, you can move to Growth or Pro anytime.',
  },
  {
    q: 'How does trial work?',
    a: 'You get 14 days to try Growth features before deciding.',
  },
  {
    q: 'Can I add more trucks later?',
    a: 'Yes. Upgrade anytime as your fleet grows.',
  },
]

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('GROWTH')
  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent(WHATSAPP_MESSAGE)
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
  }, [])
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-20">
      <section className="pt-6 sm:pt-10">
        <p className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-deep/10 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-deep/60 sm:text-xs">
          Pricing
        </p>
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Simple launch pricing.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-deep/70 sm:text-lg">
          Start free, then pay only when it helps you save time.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id
          return (
          <div
            key={plan.name}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPlan(plan.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedPlan(plan.id)
              }
            }}
            className={`flex h-full flex-col rounded-2xl border bg-white/90 p-6 text-sm text-ink/80 shadow-sm transition ${
              isSelected ? 'border-[var(--brand-blue)] shadow-blue-500/10' : 'border-emerald-700/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
              <div className="flex items-center gap-2">
                {plan.tag && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase text-blue-600">
                    {plan.tag}
                  </span>
                )}
                <span className="rounded-full border border-emerald-700/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-emerald-700/80">
                  {plan.note}
                </span>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-ink">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-deep/70">
              {plan.features.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600/60" />
                  <span className={item.soon ? 'text-slate-400' : ''}>
                    {item.label}
                    {item.soon && (
                      <span className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                        Coming soon
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6 space-y-2">
              <button
                className="w-full rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[var(--brand-blue-hover)]"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedPlan(plan.id)
                  plan.action?.()
                }}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        )})}
      </section>

      <section className="mt-6 rounded-2xl border border-emerald-700/15 bg-white/90 px-6 py-5 text-sm text-ink/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-ink">Need help choosing a plan?</h3>
            <p className="mt-1 text-sm text-deep/70">
              Chat with us on WhatsApp and we’ll recommend the right plan.
            </p>
          </div>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-700"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Talk on WhatsApp
          </a>
        </div>
      </section>

      <p className="mt-4 text-xs text-deep/60">Launch pricing for early customers.</p>

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
