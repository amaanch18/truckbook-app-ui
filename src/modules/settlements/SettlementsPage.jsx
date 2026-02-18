import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useSettlements } from '../../hooks/useSettlements.js'
import { useOutstanding } from '../../hooks/useOutstanding.js'
import { useParties } from '../../hooks/useParties.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { normalizeError, partiesApi } from '../../api/index.js'

const MODES = ['All', 'Cash', 'UPI', 'Bank', 'Cheque', 'Other']

const parseDateValue = (value) => {
  if (!value) return null
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    return new Date(`${year}-${month}-${day}`)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDate = (value) => {
  const parsed = parseDateValue(value)
  if (!parsed) return '—'
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const toInputDate = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

export default function SettlementsPage() {
  const {
    data: settlements,
    isLoading,
    isFetching,
    error,
    refetch,
    getById: getSettlementById,
  } = useSettlements()
  const { data: parties } = useParties()
  const { data: trucks } = useTrucks()
  const { data: trips } = useTrips()
  const { me } = useAuthSession()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [partyFilter, setPartyFilter] = useState('All')
  const [truckFilter, setTruckFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [outstandingView, setOutstandingView] = useState('party')
  const [selectedOutstandingParty, setSelectedOutstandingParty] = useState('')
  const [selectedOutstandingTruck, setSelectedOutstandingTruck] = useState('')
  const [partyTruckRows, setPartyTruckRows] = useState([])
  const [truckTripRows, setTruckTripRows] = useState([])
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false)
  const [drilldownError, setDrilldownError] = useState('')
  const [partyCredit, setPartyCredit] = useState(0)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const [tripFilterId, setTripFilterId] = useState('')
  const [tripFilteredIds, setTripFilteredIds] = useState(new Set())
  const [isTripFilterLoading, setIsTripFilterLoading] = useState(false)

  const {
    data: outstandingSummary,
    isLoading: isOutstandingLoading,
    error: outstandingError,
    refetch: refetchOutstanding,
    getPartyTrips,
    getPartyTrucks,
    getTruckTrips,
  } = useOutstanding(outstandingView)

  const businessName = useMemo(() => me?.orgName || '', [me])

  const hasTrucks = (trucks || []).length > 0
  const hasTrips = (trips || []).length > 0

  const resetFilters = () => {
    const today = new Date()
    const past = new Date()
    past.setDate(today.getDate() - 30)
    setFromDate(toInputDate(past))
    setToDate(toInputDate(today))
    setPartyFilter('All')
    setTruckFilter('All')
    setModeFilter('All')
    setQuery('')
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

  useEffect(() => {
    resetFilters()
  }, [])

  useEffect(() => {
    refetchOutstanding()
  }, [outstandingView, refetchOutstanding])

  useEffect(() => {
    if (!selectedOutstandingParty) {
      setPartyTruckRows([])
      setPartyCredit(0)
      return
    }
    setIsDrilldownLoading(true)
    setDrilldownError('')
    getPartyTrucks(selectedOutstandingParty)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setPartyTruckRows(list)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setDrilldownError(normalized.message || 'Failed to load party trucks')
      })
      .finally(() => setIsDrilldownLoading(false))

    partiesApi
      .getPartyCredit(selectedOutstandingParty)
      .then((data) => setPartyCredit(Number(data?.creditAmount || 0)))
      .catch(() => setPartyCredit(0))
  }, [selectedOutstandingParty, getPartyTrucks])

  useEffect(() => {
    if (!selectedOutstandingTruck) {
      setTruckTripRows([])
      return
    }
    setIsDrilldownLoading(true)
    setDrilldownError('')
    getTruckTrips(selectedOutstandingTruck)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setTruckTripRows(list)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setDrilldownError(normalized.message || 'Failed to load truck trips')
      })
      .finally(() => setIsDrilldownLoading(false))
  }, [selectedOutstandingTruck, getTruckTrips])

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

  const clearTripFilter = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('tripId')
    window.history.replaceState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
    setTripFilterId('')
    setTripFilteredIds(new Set())
  }

  const partyMap = useMemo(() => {
    const map = new Map()
    parties.forEach((party) => map.set(party.id, party))
    return map
  }, [parties])

  const truckMap = useMemo(() => {
    const map = new Map()
    trucks.forEach((truck) => map.set(truck.id, truck))
    return map
  }, [trucks])

  const settlementsWithMeta = useMemo(() => {
    return (settlements || []).map((settlement) => {
      const party = partyMap.get(settlement.partyId)
      const truck = settlement.truckId ? truckMap.get(settlement.truckId) : null
      return {
        ...settlement,
        partyName: party?.name || settlement.partyName || '—',
        truckNumber: truck?.truckNumber || settlement.truckNumber || '—',
        mode: settlement.paymentMode || settlement.mode || '—',
        referenceId: settlement.reference || settlement.referenceId || '',
      }
    })
  }, [settlements, partyMap, truckMap])

  useEffect(() => {
    const syncTripFilter = () => {
      const params = new URLSearchParams(window.location.search)
      const tripIdParam = params.get('tripId') || ''
      setTripFilterId(tripIdParam)
    }
    syncTripFilter()
    window.addEventListener('popstate', syncTripFilter)
    window.addEventListener('app:navigate', syncTripFilter)
    return () => {
      window.removeEventListener('popstate', syncTripFilter)
      window.removeEventListener('app:navigate', syncTripFilter)
    }
  }, [])

  useEffect(() => {
    if (!tripFilterId || !settlementsWithMeta.length) {
      setTripFilteredIds(new Set())
      return
    }
    let isMounted = true
    setIsTripFilterLoading(true)
    Promise.all(
      settlementsWithMeta.map(async (settlement) => {
        try {
          const detail = await getSettlementById(settlement.id)
          const allocations = detail?.allocations || []
          const hasTrip = allocations.some((allocation) => allocation.tripId === tripFilterId)
          return hasTrip ? settlement.id : null
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (!isMounted) return
      const next = new Set(results.filter(Boolean))
      setTripFilteredIds(next)
      setIsTripFilterLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [tripFilterId, settlementsWithMeta, getSettlementById])

  const filteredSettlements = useMemo(() => {
    const start = fromDate ? new Date(fromDate) : null
    const end = toDate ? new Date(toDate) : null
    return settlementsWithMeta.filter((settlement) => {
      if (tripFilterId) {
        if (isTripFilterLoading) return true
        if (!tripFilteredIds.has(settlement.id)) return false
      }
      if (partyFilter !== 'All' && settlement.partyId !== partyFilter) return false
      if (truckFilter !== 'All' && settlement.truckId !== truckFilter) return false
      if (modeFilter !== 'All' && settlement.mode !== modeFilter) return false
      if (query.trim()) {
        const haystack = `${settlement.settlementCode || settlement.id} ${
          settlement.partyName || ''
        } ${settlement.truckNumber || ''} ${settlement.referenceId || ''}`.toLowerCase()
        if (!haystack.includes(query.trim().toLowerCase())) return false
      }
      if (start || end) {
        const dateValue = settlement.settlementDate
        if (!dateValue) return false
        const settlementDate = parseDateValue(dateValue)
        if (!settlementDate) return false
        if (start && settlementDate < start) return false
        if (end) {
          const endValue = new Date(end)
          endValue.setHours(23, 59, 59, 999)
          if (settlementDate > endValue) return false
        }
      }
      return true
    })
  }, [
    settlementsWithMeta,
    fromDate,
    toDate,
    partyFilter,
    truckFilter,
    modeFilter,
    query,
    tripFilterId,
    tripFilteredIds,
  ])

  const summary = useMemo(() => {
    const today = toInputDate(new Date())
    const receivedThisMonth = settlementsWithMeta.reduce((sum, settlement) => {
      if (!settlement.settlementDate) return sum
      const date = parseDateValue(settlement.settlementDate)
      if (!date) return sum
      const now = new Date()
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        return sum + Number(settlement.receivedAmount || 0)
      }
      return sum
    }, 0)
    const receivedToday = settlementsWithMeta.reduce((sum, settlement) => {
      if (settlement.settlementDate !== today) return sum
      return sum + Number(settlement.receivedAmount || 0)
    }, 0)
    const partiesWithPending = Array.isArray(outstandingSummary)
      ? outstandingSummary.length
      : 0
    return {
      receivedThisMonth,
      receivedToday,
      partiesWithPending,
    }
  }, [settlementsWithMeta, outstandingSummary])

  const outstandingByParty = useMemo(() => {
    return (outstandingSummary || []).map((row, index) => {
      const id = row.partyId || row.id || `party-${index}`
      const name =
        row.partyName || partyMap.get(row.partyId)?.name || row.name || 'Unknown'
      const amount = Number(
        row.totalOutstanding ??
          row.outstandingAmount ??
          row.pendingAmount ??
          row.amount ??
          row.balance ??
          0,
      )
      return { id, name, amount }
    })
  }, [outstandingSummary, partyMap])

  const outstandingByTruck = useMemo(() => {
    return (outstandingSummary || []).map((row, index) => {
      const id = row.truckId || row.id || `truck-${index}`
      const name =
        row.truckNumber || truckMap.get(row.truckId)?.truckNumber || row.name || 'Unknown'
      const amount = Number(
        row.totalOutstanding ??
          row.outstandingAmount ??
          row.pendingAmount ??
          row.amount ??
          row.balance ??
          0,
      )
      return { id, name, amount }
    })
  }, [outstandingSummary, truckMap])

  const selectedPartyOutstanding = useMemo(() => {
    if (!selectedOutstandingParty) return 0
    const row = outstandingByParty.find((item) => item.id === selectedOutstandingParty)
    return Number(row?.amount || 0)
  }, [outstandingByParty, selectedOutstandingParty])

  const outstandingPartyTrucks = useMemo(() => {
    return (partyTruckRows || []).map((truck, index) => ({
      id: truck.truckId || truck.id || `truck-${index}`,
      name: truck.truckNumber || truck.name || '—',
      amount: Number(
        truck.totalOutstanding ??
          truck.outstandingAmount ??
          truck.pendingAmount ??
          truck.amount ??
          truck.balance ??
          0,
      ),
    }))
  }, [partyTruckRows])

  const outstandingTruckTrips = useMemo(() => {
    return (truckTripRows || [])
      .map((trip) => ({
        id: trip.tripId || trip.id,
        route: `${trip.fromLocation || trip.from || '—'} → ${trip.toLocation || trip.to || '—'}`,
        pending: Number(trip.outstandingAmount ?? trip.pendingAmount ?? 0),
      }))
      .filter((trip) => trip.pending > 0)
  }, [truckTripRows])

  useEffect(() => {
    if (outstandingView !== 'party') {
      setSelectedOutstandingParty('')
    }
    if (outstandingView !== 'truck') {
      setSelectedOutstandingTruck('')
    }
  }, [outstandingView])

  return (
    <div className="min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={() => {
          sessionStorage.clear()
          navigateTo('/')
        }}
        activePath="/app/settlements"
        onHamburgerClick={() => setIsDrawerOpen(true)}
        avatarVariant="brand"
        stickyDesktop
      />
      <MobileNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        active="Settlements"
        disabledItems={!hasTrucks ? ['Trips', 'Settlements', 'Reports'] : !hasTrips ? ['Reports'] : []}
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
          active="Settlements"
          disabledItems={!hasTrucks ? ['Trips', 'Settlements', 'Reports'] : !hasTrips ? ['Reports'] : []}
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
              <h1 className="text-2xl font-semibold text-[#111827]">Settlements</h1>
              <p className="mt-1 text-sm text-slate-500">All settlements received across trips.</p>
            </div>
            <button
              type="button"
              className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
              onClick={() => navigateTo('/app/settlements/new')}
            >
              + Create settlement
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-3 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Received (This month)</p>
              <p className="mt-1 text-lg font-semibold text-[#111827]">
                {formatCurrency(summary.receivedThisMonth)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-3 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Settlements today</p>
              <p className="mt-1 text-lg font-semibold text-[#111827]">
                {formatCurrency(summary.receivedToday)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-3 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Parties with pending</p>
              <p className="mt-1 text-lg font-semibold text-[#111827]">{summary.partiesWithPending}</p>
            </div>
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-3 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Total settlements</p>
              <p className="mt-1 text-lg font-semibold text-[#111827]">{settlements.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-[#E9EEF5] bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-[0_16px_32px_rgba(0,0,0,0.06)] lg:hidden">
                <span>Filters</span>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500"
                  onClick={() => setShowFiltersMobile((prev) => !prev)}
                >
                  {showFiltersMobile ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="sticky top-20 z-20 hidden rounded-2xl border border-[#E9EEF5] bg-white p-4 text-[11px] shadow-[0_16px_32px_rgba(0,0,0,0.06)] lg:block">
                <div className="grid gap-2 lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.95fr_0.95fr_1.3fr_0.8fr]">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">From</label>
                    <input
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      type="date"
                      value={fromDate}
                      onChange={(event) => handleFromDateChange(event.target.value)}
                      max={toDate || undefined}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">To</label>
                    <input
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      type="date"
                      value={toDate}
                      onChange={(event) => handleToDateChange(event.target.value)}
                      min={fromDate || undefined}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">Mode</label>
                    <select
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      value={modeFilter}
                      onChange={(event) => setModeFilter(event.target.value)}
                    >
                      {MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">Party</label>
                    <select
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      value={partyFilter}
                      onChange={(event) => setPartyFilter(event.target.value)}
                    >
                      <option value="All">All parties</option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">Truck</label>
                    <select
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      value={truckFilter}
                      onChange={(event) => setTruckFilter(event.target.value)}
                    >
                      <option value="All">All trucks</option>
                      {trucks.map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          {truck.truckNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400">Search</label>
                    <input
                      className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                      placeholder="Search party, truck, ref"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      className="h-9 w-full rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:border-slate-300"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              </div>

              {showFiltersMobile && (
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 text-[11px] shadow-[0_16px_32px_rgba(0,0,0,0.06)] lg:hidden">
                  <div className="grid gap-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">From</label>
                      <input
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        type="date"
                        value={fromDate}
                        onChange={(event) => handleFromDateChange(event.target.value)}
                        max={toDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">To</label>
                      <input
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        type="date"
                        value={toDate}
                        onChange={(event) => handleToDateChange(event.target.value)}
                        min={fromDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Mode</label>
                      <select
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        value={modeFilter}
                        onChange={(event) => setModeFilter(event.target.value)}
                      >
                        {MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Party</label>
                      <select
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        value={partyFilter}
                        onChange={(event) => setPartyFilter(event.target.value)}
                      >
                        <option value="All">All parties</option>
                        {parties.map((party) => (
                          <option key={party.id} value={party.id}>
                            {party.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Truck</label>
                      <select
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        value={truckFilter}
                        onChange={(event) => setTruckFilter(event.target.value)}
                      >
                        <option value="All">All trucks</option>
                        {trucks.map((truck) => (
                          <option key={truck.id} value={truck.id}>
                            {truck.truckNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400">Search</label>
                      <input
                        className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-[11px]"
                        placeholder="Search party, truck, ref"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-2 h-9 w-full rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                {error && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error.message || 'Failed to load settlements.'}
                    <button
                      type="button"
                      className="ml-2 font-semibold text-rose-700"
                      onClick={() => refetch()}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#111827]">Settlement list</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Refine by date, party, or truck.
                    </p>
                    {tripFilterId && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                        <span>Filtered by trip</span>
                        {isTripFilterLoading && <span className="text-[10px] text-blue-500">Loading</span>}
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                          onClick={clearTripFilter}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {(isLoading || isFetching) && (
                    <span className="text-xs font-semibold text-slate-400">Loading...</span>
                  )}
                </div>
                <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto pr-1 text-sm">
                <div className="sticky top-0 z-10 hidden grid-cols-[1.3fr_1.6fr_0.9fr_0.9fr_0.7fr] gap-4 border-b border-slate-100 bg-white/95 px-3 pb-2 pt-2 text-[10px] font-semibold uppercase text-slate-400 backdrop-blur lg:grid">
                  <span>Settlement</span>
                  <span>Party / Truck</span>
                  <span>Received</span>
                  <span>Unallocated</span>
                  <span>Mode</span>
                </div>
                {filteredSettlements.length === 0 ? (
                  <p className="text-sm text-slate-400">No settlements found.</p>
                ) : (
                  filteredSettlements.map((settlement) => {
                    const allocatedAmount = Number(settlement.allocatedAmount || 0)
                    const unallocatedAmount =
                      settlement.unallocatedAmount ??
                      Math.max(Number(settlement.receivedAmount || 0) - allocatedAmount, 0)
                    return (
                      <div
                        key={settlement.id}
                        className="cursor-pointer rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm hover:bg-[#F7FAFF] lg:border lg:border-slate-100 lg:bg-transparent lg:px-3 lg:py-2 lg:shadow-none"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateTo(`/app/settlements/${settlement.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') navigateTo(`/app/settlements/${settlement.id}`)
                        }}
                      >
                        <div className="hidden grid-cols-[1.3fr_1.6fr_0.9fr_0.9fr_0.7fr] items-center gap-4 lg:grid">
                          <div>
                            <p className="font-semibold text-[#111827]">
                              {settlement.settlementCode || settlement.id}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatDate(settlement.settlementDate)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-[#111827]">{settlement.partyName}</p>
                            <p className="text-xs text-slate-400">
                              {settlement.truckId ? settlement.truckNumber : 'Multiple trucks'}
                            </p>
                          </div>
                          <span className="font-semibold text-[#111827]">
                            {formatCurrency(settlement.receivedAmount)}
                          </span>
                          <span className="font-semibold text-[#111827]">
                            {formatCurrency(unallocatedAmount)}
                          </span>
                          <span className="text-sm text-slate-500">{settlement.mode}</span>
                        </div>
                        <div className="flex flex-col gap-2 lg:hidden">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-[#111827]">
                                {settlement.settlementCode || settlement.id}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatDate(settlement.settlementDate)}
                              </p>
                            </div>
                            <span className="text-[11px] text-slate-400">{settlement.mode}</span>
                          </div>
                          <div className="text-[13px] text-slate-600">
                            {settlement.partyName} •{' '}
                            {settlement.truckId ? settlement.truckNumber : 'Multiple trucks'}
                          </div>
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="text-slate-500">Received</span>
                            <span className="font-semibold text-[#111827]">
                              {formatCurrency(settlement.receivedAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="text-slate-500">Unallocated</span>
                            <span className="font-semibold text-[#111827]">
                              {formatCurrency(unallocatedAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] lg:-mt-3 lg:p-5">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 pb-3 backdrop-blur">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827] lg:text-base">Outstanding</h3>
                  <p className="mt-1 text-[11px] text-slate-400 lg:text-xs">
                    Tap a party to see pending by truck.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold lg:text-xs">
                  <button
                    type="button"
                    onClick={() => setOutstandingView('party')}
                    className={`rounded-full px-3 py-1 ${
                      outstandingView === 'party'
                        ? 'bg-blue-50 text-blue-600'
                        : 'border border-slate-200 text-slate-500'
                    }`}
                  >
                    By party
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutstandingView('truck')}
                    className={`rounded-full px-3 py-1 ${
                      outstandingView === 'truck'
                        ? 'bg-blue-50 text-blue-600'
                        : 'border border-slate-200 text-slate-500'
                    }`}
                  >
                    By truck
                  </button>
                </div>
              </div>
              <div className="mt-2 max-h-[320px] space-y-3 overflow-y-auto pr-1 text-sm text-slate-600">
                {outstandingError && (
                  <p className="text-sm text-rose-500">{outstandingError.message}</p>
                )}
                {isOutstandingLoading && (
                  <p className="text-sm text-slate-400">Loading outstanding...</p>
                )}
                {(outstandingView === 'party' ? outstandingByParty : outstandingByTruck).length ===
                0 ? (
                  <p className="text-sm text-slate-400">No pending settlements right now.</p>
                ) : (
                  (outstandingView === 'party' ? outstandingByParty : outstandingByTruck).map(
                    (item, index) => (
                      <button
                        key={`${outstandingView}-${item.id || item.name || 'item'}-${index}`}
                        type="button"
                        onClick={() => {
                          if (outstandingView === 'party') {
                            setSelectedOutstandingParty((prev) => (prev === item.id ? '' : item.id))
                          }
                          if (outstandingView === 'truck') {
                            setSelectedOutstandingTruck((prev) => (prev === item.id ? '' : item.id))
                          }
                        }}
                        className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          (outstandingView === 'party' &&
                            selectedOutstandingParty === item.id) ||
                          (outstandingView === 'truck' &&
                            selectedOutstandingTruck === item.id)
                            ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-100 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-xs text-slate-400">
                            {outstandingView === 'party' ? 'View trucks' : 'View trips'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">{formatCurrency(item.amount)}</span>
                          <span className="text-slate-300 group-hover:text-blue-500">›</span>
                        </div>
                      </button>
                    ),
                  )
                )}

                {drilldownError && (
                <p className="mt-4 text-xs text-rose-500">{drilldownError}</p>
                )}
                {isDrilldownLoading && (
                <p className="mt-4 text-xs text-slate-400">Loading details...</p>
                )}

                {outstandingView === 'party' && selectedOutstandingParty && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span>Outstanding</span>
                    <span className="font-semibold text-[#111827]">
                      {formatCurrency(selectedPartyOutstanding)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Credit</span>
                    <span className="font-semibold text-[#111827]">{formatCurrency(partyCredit)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Net Due</span>
                    <span className="font-semibold text-[#111827]">
                      {formatCurrency(Math.max(selectedPartyOutstanding - partyCredit, 0))}
                    </span>
                  </div>
                </div>
                )}

                {outstandingView === 'party' && outstandingPartyTrucks.length > 0 && (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-slate-400">Pending by truck</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                      onClick={() => setSelectedOutstandingParty('')}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {outstandingPartyTrucks.map((truck, index) => (
                      <button
                        key={`${truck.id || truck.name || 'truck'}-${index}`}
                        type="button"
                        onClick={() => {
                          setOutstandingView('truck')
                          setSelectedOutstandingTruck(truck.id)
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="font-semibold text-[#111827]">{truck.name}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(truck.amount)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}

              {outstandingView === 'truck' && outstandingTruckTrips.length > 0 && (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-slate-400">Pending trips</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                      onClick={() => setSelectedOutstandingTruck('')}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {outstandingTruckTrips.map((trip, index) => (
                      <button
                        key={trip.id || trip.route || index}
                        type="button"
                        onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50"
                      >
                        <span className="font-semibold text-[#111827]">{trip.route}</span>
                        <span className="text-sm text-slate-500">{formatCurrency(trip.pending)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {navToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {navToast}
        </div>
      )}
    </div>
  )
}
