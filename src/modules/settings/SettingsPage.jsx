import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useOnboarding } from '../../hooks/useOnboarding.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { normalizeError } from '../../api/index.js'

export default function SettingsPage() {
  const { me, setMe, logout } = useAuthSession()
  const { create: saveOnboarding, isFetching: isSaving } = useOnboarding()
  const { data: trucks } = useTrucks()
  const { data: trips } = useTrips()
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [mobile, setMobile] = useState('')
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [navToast, setNavToast] = useState('')
  const [initialValues, setInitialValues] = useState({ businessName: '', city: '' })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const name = me?.orgName || ''
    const orgCity = me?.city || ''
    setBusinessName(name)
    setCity(orgCity)
    setMobile(me?.phoneE164 || '')
    setInitialValues({ businessName: name, city: orgCity })
  }, [me])

  const hasChanges =
    businessName.trim() !== initialValues.businessName.trim() ||
    city.trim() !== initialValues.city.trim()

  const hasTrucks = (trucks || []).length > 0
  const hasTrips = (trips || []).length > 0

  const formattedMobile = useMemo(() => {
    if (!mobile) return '+91 XXXXX XXXXX'
    return mobile
  }, [mobile])

  const handleSave = async (event) => {
    event.preventDefault()
    if (!hasChanges) return
    setFormError('')
    try {
      const result = await saveOnboarding({
        businessName: businessName.trim(),
        city: city.trim() || undefined,
      })
      setMe({
        ...(me || {}),
        orgName: result?.orgName || businessName.trim(),
        city: result?.city || city.trim(),
        onboardingCompleted: true,
      })
      setSaved(true)
      setToast('Settings updated successfully')
      setInitialValues({ businessName: businessName.trim(), city: city.trim() })
      window.setTimeout(() => {
        setSaved(false)
        setToast('')
      }, 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setFormError(normalized.message || 'Failed to save settings')
    }
  }

  const navigateTo = (path) => {
    const url = new URL(window.location.href)
    url.pathname = path
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const handleLogout = () => {
    logout()
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const getDisabledMessage = (label) => {
    if (label === 'Trips') return 'Add a truck to create and manage trips.'
    if (label === 'Settlements') return 'Add a truck to create settlements.'
    if (label === 'Reports') return 'Reports will be available after you create trips.'
    return 'This section is not available yet.'
  }

  const showDisabledToast = (label) => {
    setNavToast(getDisabledMessage(label))
    window.clearTimeout(showDisabledToast.timer)
    showDisabledToast.timer = window.setTimeout(() => setNavToast(''), 2800)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={handleLogout}
        activePath="/settings"
        onHamburgerClick={() => setIsDrawerOpen(true)}
      />
      <MobileNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        active=""
        disabledItems={
          !hasTrucks
            ? ['Trips', 'Settlements', 'Reports']
            : !hasTrips
              ? ['Reports']
              : []
        }
        onItemClick={(item, isDisabled) => {
          if (isDisabled) {
            showDisabledToast(item.label)
            return
          }
          navigateTo(item.path)
        }}
        businessName={businessName}
      />

      <div className="flex">
        <AppSidebar
          active=""
        disabledItems={
          !hasTrucks
            ? ['Trips', 'Settlements', 'Reports']
            : !hasTrips
              ? ['Reports']
              : []
        }
          onItemClick={(item, isDisabled) => {
            if (isDisabled) {
              showDisabledToast(item.label)
              return
            }
            if (item.label === 'Dashboard') navigateTo('/dashboard')
            else navigateTo(item.path)
          }}
        />

        <main className="flex flex-1 items-start justify-center px-6 py-7 sm:py-10">
          <div className="w-full max-w-[720px] rounded-2xl bg-white p-8 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
            <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Business Details</p>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              )}
              <label className="block text-sm font-semibold text-ink">
                Business name
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="e.g. Sharma Transport Services"
                  required
                  className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-ink placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-semibold text-ink">
                City
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="e.g. Nagpur"
                  className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-ink placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-semibold text-ink">
                Mobile number
                <input
                  value={formattedMobile}
                  readOnly
                  className="mt-2 h-[52px] w-full rounded-xl border border-slate-200 px-4 text-base text-slate-500"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="flex h-[52px] items-center justify-center rounded-xl bg-[#2563EB] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="submit"
                  disabled={!hasChanges || isSaving}
                >
                  Save changes
                </button>
                {saved && <span className="text-sm text-emerald-600">Saved</span>}
              </div>
            </form>

            <div className="mt-8">
              <p className="text-sm font-semibold text-ink">Account</p>
              <button
                className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
      {navToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {navToast}
        </div>
      )}
    </div>
  )
}
