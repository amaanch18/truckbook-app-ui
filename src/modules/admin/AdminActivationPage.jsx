import { useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import { normalizeError, subscriptionsApi } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useSubscription } from '../../hooks/useSubscription.js'

const navigateTo = (path) => {
  const url = new URL(window.location.href)
  url.pathname = path
  url.search = ''
  window.history.pushState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

export default function AdminActivationPage() {
  const { me } = useAuthSession()
  const { refetch: refetchSubscription } = useSubscription({ auto: false })
  const [orgId, setOrgId] = useState(me?.orgId || '')
  const [plan, setPlan] = useState('GROWTH')
  const [durationDays, setDurationDays] = useState('30')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('ADMIN_KEY') || '' : ''

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!orgId || !plan || isSaving) return
    const months = Math.max(1, Math.ceil(Number(durationDays || 30) / 30))

    setIsSaving(true)
    try {
      await subscriptionsApi.adminActivate({ orgId, plan, months })
      if (me?.orgId && me.orgId === orgId) {
        await refetchSubscription().catch(() => null)
      }
      setToast('Subscription activated successfully')
      window.setTimeout(() => setToast(''), 2200)
    } catch (err) {
      const normalized = normalizeError(err)
      setToast(normalized.message || 'Activation failed')
      window.setTimeout(() => setToast(''), 2200)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <AppNavbar
        businessName={me?.orgName || ''}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={() => navigateTo('/auth')}
        activePath="/admin/activate"
        onHamburgerClick={() => {}}
        avatarVariant="brand"
      />

      <main className="mx-auto max-w-3xl px-6 py-7 sm:py-10">
        <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
          <h1 className="text-xl font-semibold text-[#111827]">Admin Activation</h1>
          {!adminKey ? (
            <p className="mt-4 text-sm font-semibold text-rose-500">Admin only</p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-[#111827]">
                Org ID
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                  value={orgId}
                  onChange={(event) => setOrgId(event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-[#111827]">
                Plan
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                >
                  <option value="GROWTH">GROWTH</option>
                  <option value="PRO">PRO</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-[#111827]">
                Duration Days
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                />
              </label>

              <button
                className="h-11 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Activating...' : 'Activate'}
              </button>
            </form>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {toast}
        </div>
      )}
    </div>
  )
}
