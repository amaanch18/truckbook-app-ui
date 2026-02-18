import { useMemo, useState } from 'react'
import { getMe as fetchMe } from '../../api/me.js'
import { useOnboarding } from '../../hooks/useOnboarding.js'
import { useSubscription } from '../../hooks/useSubscription.js'
import { normalizeError } from '../../api/index.js'
import { getMe, setMe } from '../../shared/auth/authStorage.js'

export default function OnboardingPage() {
  const storedMe = getMe()
  const [businessName, setBusinessName] = useState(storedMe?.orgName || '')
  const [ownerName, setOwnerName] = useState(storedMe?.displayName || '')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const { create, isLoading } = useOnboarding()
  const { refetch: refetchSubscription } = useSubscription({ auto: false })

  const isValid = useMemo(() => businessName.trim().length >= 2, [businessName])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isValid || isLoading) return
    setError('')

    try {
      await create({
        businessName: businessName.trim(),
        ownerDisplayName: ownerName.trim() || undefined,
        city: city.trim() || undefined,
      })
      const nextMe = await fetchMe()
      setMe(nextMe)
      await refetchSubscription().catch(() => null)
      setToast('Business setup complete')
      const url = new URL(window.location.href)
      url.pathname = '/dashboard'
      url.search = ''
      window.history.replaceState({}, '', url)
      window.dispatchEvent(new Event('app:navigate'))
    } catch (err) {
      const normalized = normalizeError(err)
      const message = normalized.message || ''
      if (String(message).toLowerCase().includes('already onboard')) {
        const url = new URL(window.location.href)
        url.pathname = '/dashboard'
        url.search = ''
        window.history.replaceState({}, '', url)
        window.dispatchEvent(new Event('app:navigate'))
        return
      }
      const fieldMessage = normalized.fields?.businessName
      setError(fieldMessage || message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 pb-10">
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] sm:p-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Set up your business</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tell us a little about your transport business
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-ink">
            Business name
            <input
              autoFocus
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="e.g. Sharma Transport Services"
              className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-ink placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-ink">
            Owner display name (optional)
            <input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder="e.g. Amaan"
              className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-ink placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-ink">
            City or state (optional)
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="e.g. Nagpur"
              className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-ink placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#2563EB] text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={!isValid || isLoading}
          >
            Continue to dashboard
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">You can update these details later.</p>
        {toast && (
          <div className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-center text-xs font-semibold text-white">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
