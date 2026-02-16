import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useDashboard } from '../../hooks/useDashboard.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useSubscription } from '../../hooks/useSubscription.js'

export default function DashboardPage() {
  const [toast, setToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { me } = useAuthSession()
  const { data, isLoading, error, refetch } = useDashboard()
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    isActive: isSubscriptionActive,
    isTrial: isSubscriptionTrial,
    isExpired: isSubscriptionExpired,
    daysLeft,
  } = useSubscription()
  const businessName = useMemo(() => me?.orgName || '', [me])

  const counts = data?.counts || { trucks: 0, trips: 0 }
  const recentTrips = data?.recentTrips || []
  const pendingAmount = data?.pendingSettlement?.amount || 0
  const showEmpty = counts.trucks === 0 && counts.trips === 0
  const paywallFromQuery = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('paywall') === '1'
  }, [])
  const showSubscriptionPaywall =
    !isSubscriptionLoading &&
    (paywallFromQuery ||
      !subscription ||
      isSubscriptionExpired ||
      (!isSubscriptionActive && !isSubscriptionTrial))

  useEffect(() => {
    if (showSubscriptionPaywall) return
    refetch().catch(() => {})
  }, [refetch, showSubscriptionPaywall])

  useEffect(() => {
    if (error?.status === 401) {
      const url = new URL(window.location.href)
      url.pathname = '/auth'
      url.search = ''
      window.history.replaceState({}, '', url)
      window.dispatchEvent(new Event('app:navigate'))
    }
  }, [error])

  useEffect(() => {
    const message = sessionStorage.getItem('truckbook.toast')
    if (!message) return
    setToast(message)
    sessionStorage.removeItem('truckbook.toast')
    window.setTimeout(() => setToast(''), 2800)
  }, [])

  useEffect(() => {
    if (showEmpty) {
      sessionStorage.setItem('truckbook.empty_dashboard', 'true')
    } else {
      sessionStorage.removeItem('truckbook.empty_dashboard')
    }
  }, [showEmpty])

  const navigateTo = (path) => {
    if (path === '/app/settings' && showEmpty) {
      sessionStorage.setItem('truckbook.empty_dashboard', 'true')
    }
    const url = new URL(window.location.href)
    url.pathname = path
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const handleLogout = () => {
    const url = new URL(window.location.href)
    url.pathname = '/auth'
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
    setToast(getDisabledMessage(label))
    window.clearTimeout(showDisabledToast.timer)
    showDisabledToast.timer = window.setTimeout(() => setToast(''), 2800)
  }

  const handleSidebarClick = (item, isDisabled) => {
    if (isDisabled) {
      showDisabledToast(item.label)
      return
    }
    if (item.label === 'Dashboard') return
    navigateTo(item.path)
  }

  const handleDrawerItemClick = (item, isDisabled) => {
    if (isDisabled) {
      showDisabledToast(item.label)
      return
    }
    navigateTo(item.path)
  }

  const handleCreateTripClick = () => {
    if (counts.trucks === 0) {
      sessionStorage.setItem('truckbook.postAddTruckIntent', 'CREATE_TRIP')
      sessionStorage.setItem(
        'truckbook.postAddTruckMessage',
        'To create a trip, add your first truck.',
      )
      navigateTo('/trucks/new')
      return
    }
    navigateTo('/app/trips/new')
  }

  const formatCurrency = (value) => {
    const number = Number(value || 0)
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(number)
  }

  return (
    <div className="min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={handleLogout}
        activePath="/dashboard"
        onHamburgerClick={() => setIsDrawerOpen(true)}
      />
      <MobileNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        active="Dashboard"
        disabledItems={
          counts.trucks === 0
            ? ['Trips', 'Settlements', 'Reports']
            : counts.trips === 0
              ? ['Reports']
              : []
        }
        onItemClick={handleDrawerItemClick}
        businessName={businessName}
      />

      <div className="flex min-h-[calc(100vh-72px)] md:h-[calc(100vh-72px)] md:overflow-hidden">
        <AppSidebar
          active="Dashboard"
          disabledItems={
            counts.trucks === 0
              ? ['Trips', 'Settlements', 'Reports']
              : counts.trips === 0
                ? ['Reports']
                : []
          }
          onItemClick={handleSidebarClick}
        />

        <main className="flex flex-1 flex-col items-center px-6 py-7 sm:py-10 md:h-full md:overflow-hidden">
          {isLoading ? (
            <div className="w-full max-w-[1100px] animate-pulse space-y-6">
              <div className="h-8 w-48 rounded-full bg-slate-200" />
              <div className="h-4 w-72 rounded-full bg-slate-200" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`kpi-${index}`}
                    className="h-28 rounded-2xl border border-[#E9EEF5] bg-white"
                  />
                ))}
              </div>
              <div className="h-32 rounded-2xl border border-[#E9EEF5] bg-white" />
              <div className="h-40 rounded-2xl border border-[#E9EEF5] bg-white" />
            </div>
          ) : error ? (
            <div className="w-full max-w-[720px] rounded-2xl border border-red-200 bg-white p-6 text-left shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-semibold text-[#111827]">Couldn’t load dashboard</h2>
              <p className="mt-2 text-sm text-slate-600">
                {error.message || 'Please try again.'}
              </p>
              <button
                className="mt-4 h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                type="button"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          ) : showSubscriptionPaywall ? (
            <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-3xl">
                🔒
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-[#111827]">Your trial has ended</h1>
              <p className="mt-2 text-sm text-slate-500">
                Upgrade your plan to continue creating trips, settlements and reports.
              </p>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>
                  Current plan:{' '}
                  <span className="font-semibold text-[#111827]">
                    {subscription?.planCode || 'TRIAL'}
                  </span>
                </p>
                <p className="mt-1">
                  Status:{' '}
                  <span className="font-semibold text-rose-500">
                    {isSubscriptionExpired ? 'Expired' : subscription?.status || 'Inactive'}
                  </span>
                </p>
                {isSubscriptionTrial && daysLeft != null && (
                  <p className="mt-1 text-xs text-slate-500">{daysLeft} day(s) left</p>
                )}
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  className="h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
                  type="button"
                  onClick={() => navigateTo('/pricing')}
                >
                  Upgrade plan
                </button>
                <a
                  className="h-11 rounded-xl border border-emerald-700/30 bg-white px-5 text-sm font-semibold text-emerald-700 inline-flex items-center"
                  href="https://wa.me/911234567890?text=Hi!%20I%20need%20help%20choosing%20a%20TruckBook%20plan."
                  target="_blank"
                  rel="noreferrer"
                >
                  Talk on WhatsApp
                </a>
              </div>
            </div>
          ) : showEmpty ? (
            <div className="w-full max-w-[720px] rounded-2xl bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-slate-50">
                <img className="h-24 w-24 object-contain" src="/logo.png" alt="TruckBook" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-semibold text-ink">
                <span className="md:hidden">Welcome to TruckBook 👋</span>
                <span className="hidden md:inline">
                  {businessName ? `Welcome to TruckBook, ${businessName} 👋` : 'Welcome to TruckBook 👋'}
                </span>
              </h1>
              <p className="mt-3 text-slate-500">
                Let’s get your transport operations set up. Start by adding your first
                truck or creating a trip.
              </p>

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white sm:w-auto"
                  type="button"
                  onClick={() => navigateTo('/trucks/new')}
                >
                  <span>🚚</span>
                  Add your first truck
                </button>
                <span className="text-xs font-semibold text-slate-400">OR</span>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 sm:w-auto"
                  type="button"
                  onClick={handleCreateTripClick}
                >
                  <span>🗺️</span>
                  Create your first trip
                </button>
              </div>

              <div className="mt-8 text-left">
                <p className="text-sm font-semibold text-slate-600">
                  What you can do with TruckBook
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-500">
                  <li>Track trips easily</li>
                  <li>Log fuel in parts</li>
                  <li>Know pending settlements</li>
                  <li>Manage trucks and drivers in one place</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[1100px] self-stretch">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
                <p className="text-sm text-[#6B7280]">
                  {counts.trips === 0
                    ? 'Your trucks are ready. Create your first trip to start tracking.'
                    : 'Overview of your transport operations.'}
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  className="rounded-2xl border border-[#E9EEF5] bg-white p-5 text-left shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5"
                  type="button"
                  onClick={() => navigateTo('/trucks')}
                >
                  <p className="text-sm font-semibold text-slate-500">🚚 Trucks</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111827]">
                    {counts.trucks}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#2563EB]">View trucks</p>
                </button>
                <button
                  className="rounded-2xl border border-[#E9EEF5] bg-white p-5 text-left shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5"
                  type="button"
                  onClick={() =>
                    navigateTo(counts.trips === 0 ? '/app/trips/new' : '/app/trips')
                  }
                >
                  <p className="text-sm font-semibold text-slate-500">🧭 Trips</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111827]">
                    {counts.trips}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#2563EB]">
                    {counts.trips === 0 ? 'Create trip' : 'View trips'}
                  </p>
                </button>
                <button
                  className="rounded-2xl border border-[#E9EEF5] bg-white p-5 text-left shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5"
                  type="button"
                  onClick={() => navigateTo('/app/settlements')}
                >
                  <p className="text-sm font-semibold text-slate-500">💰 Pending Settlement</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111827]">
                    {formatCurrency(pendingAmount)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#2563EB]">
                    View settlements
                  </p>
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                {counts.trips === 0 ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#111827]">
                        Create your first trip
                      </h2>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Start tracking fuel and settlements.
                      </p>
                    </div>
                    <button
                      className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                      type="button"
                      onClick={handleCreateTripClick}
                    >
                      Create trip
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">Quick actions</h2>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          Keep things moving with one-tap actions.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                          type="button"
                          onClick={handleCreateTripClick}
                        >
                          Create trip
                        </button>
                        <button
                          className="h-11 rounded-xl border border-[#D9E2EF] px-4 text-sm font-semibold text-[#111827]"
                          type="button"
                          onClick={() => navigateTo('/trucks/new')}
                        >
                          Add truck
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#111827]">Recent trips</h2>
                  {recentTrips.length > 0 && (
                    <button
                      className="text-sm font-semibold text-[#2563EB]"
                      type="button"
                      onClick={() => navigateTo('/app/trips')}
                    >
                      View all trips →
                    </button>
                  )}
                </div>

                {recentTrips.length === 0 ? (
                  <div className="mt-4 flex flex-col items-start gap-3">
                    <p className="text-sm text-[#6B7280]">
                      No trips created yet. Create a trip to start tracking settlements.
                    </p>
                    <button
                      className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                      type="button"
                      onClick={handleCreateTripClick}
                    >
                      Create Trip
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 hidden grid-cols-[2fr_1.2fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                      <span>Route</span>
                      <span>Truck</span>
                      <span>Status</span>
                      <span>Amount</span>
                      <span />
                    </div>
                    <div className="mt-4 hidden space-y-2 lg:block">
                      {recentTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="grid grid-cols-[2fr_1.2fr_1fr_1fr_80px] items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#4B5563] hover:bg-[#F7FAFF]"
                        >
                          <span className="font-semibold text-[#111827]">
                            {trip.fromLocation || 'Origin'} → {trip.toLocation || 'Destination'}
                          </span>
                          <span>{trip.truck?.truckNumber || '—'}</span>
                          <span className="text-slate-500">{trip.status || 'ACTIVE'}</span>
                          <span className="font-semibold text-[#111827]">
                            {formatCurrency(trip.freightAmount || 0)}
                          </span>
                          <button
                            className="text-sm font-semibold text-[#2563EB]"
                            type="button"
                            onClick={() => navigateTo(`/app/trips/${trip.id || ''}`)}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3 lg:hidden">
                      {recentTrips.map((trip) => (
                        <button
                          key={trip.id}
                          className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left"
                          type="button"
                          onClick={() => navigateTo(`/app/trips/${trip.id || ''}`)}
                        >
                          <p className="text-sm font-semibold text-[#111827]">
                            {trip.fromLocation || 'Origin'} → {trip.toLocation || 'Destination'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{trip.truck?.truckNumber || '—'}</span>
                            <span>•</span>
                            <span>{trip.status || 'ACTIVE'}</span>
                            <span>•</span>
                            <span className="font-semibold text-[#111827]">
                              {formatCurrency(trip.freightAmount || 0)}
                            </span>
                          </div>
                        </button>
                      ))}
                      <button
                        className="text-sm font-semibold text-[#2563EB]"
                        type="button"
                        onClick={() => navigateTo('/app/trips')}
                      >
                        View all trips →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {toast}
        </div>
      )}
    </div>
  )
}
