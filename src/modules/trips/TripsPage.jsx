import { useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

export default function TripsPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [truckFilter, setTruckFilter] = useState('ALL')
  const [partyFilter, setPartyFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const { me } = useAuthSession()
  const { data: trucksData } = useTrucks()
  const { data: tripsData } = useTrips()
  const businessName = useMemo(() => me?.orgName || '', [me])
  const trips = tripsData || []
  const hasTrucks = (trucksData || []).length > 0
  const hasTrips = trips.length > 0

  const navigateTo = (path) => {
    const url = new URL(window.location.href)
    url.pathname = path
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

  const handleCreateTripClick = () => {
    if (!hasTrucks) {
      navigateTo('/trucks/new')
      return
    }
    navigateTo('/app/trips/new')
  }

  const statusFilteredTrips =
    filter === 'ALL'
      ? trips
      : trips.filter((trip) => (trip.status || '').toUpperCase() === filter)

  const formatStatus = (value) => {
    const status = (value || 'ACTIVE').toUpperCase()
    return status === 'COMPLETED' ? 'Completed' : 'Active'
  }

  const formatDate = (value) => {
    if (!value) return '—'
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [day, month, year] = value.split('-')
      const parsed = new Date(Number(year), Number(month) - 1, Number(day))
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      }
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const truckMap = useMemo(() => {
    const map = new Map()
    ;(trucksData || []).forEach((truck) => {
      if (truck?.id) map.set(truck.id, truck.truckNumber || '')
    })
    return map
  }, [trucksData])

  const getTruckNumber = (trip) => {
    return trip?.truckNumber || truckMap.get(trip?.truckId) || '—'
  }

  const getPartyName = (trip) => {
    return trip?.partyName || trip?.party?.name || trip?.party?.partyName || '—'
  }

  const parseTripDate = (trip) => {
    const value = trip?.startDate || trip?.startedAt || trip?.createdAt
    if (!value) return null
    if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
      const [day, month, year] = value.split('-')
      const parsed = new Date(Number(year), Number(month) - 1, Number(day))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const tripTruckOptions = useMemo(() => {
    const map = new Map()
    statusFilteredTrips.forEach((trip) => {
      const id = trip?.truckId
      const number = getTruckNumber(trip)
      if (id && !map.has(id)) {
        map.set(id, number || '—')
      }
    })
    return Array.from(map.entries()).map(([id, truckNumber]) => ({ id, truckNumber }))
  }, [statusFilteredTrips])

  const tripPartyOptions = useMemo(() => {
    const map = new Map()
    statusFilteredTrips.forEach((trip) => {
      const id = trip?.partyId
      const name = getPartyName(trip)
      if (id && !map.has(id)) {
        map.set(id, name || '—')
      }
    })
    return Array.from(map.entries()).map(([id, partyName]) => ({ id, partyName }))
  }, [statusFilteredTrips])

  const filteredTrips = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null
    const query = searchQuery.trim().toLowerCase()

    return statusFilteredTrips.filter((trip) => {
      if (truckFilter !== 'ALL' && trip?.truckId !== truckFilter) return false
      if (partyFilter !== 'ALL' && trip?.partyId !== partyFilter) return false

      const tripDate = parseTripDate(trip)
      if (from && tripDate && tripDate < from) return false
      if (to && tripDate && tripDate > to) return false
      if ((from || to) && !tripDate) return false

      if (query) {
        const haystack = [
          trip?.tripCode,
          trip?.fromLocation,
          trip?.from,
          trip?.toLocation,
          trip?.to,
          getTruckNumber(trip),
          getPartyName(trip),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [statusFilteredTrips, truckFilter, partyFilter, fromDate, toDate, searchQuery])

  const clearFilters = () => {
    setSearchQuery('')
    setTruckFilter('ALL')
    setPartyFilter('ALL')
    setFromDate('')
    setToDate('')
  }

  const handleFromDateChange = (value) => {
    setFromDate(value)
    if (value && toDate && new Date(`${toDate}T00:00:00`) < new Date(`${value}T00:00:00`)) {
      setToDate('')
    }
  }

  const handleToDateChange = (value) => {
    if (value && fromDate && new Date(`${value}T00:00:00`) < new Date(`${fromDate}T00:00:00`)) {
      return
    }
    setToDate(value)
  }

  const sortedTrips = useMemo(() => {
    const list = [...filteredTrips]
    return list.sort((a, b) => {
      const statusA = (a.status || 'ACTIVE').toUpperCase()
      const statusB = (b.status || 'ACTIVE').toUpperCase()
      if (filter === 'ALL') {
        if (statusA !== statusB) {
          if (statusA === 'ACTIVE') return -1
          if (statusB === 'ACTIVE') return 1
        }
      }
      const dateA =
        statusA === 'COMPLETED'
          ? a.completedAt || a.startedAt || a.startDate || a.createdAt
          : a.startedAt || a.startDate || a.createdAt
      const dateB =
        statusB === 'COMPLETED'
          ? b.completedAt || b.startedAt || b.startDate || b.createdAt
          : b.startedAt || b.startDate || b.createdAt
      return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime()
    })
  }, [filteredTrips, filter])

  return (
    <div className="min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={() => {
          navigateTo('/auth')
        }}
        activePath="/app/trips"
        onHamburgerClick={() => setIsDrawerOpen(true)}
        avatarVariant="brand"
      />
      <MobileNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        active="Trips"
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

      <div className="flex min-h-[calc(100vh-72px)] md:h-[calc(100vh-72px)] md:overflow-hidden">
        <AppSidebar
          active="Trips"
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
        />

        <main className="flex flex-1 flex-col gap-6 px-6 py-7 sm:py-10 md:h-full md:overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">Trips</h1>
              <p className="mt-1 text-sm text-[#6B7280]">All trips in one place.</p>
            </div>
            <button
              className="h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
              type="button"
              onClick={handleCreateTripClick}
            >
              + Create trip
            </button>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
                🧭
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#111827]">No trips created yet</h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                Create a trip to start tracking settlements.
              </p>
              <button
                className="mt-5 h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
                type="button"
                onClick={handleCreateTripClick}
              >
                Create your first trip
              </button>
            </div>
          ) : (
            <div className="flex flex-col rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <div className="flex flex-wrap items-center gap-2 pb-4">
                {[
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Completed', value: 'COMPLETED' },
                  { label: 'All', value: 'ALL' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilter(tab.value)}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      filter === tab.value
                        ? 'bg-[#2563EB] text-white'
                        : 'border border-slate-200 text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-between lg:hidden">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Filters
                </span>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  onClick={() => setShowFiltersMobile((prev) => !prev)}
                >
                  {showFiltersMobile ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="hidden gap-2 border-b border-slate-100 pb-4 sm:grid-cols-2 lg:grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search route, trip code, truck, party"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
                />
                <select
                  value={truckFilter}
                  onChange={(event) => setTruckFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All trucks</option>
                  {tripTruckOptions.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.truckNumber}
                    </option>
                  ))}
                </select>
                <select
                  value={partyFilter}
                  onChange={(event) => setPartyFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All parties</option>
                  {tripPartyOptions.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.partyName}
                    </option>
                  ))}
                </select>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2">
                  <span className="text-xs font-semibold text-slate-500">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => handleFromDateChange(event.target.value)}
                    aria-label="From date"
                    max={toDate || undefined}
                    className="h-full w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2">
                  <span className="text-xs font-semibold text-slate-500">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => handleToDateChange(event.target.value)}
                    aria-label="To date"
                    min={fromDate || undefined}
                    className="h-full w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
              {showFiltersMobile && (
                <div className="grid gap-2 border-b border-slate-100 pb-4 sm:grid-cols-2 lg:hidden">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search route, trip code, truck, party"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
                  />
                  <select
                    value={truckFilter}
                    onChange={(event) => setTruckFilter(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="ALL">All trucks</option>
                    {tripTruckOptions.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.truckNumber}
                      </option>
                    ))}
                  </select>
                  <select
                    value={partyFilter}
                    onChange={(event) => setPartyFilter(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="ALL">All parties</option>
                    {tripPartyOptions.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.partyName}
                      </option>
                    ))}
                  </select>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2">
                    <span className="text-xs font-semibold text-slate-500">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => handleFromDateChange(event.target.value)}
                      aria-label="From date"
                      max={toDate || undefined}
                      className="h-full w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2">
                    <span className="text-xs font-semibold text-slate-500">To</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => handleToDateChange(event.target.value)}
                      aria-label="To date"
                      min={fromDate || undefined}
                      className="h-full w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="lg:max-h-[calc(100vh-360px)] lg:overflow-y-auto lg:pr-1">
                <div className="mb-2 hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_1.1fr_0.9fr_0.9fr_1fr_80px]">
                  <span>Route</span>
                  <span>Truck</span>
                  <span>Start date</span>
                  <span>Status</span>
                  <span title="Total freight amount for this trip">
                    Amount
                    <span className="block text-[10px] font-semibold normal-case text-slate-300">
                      (Freight)
                    </span>
                  </span>
                  <span />
                </div>
                {filteredTrips.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    {filter === 'ACTIVE' && (
                      <>
                        <p>No active trips.</p>
                        <p className="mt-2">Create a new trip to start tracking your transport.</p>
                        <button
                          className="mt-4 h-10 rounded-xl bg-[#2563EB] px-4 text-xs font-semibold text-white"
                          type="button"
                          onClick={handleCreateTripClick}
                        >
                          + Create trip
                        </button>
                      </>
                    )}
                    {filter === 'COMPLETED' && (
                      <>
                        <p>No completed trips yet.</p>
                        <p className="mt-2">Completed trips will appear here once marked completed.</p>
                      </>
                    )}
                    {filter === 'ALL' && <p>No trips in this view.</p>}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 hidden space-y-2 lg:block">
                      {sortedTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="grid cursor-pointer grid-cols-[2fr_1.1fr_0.9fr_0.9fr_1fr_80px] items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-[#4B5563] hover:bg-[#F7FAFF]"
                          onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                        >
                          <span className="font-semibold text-[#111827]">
                            {trip.fromLocation || trip.from} → {trip.toLocation || trip.to}
                          </span>
                          <span>{getTruckNumber(trip)}</span>
                          <span className="text-slate-500">
                            {formatDate(trip.startDate || trip.startedAt || trip.createdAt)}
                          </span>
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              (trip.status || '').toUpperCase() === 'COMPLETED'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {formatStatus(trip.status)}
                          </span>
                          <span className="font-semibold text-[#111827]">
                            ₹{trip.freightAmount ?? trip.freight ?? 0}
                          </span>
                          <button
                            className="text-sm font-semibold text-[#2563EB]"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              navigateTo(`/app/trips/${trip.id}`)
                            }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3 lg:hidden">
                      {sortedTrips.map((trip) => (
                        <button
                          key={trip.id}
                          className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left"
                          type="button"
                          onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                        >
                          <p className="text-sm font-semibold text-[#111827]">
                            {trip.fromLocation || trip.from} → {trip.toLocation || trip.to}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{getTruckNumber(trip)}</span>
                            <span>•</span>
                            <span>{formatDate(trip.startDate || trip.startedAt || trip.createdAt)}</span>
                            <span>•</span>
                            <span className="font-semibold text-[#111827]">
                              ₹{trip.freightAmount ?? trip.freight ?? 0}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                (trip.status || '').toUpperCase() === 'COMPLETED'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {formatStatus(trip.status)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {navToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {navToast}
        </div>
      )}
    </div>
  )
}
