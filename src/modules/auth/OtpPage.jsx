import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { getMe as fetchMe } from '../../api/me.js'
import { clearAll, setMe, setToken } from '../../shared/auth/authStorage.js'

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

function maskNumber(value) {
  if (!value) return '+91 XXXXXX1234'
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return '+91 XXXXXX1234'
  const lastFour = digits.slice(-4)
  return `+91 XXXXXX${lastFour}`
}

export default function OtpPage() {
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const [isVerifying, setIsVerifying] = useState(false)
  const [phone, setPhone] = useState('')
  const [toast, setToast] = useState('')
  const { update, create, error: apiError } = useAuth()
  const inputsRef = useRef([])

  const isComplete = useMemo(() => otp.every((digit) => digit !== ''), [otp])
  const maskedNumber = useMemo(() => maskNumber(phone), [phone])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const phoneParam = params.get('phone') || sessionStorage.getItem('truckbook.auth.phone') || ''
    if (phoneParam) {
      setPhone(phoneParam)
      sessionStorage.setItem('truckbook.auth.phone', phoneParam)
    }
  }, [])

  useEffect(() => {
    document.title = 'Verify OTP · TruckBook'
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
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((time) => (time > 0 ? time - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const verifyOtp = async () => {
    if (!isComplete || isVerifying) return
    if (!phone) {
      setError('Enter a valid phone number first.')
      return
    }
    setError('')
    setIsVerifying(true)
    try {
      const response = await update(phone.trim(), otp.join(''))
      if (response?.token) {
        setToken(response.token)
      }
      let me = null
      try {
        me = await fetchMe()
        setMe(me)
      } catch (meError) {
        clearAll()
        setToast('Failed to load your profile. Please login again.')
        window.setTimeout(() => setToast(''), 2400)
        const url = new URL(window.location.href)
        url.pathname = '/auth'
        url.search = ''
        window.history.replaceState({}, '', url)
        window.dispatchEvent(new Event('app:navigate'))
        return
      }
      const url = new URL(window.location.href)
      url.pathname = me?.onboardingCompleted ? '/dashboard' : '/onboarding'
      url.search = ''
      window.history.pushState({}, '', url)
      window.dispatchEvent(new Event('app:navigate'))
    } catch (err) {
      setError(apiError?.message || err?.message || 'Invalid/Expired OTP')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return
    setOtp((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    if (value && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus()
    }
    if (error) setError('')
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && inputsRef.current[index - 1]) {
      inputsRef.current[index - 1].focus()
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtp(next)
    const focusIndex = Math.min(pasted.length, 5)
    inputsRef.current[focusIndex]?.focus()
  }

  useEffect(() => {
    if (!isComplete || error) return
    const timer = setTimeout(() => {
      verifyOtp()
    }, 200)
    return () => clearTimeout(timer)
  }, [isComplete, error])

  const handleSubmit = (event) => {
    event.preventDefault()
    verifyOtp()
  }

  const handleResend = async () => {
    if (!phone) {
      setError('Enter phone to resend OTP.')
      return
    }
    setResendTimer(30)
    setError('')
    setToast('')
    try {
      await create(phone.trim())
      setToast('OTP sent again.')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const message = apiError?.message || err?.message || 'Failed to resend OTP'
      setToast(message)
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const handleChangeNumber = () => {
    const mode = sessionStorage.getItem('truckbook.auth.mode') || getModeFromUrl()
    setModeInUrl(mode)
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 pb-10">
      <div className="w-full max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)] lg:h-[465px]">
        <div className="grid h-full gap-0 lg:grid-cols-[1fr_1fr]">
          <div className="hidden h-full flex-col p-8 lg:flex">
            <div className="flex flex-1 items-center justify-center">
              <div className="flex h-72 w-72 items-center justify-center rounded-full bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                <img className="h-40 w-40 object-contain" src="/logo.png" alt="TruckBook illustration" />
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col p-8">
            <h1 className="font-display text-3xl font-semibold text-ink">Verify your number</h1>
            <p className="mt-2 text-sm text-slate-500">
              We’ve sent a 6-digit OTP to {maskedNumber}
            </p>

            <form className="mt-6" onSubmit={handleSubmit}>
              <label className="required text-sm font-semibold text-ink">OTP</label>
              <div
                className={`grid grid-cols-6 gap-2 sm:gap-3 ${error ? 'animate-shake' : ''}`}
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={`otp-${index}`}
                    ref={(el) => {
                      inputsRef.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    disabled={isVerifying}
                    className="h-[52px] w-full rounded-xl border border-slate-200 text-center text-xl font-semibold text-ink focus:border-[#2563EB] focus:outline-none disabled:bg-slate-100"
                    aria-label={`OTP digit ${index + 1}`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

              <button
                className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={!isComplete || isVerifying}
              >
                {isVerifying && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                )}
                {isVerifying ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-500">
              {resendTimer > 0 ? (
                <span>Resend OTP in 00:{String(resendTimer).padStart(2, '0')}</span>
              ) : (
                <button className="font-semibold text-[#2563EB]" type="button" onClick={handleResend}>
                  Didn’t receive OTP? Resend
                </button>
              )}
            </div>

            <button
              className="mt-3 text-sm font-semibold text-[#2563EB]"
              type="button"
              onClick={handleChangeNumber}
            >
              Change mobile number
            </button>

            <p className="mt-6 text-xs text-slate-500">
              By continuing, you agree to our{' '}
              <button className="font-semibold text-[#2563EB]" type="button">
                Terms &amp; Conditions
              </button>{' '}
              and{' '}
              <button className="font-semibold text-[#2563EB]" type="button">
                Privacy Policy
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
