import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'

const MODE_LABELS = {
  start: {
    title: 'Create Account',
    subtitle: 'Enter your mobile number to create your TruckBook account',
    switchText: 'Already have an account?',
    switchAction: 'Login',
    switchTo: 'login',
  },
  login: {
    title: 'Login',
    subtitle: 'Enter your mobile number to continue',
    switchText: 'New to TruckBook?',
    switchAction: 'Create Account',
    switchTo: 'start',
  },
}

function getModeFromUrl() {
  if (typeof window === 'undefined') return 'start'
  const params = new URLSearchParams(window.location.search)
  return params.get('mode') === 'login' ? 'login' : 'start'
}

function setModeInUrl(mode) {
  const url = new URL(window.location.href)
  url.pathname = '/auth'
  url.searchParams.set('mode', mode)
  window.history.pushState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

export default function AuthPage() {
  const [mode, setMode] = useState(getModeFromUrl)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const { create, isLoading, error: apiError } = useAuth()

  const config = MODE_LABELS[mode]

  const isValid = useMemo(() => {
    const digits = phone.replace(/\D/g, '')
    return digits.length === 10
  }, [phone])

  useEffect(() => {
    const handlePop = () => setMode(getModeFromUrl())
    window.addEventListener('popstate', handlePop)
    window.addEventListener('app:navigate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
      window.removeEventListener('app:navigate', handlePop)
    }
  }, [])

  useEffect(() => {
    document.title = `${config.title} · TruckBook`
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')

    return () => {
      meta?.remove()
    }
  }, [config.title])

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setModeInUrl(nextMode)
    setPhone('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setError('')
    try {
      const phoneE164 = `+91${digits}`
      await create(phoneE164)
      sessionStorage.setItem('truckbook.auth.phone', phoneE164)
      sessionStorage.setItem('truckbook.auth.mode', mode)
      const url = new URL(window.location.href)
      url.pathname = '/auth/otp'
      url.searchParams.set('mode', mode)
      url.searchParams.set('phone', phoneE164)
      window.history.pushState({}, '', url)
      window.dispatchEvent(new Event('app:navigate'))
    } catch (err) {
      if (apiError?.fields?.phoneE164) {
        setError(apiError.fields.phoneE164)
        return
      }
      setToast(apiError?.message || err?.message || 'Failed to send OTP')
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const handlePhoneChange = (event) => {
    setPhone(event.target.value)
    if (error) setError('')
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 pb-10">
      <div className="w-full max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
          <div className="hidden flex-col p-8 lg:flex">
            
            <div className="flex flex-1 items-center justify-center">
              <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                <img className="h-40 w-40 object-contain" src="/logo.png" alt="TruckBook illustration" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {['start', 'login'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleModeChange(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    mode === tab
                      ? 'border border-[#2563EB] bg-[#F0F7FF] text-[#2563EB]'
                      : 'text-slate-500'
                  }`}
                >
                  {tab === 'start' ? 'Create Account' : 'Login'}
                </button>
              ))}
            </div>

            <h1 className="mt-6 font-display text-3xl font-semibold text-ink">{config.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{config.subtitle}</p>

            <form className="mt-6" onSubmit={handleSubmit}>
              <label className="required text-sm font-semibold text-ink" htmlFor="auth-phone">
                Mobile number
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span aria-hidden="true">🇮🇳</span>
                  <span>+91</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <input
                  autoFocus
                  id="auth-phone"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="XXXXX XXXXX"
                  required
                  className="w-full text-base text-ink placeholder:text-slate-400 focus:outline-none"
                  aria-label="Mobile number"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

              <button
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#2563EB] text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={!isValid || isLoading}
              >
                {isLoading ? 'Sending...' : 'Continue'}
              </button>
              <p className="mt-3 text-xs text-slate-500">
                We’ll send an OTP to verify your number.
              </p>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              By continuing, you agree to our{' '}
              <button className="font-semibold text-[#2563EB]" type="button">
                Terms &amp; Conditions
              </button>{' '}
              and{' '}
              <button className="font-semibold text-[#2563EB]" type="button">
                Privacy Policy
              </button>
            </p>

            <p className="mt-6 text-sm text-slate-500">
              {config.switchText}{' '}
              <button
                className="font-semibold text-[#2563EB]"
                type="button"
                onClick={() => handleModeChange(config.switchTo)}
              >
                {config.switchAction}
              </button>
            </p>
            {toast && (
              <div className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-white">
                {toast}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
