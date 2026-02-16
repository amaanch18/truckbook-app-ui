import { Component, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useReports } from '../../hooks/useReports.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useParties } from '../../hooks/useParties.js'
import { toDdMmYyyy } from '../../api/http.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

const TABS = ['Overview', 'Profit', 'Operating vs Revenue']

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
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

const startOfLast30Days = () => {
  const now = new Date()
  const past = new Date()
  past.setDate(now.getDate() - 30)
  return past
}

const renderOperatingTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  const nameMap = {
    fuelCost: 'Fuel',
    tollCost: 'Toll',
    driverCost: 'Driver',
    repairsCost: 'Repairs',
    tyresCost: 'Tyres',
    tripCost: 'Operating cost',
    overheadCost: 'Truck overhead',
    operatingCost: 'Operating cost',
    accrualRevenue: 'Revenue (Accrual)',
    directProfit: 'Profit (Direct)',
    netProfit: 'Profit (Net)',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => {
          const name = nameMap[entry.dataKey] || entry.name || entry.dataKey
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <span>{name}</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { me } = useAuthSession()
  const { data: reports, isLoading, isFetching, error, refetch, fetchOverview, fetchProfit, fetchOperatingVsRevenue } =
    useReports()
  const { data: trucks } = useTrucks()
  const { data: parties } = useParties()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [fromDate, setFromDate] = useState(toInputDate(startOfLast30Days()))
  const [toDate, setToDate] = useState(toInputDate(new Date()))
  const [truckFilter, setTruckFilter] = useState('All')
  const [partyFilter, setPartyFilter] = useState('All')
  const [groupBy, setGroupBy] = useState('month')
  const [showFilters, setShowFilters] = useState(false)
  const [profitMode, setProfitMode] = useState('Direct')

  const businessName = useMemo(() => me?.orgName || '', [me])
  const hasTrucks = (trucks || []).length > 0
  const hasTrips =
    reports?.overview?.summary?.tripsCount != null
      ? Number(reports?.overview?.summary?.tripsCount || 0) > 0
      : true

  const resolvedTruckId = useMemo(() => {
    if (!truckFilter || truckFilter === 'All') return undefined
    const list = trucks || []
    if (list.some((truck) => truck.id === truckFilter)) return truckFilter
    const match = list.find((truck) => truck.truckNumber === truckFilter)
    return match?.id
  }, [truckFilter, trucks])

  const fetchAll = useMemo(() => {
    return async (nextParams) => {
      await Promise.all([
        fetchOverview(nextParams),
        fetchProfit(nextParams),
        fetchOperatingVsRevenue(nextParams),
      ])
    }
  }, [fetchOverview, fetchProfit, fetchOperatingVsRevenue])

  useEffect(() => {
    const params = {
      from: toDdMmYyyy(fromDate),
      to: toDdMmYyyy(toDate),
      groupBy: groupBy || 'month',
      truckId: resolvedTruckId,
      partyId: partyFilter !== 'All' ? partyFilter : undefined,
    }
    const timer = window.setTimeout(() => {
      fetchAll(params).catch(() => {})
    }, 300)
    return () => window.clearTimeout(timer)
  }, [fromDate, toDate, groupBy, truckFilter, partyFilter, fetchAll])

  useEffect(() => {
    if (error?.status === 401) {
      const url = new URL(window.location.href)
      url.pathname = '/auth'
      url.search = ''
      window.history.replaceState({}, '', url)
      window.dispatchEvent(new Event('app:navigate'))
    }
  }, [error])

  const handleDateChange = (setter) => (event) => {
    const nextValue = event.target.value
    setter(nextValue)
  }

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
    return 'This section is not available yet.'
  }

  const showDisabledToast = (label) => {
    setNavToast(getDisabledMessage(label))
    window.clearTimeout(showDisabledToast.timer)
    showDisabledToast.timer = window.setTimeout(() => setNavToast(''), 2800)
  }

  const truckOptions = useMemo(() => {
    const list = (trucks || []).map((truck) => ({
      value: truck.id,
      label: truck.truckNumber || truck.id,
    }))
    return [{ value: 'All', label: 'All trucks' }, ...list]
  }, [trucks])

  const partyOptions = useMemo(() => {
    const list = (parties || []).map((party) => ({
      value: party.id,
      label: party.name || party.partyName || party.id,
    }))
    return [{ value: 'All', label: 'All parties' }, ...list]
  }, [parties])

  const overview = reports?.overview || {}
  const profitReport = reports?.profit || {}
  const operatingReport = reports?.operatingVsRevenue || {}

  const overviewSummary = overview.summary || {}
  const expenseBreakdown = profitReport.expenseBreakdown || {}
  const revenueAccrual = Number(overviewSummary.revenueEarned || 0)
  const fuelCost = Number(expenseBreakdown.fuel || 0)
  const tollCost = Number(expenseBreakdown.tolls || 0)
  const driverCost = Number(expenseBreakdown.driver || 0)
  const repairsCost = Number(expenseBreakdown.repairs || 0)
  const tyresCost = Number(expenseBreakdown.tyres || 0)
  const tripCost = fuelCost + tollCost + driverCost
  const overheadCost = repairsCost + tyresCost
  const directProfit = revenueAccrual - tripCost
  const netProfit = revenueAccrual - (tripCost + overheadCost)
  const cashReceived = Number(overviewSummary.cashReceived || 0)
  const pendingSettlementTotal = Number(overviewSummary.outstanding || 0)
  const partiesWithPending = Array.isArray(overview.topParties) ? overview.topParties.length : 0
  const costShare =
    revenueAccrual > 0
      ? Math.round(((tripCost + overheadCost) / revenueAccrual) * 100)
      : null
  const derivedTripCount = useMemo(() => {
    if (Array.isArray(overview.topTrucks) && overview.topTrucks.length > 0) {
      return overview.topTrucks.reduce(
        (sum, truck) => sum + Number(truck.tripCount || truck.trips || 0),
        0,
      )
    }
    return 0
  }, [overview])

  const tripCount =
    Number(
      operatingReport.summary?.tripCount ||
        profitReport.summary?.tripCount ||
        overview.summary?.tripCount ||
        derivedTripCount ||
        0,
    ) || 0

  const chartData = useMemo(() => {
    const series = Array.isArray(overview.series) ? overview.series : []
    return series.map((entry) => {
      const revenue = Number(entry.revenueEarned || 0)
      const expenses = Number(entry.expensesTotal || 0)
      const profit = Number(entry.profit ?? revenue - expenses)
      return {
        label: entry.label || entry.dateLabel || entry.date || '—',
        accrualRevenue: revenue,
        tripCost: expenses,
        directProfit: profit,
        netProfit: profit,
      }
    })
  }, [overview])

  const operatingChartData = useMemo(() => {
    const series = Array.isArray(operatingReport.series) ? operatingReport.series : []
    return series.map((entry) => ({
      label: entry.label || entry.dateLabel || entry.date || '—',
      accrualRevenue: Number(entry.revenueEarned || 0),
      operatingCost: Number(entry.operatingCost ?? entry.expensesTotal ?? 0),
      fuelCost: Number(entry.fuel || entry.fuelCost || 0),
      tollCost: Number(entry.tolls || entry.tollCost || 0),
      driverCost: Number(entry.driver || entry.driverCost || 0),
      repairsCost: Number(entry.repairs || entry.repairsCost || 0),
      tyresCost: Number(entry.tyres || entry.tyresCost || 0),
    }))
  }, [operatingReport])

  const filteredTrips = Array.isArray(profitReport.tripBreakdown)
    ? profitReport.tripBreakdown
    : Array.isArray(profitReport.trips)
    ? profitReport.trips
    : []

  const tripCountByTruck = useMemo(() => {
    const map = new Map()
    filteredTrips.forEach((trip) => {
      const truckKey = trip.truckId || trip.truckNumber || trip.truck?.truckNumber
      if (!truckKey) return
      map.set(truckKey, (map.get(truckKey) || 0) + 1)
    })
    return map
  }, [filteredTrips])

  const topTrucks = Array.isArray(overview.topTrucks)
    ? overview.topTrucks.map((truck) => ({
        truck: truck.truckNumber || truck.truck || truck.label || '—',
        truckId: truck.truckId || truck.id,
        trips:
          truck.trips != null || truck.tripCount != null
            ? Number(truck.trips || truck.tripCount || 0)
            : null,
        revenue: Number(truck.revenueEarned || truck.revenue || 0),
        tripCost:
          truck.tripCosts != null || truck.tripCost != null
            ? Number(truck.tripCosts || truck.tripCost || 0)
            : Number(truck.revenueEarned || truck.revenue || 0) -
              Number(truck.profit || 0),
      }))
    : []

  const truckSummary = Array.isArray(profitReport.truckSummary)
    ? profitReport.truckSummary.map((truck) => ({
        id: truck.truckId || truck.id,
        truckNumber: truck.truckNumber || truck.truck || truck.label || '—',
        trips: Number(truck.trips || truck.tripCount || 0),
        revenue: Number(truck.revenueEarned || truck.revenue || 0),
        tripCosts: Number(truck.tripCosts || truck.tripCost || 0),
        directProfit: Number(truck.directProfit || truck.profit || 0),
        repairs: Number(truck.repairs || truck.repairsCost || 0),
        tyres: Number(truck.tyres || truck.tyresCost || 0),
        overhead: Number(truck.overhead || truck.overheadCost || 0),
        netProfit: Number(truck.netProfit || 0),
      }))
    : Array.isArray(profitReport.trucks)
    ? profitReport.trucks.map((truck) => ({
        id: truck.truckId || truck.id,
        truckNumber: truck.truckNumber || truck.truck || truck.label || '—',
        trips: Number(truck.trips || truck.tripCount || 0),
        revenue: Number(truck.revenueEarned || truck.revenue || 0),
        tripCosts: Number(truck.tripCosts || truck.tripCost || 0),
        directProfit: Number(truck.directProfit || truck.profit || 0),
        repairs: Number(truck.repairs || truck.repairsCost || 0),
        tyres: Number(truck.tyres || truck.tyresCost || 0),
        overhead: Number(truck.overhead || truck.overheadCost || 0),
        netProfit: Number(truck.netProfit || 0),
      }))
    : []

  const truckSummaryMap = useMemo(() => {
    const map = new Map()
    truckSummary.forEach((entry) => {
      if (!entry.truckNumber && !entry.id) return
      map.set(entry.truckNumber || entry.id, entry)
      if (entry.id) map.set(entry.id, entry)
    })
    return map
  }, [truckSummary])

  const fuelHeavyTrips = Array.isArray(operatingReport.highestCostTrips)
    ? operatingReport.highestCostTrips
        .map((trip) => {
        const fuel = Number(trip.fuel || trip.fuelCost || 0)
        const tolls = Number(trip.tolls || trip.tollCost || 0)
        const driver = Number(trip.driver || trip.driverCost || 0)
        const totalTripCost = Number(
          trip.totalTripCost || trip.tripCost || fuel + tolls + driver,
        )
        const revenue = Number(trip.revenueEarned || trip.revenue || trip.freightAmount || 0)
        return {
          id: trip.tripId || trip.id,
          route:
            trip.route ||
            (trip.fromLocation || trip.from || trip.fromCity
              ? `${trip.fromLocation || trip.from || trip.fromCity} → ${
                  trip.toLocation || trip.to || trip.toCity || ''
                }`
              : '—'),
          truckNumber: trip.truckNumber || trip.truck?.truckNumber || '—',
          fuel,
          tolls,
          driver,
          totalTripCost,
          revenue,
        }
      })
        .filter((trip) => trip.totalTripCost > 0)
    : []

  const overheadTrucks = Array.isArray(operatingReport.highestOverheadTrucks)
    ? operatingReport.highestOverheadTrucks.map((truck) => ({
        id: truck.truckId || truck.id,
        truckNumber: truck.truckNumber || truck.truck || truck.label || '—',
        repairs: Number(truck.repairs || truck.repairsCost || 0),
        tyres: Number(truck.tyres || truck.tyresCost || 0),
        overhead: Number(truck.overhead || truck.overheadCost || 0),
      }))
    : []

  const showEmpty =
    !isLoading &&
    (Array.isArray(overview.series) ? overview.series.length === 0 : true) &&
    revenueAccrual === 0 &&
    cashReceived === 0

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
        activePath="/app/reports"
        onHamburgerClick={() => setIsDrawerOpen(true)}
        avatarVariant="brand"
        stickyDesktop
      />
      <MobileNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        active="Reports"
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
          active="Reports"
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
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Reports</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Track performance across trips.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === tab
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-slate-200 text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="flex items-center justify-between gap-4">
                <span>{error.message || 'Failed to load reports.'}</span>
                <button
                  type="button"
                  className="text-sm font-semibold text-rose-700"
                  onClick={() => refetch().catch(() => {})}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="sticky top-[72px] z-10 hidden items-center gap-3 rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] lg:flex">
            <div className="flex items-center gap-2">
              <input
                name="from"
                type="date"
                value={fromDate}
                onChange={handleDateChange(setFromDate)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              />
              <span className="text-sm text-slate-400">to</span>
              <input
                name="to"
                type="date"
                value={toDate}
                onChange={handleDateChange(setToDate)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              />
            </div>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              {['day', 'week', 'month'].map((mode) => (
                <option key={mode} value={mode}>
                  Group by {mode}
                </option>
              ))}
            </select>
            <select
              value={truckFilter}
              onChange={(event) => setTruckFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              {truckOptions.map((truck) => (
                <option key={truck.value} value={truck.value}>
                  {truck.label}
                </option>
              ))}
            </select>
            <select
              value={partyFilter}
              onChange={(event) => setPartyFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            >
              {partyOptions.map((party) => (
                <option key={party.value} value={party.value}>
                  {party.label}
                </option>
              ))}
            </select>
            <button
              className="text-sm font-semibold text-slate-500"
              type="button"
              onClick={() => {
                setFromDate(toInputDate(startOfLast30Days()))
                setToDate(toInputDate(new Date()))
                setGroupBy('month')
                setTruckFilter('All')
                setPartyFilter('All')
              }}
            >
              Clear filters
            </button>
          </div>

          <div className="flex items-center justify-between lg:hidden">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              type="button"
              onClick={() => setShowFilters(true)}
            >
              Filters
            </button>
            <button
              className="text-sm font-semibold text-slate-500"
              type="button"
              onClick={() => {
                setFromDate(toInputDate(startOfLast30Days()))
                setToDate(toInputDate(new Date()))
                setGroupBy('month')
                setTruckFilter('All')
                setPartyFilter('All')
              }}
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {showEmpty ? (
              <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
                  📊
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#111827]">
                  No data for selected filters.
                </h2>
                <p className="mt-2 text-sm text-[#6B7280]">Try changing filters.</p>
                <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => navigateTo('/app/trips/new')}
                  >
                    Create trip
                  </button>
                  {trucks.length === 0 && (
                    <button
                      className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                      type="button"
                      onClick={() => navigateTo('/trucks/new')}
                    >
                      Add your first truck
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'Overview' && (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Revenue (Accrual)
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(revenueAccrual)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Last 30 days</p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Cash received
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(cashReceived)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Last 30 days</p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Operating cost
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(tripCost + overheadCost)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Fuel + toll + driver + repairs + tyres
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Net profit
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(netProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#E9EEF5] bg-white p-4 text-sm text-slate-600 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-xs font-semibold uppercase text-slate-400">
                          Cost breakdown
                        </span>
                        <span>Fuel {formatCurrency(fuelCost)}</span>
                        <span>Toll {formatCurrency(tollCost)}</span>
                        <span>Driver {formatCurrency(driverCost)}</span>
                        <span>Repairs {formatCurrency(repairsCost)}</span>
                        <span>Tyres {formatCurrency(tyresCost)}</span>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <h3 className="text-sm font-semibold text-[#111827]">Profit trend</h3>
                        <div className="mt-4 h-40">
                          <ChartErrorBoundary
                            fallback={
                              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                                Chart unavailable
                              </div>
                            }
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip content={renderOperatingTooltip} />
                                <Line
                                  type="monotone"
                                  dataKey="directProfit"
                                  stroke="#2563EB"
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="netProfit"
                                  stroke="#10B981"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </ChartErrorBoundary>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <h3 className="text-sm font-semibold text-[#111827]">
                          Operating cost vs Revenue
                        </h3>
                        <div className="mt-4 h-40">
                          <ChartErrorBoundary
                            fallback={
                              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                                Chart unavailable
                              </div>
                            }
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={operatingChartData.length ? operatingChartData : chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip content={renderOperatingTooltip} />
                                <Bar
                                  dataKey="operatingCost"
                                  name="Operating cost"
                                  fill="#F59E0B"
                                  radius={[6, 6, 0, 0]}
                                />
                                <Bar
                                  dataKey="accrualRevenue"
                                  name="Revenue (Accrual)"
                                  fill="#2563EB"
                                  radius={[6, 6, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartErrorBoundary>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Pending settlement
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(pendingSettlementTotal)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">All trips</p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Parties with pending
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {partiesWithPending}
                        </p>
                      </div>
                    </div>

                    {topTrucks.length > 0 && (
                      <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <h3 className="text-sm font-semibold text-[#111827]">Top trucks</h3>
                        <div className="mt-4 space-y-3 lg:hidden">
                          {topTrucks.map((truck) => {
                            const summary =
                              truckSummaryMap.get(truck.truckId) ||
                              truckSummaryMap.get(truck.truck)
                            const trips =
                              summary?.trips ??
                              truck.trips ??
                              tripCountByTruck.get(truck.truckId) ??
                              tripCountByTruck.get(truck.truck)
                            const tripCost =
                              summary?.tripCosts ??
                              truck.tripCost ??
                              truck.revenue - Number(summary?.directProfit || 0)
                            return (
                              <div
                                key={truck.truck}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#111827]">{truck.truck}</span>
                                  <span className="text-xs text-slate-400">
                                    {trips == null ? '— trips' : `${trips} trips`}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                  <span>Revenue</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(truck.revenue)}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                                  <span>Trip costs</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(tripCost)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-4 hidden grid-cols-[1fr_1fr_1fr_1fr] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                          <span>Truck</span>
                          <span>Trips</span>
                          <span>Revenue</span>
                          <span>Trip costs</span>
                        </div>
                        <div className="mt-3 hidden space-y-2 lg:block">
                          {topTrucks.map((truck) => {
                            const summary =
                              truckSummaryMap.get(truck.truckId) ||
                              truckSummaryMap.get(truck.truck)
                            const trips =
                              summary?.trips ??
                              truck.trips ??
                              tripCountByTruck.get(truck.truckId) ??
                              tripCountByTruck.get(truck.truck)
                            const tripCost =
                              summary?.tripCosts ?? truck.tripCost ?? truck.revenue - Number(summary?.directProfit || 0)
                            return (
                              <div
                                key={truck.truck}
                                className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-3 text-sm text-slate-600"
                              >
                                <span className="font-semibold text-[#111827]">{truck.truck}</span>
                                <span>{trips == null ? '—' : trips}</span>
                                <span>{formatCurrency(truck.revenue)}</span>
                                <span>{formatCurrency(tripCost)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'Profit' && (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Profit (Direct)
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(directProfit)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Truck overhead
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(overheadCost)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Profit (Net)
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(netProfit)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">Net margin</p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {revenueAccrual > 0
                            ? `${Math.round((netProfit / revenueAccrual) * 100)}%`
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Direct profit uses trip costs. Net profit also includes truck repairs & tyres for the period.
                    </p>
                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#111827]">Profit trend</h3>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          {['Direct', 'Net'].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setProfitMode(mode)}
                              className={`rounded-full px-3 py-1 ${
                                profitMode === mode
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'border border-slate-200 text-slate-500'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 h-40">
                        <ChartErrorBoundary
                          fallback={
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                              Chart unavailable
                            </div>
                          }
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                formatter={(value, name) => {
                                  const label = name === 'directProfit' ? 'Profit (Direct)' : name === 'netProfit' ? 'Profit (Net)' : name
                                  return [formatCurrency(value), label]
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey={profitMode === 'Net' ? 'netProfit' : 'directProfit'}
                                stroke={profitMode === 'Net' ? '#10B981' : '#2563EB'}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartErrorBoundary>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h3 className="text-sm font-semibold text-[#111827]">Trips profit breakdown</h3>
                      <div className="mt-4 space-y-3 lg:hidden">
                        {filteredTrips.map((trip) => {
                          const revenue = Number(
                            trip.revenueEarned || trip.revenue || trip.freightAmount || 0,
                          )
                          const fuel = Number(trip.fuel || trip.fuelCost || 0)
                          const tolls = Number(trip.tolls || trip.tollCost || 0)
                          const driver = Number(trip.driver || trip.driverCost || 0)
                          const operatingCost = fuel + tolls + driver
                          const profit = Number(trip.directProfit || trip.profit || revenue - operatingCost)
                          const status = (trip.status || 'ACTIVE').toUpperCase()
                          const routeFrom = trip.fromLocation || trip.from || trip.fromCity || ''
                          const routeTo = trip.toLocation || trip.to || trip.toCity || ''
                          const tripCode = trip.tripCode || trip.code || trip.id || '—'
                          const truckNumber = trip.truckNumber || trip.truck?.truckNumber || '—'
                          return (
                            <div
                              key={trip.id || tripCode}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-[#111827]">
                                    {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : '—'}
                                  </p>
                                  <p className="text-xs text-slate-400">{tripCode}</p>
                                  <p className="mt-1 text-xs text-slate-400">{truckNumber}</p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    status === 'COMPLETED'
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {status === 'COMPLETED' ? 'Completed' : 'Active'}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Revenue</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(revenue)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Direct profit</span>
                                  <span className={`text-sm font-semibold ${profit < 0 ? 'text-rose-500' : 'text-[#111827]'}`}>
                                    {formatCurrency(profit)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Fuel</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(fuel)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Toll</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(tolls)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Driver</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(driver)}
                                  </span>
                                </div>
                                <button
                                  className="text-xs font-semibold text-[#2563EB] text-right"
                                  type="button"
                                  onClick={() => navigateTo(`/app/trips/${trip.id || trip.tripId}`)}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-4 hidden grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                        <span>Trip</span>
                        <span>Truck</span>
                        <span>Revenue</span>
                        <span>Fuel</span>
                        <span>Toll</span>
                        <span>Driver</span>
                        <span>Direct profit</span>
                        <span>Status</span>
                        <span></span>
                      </div>
                      <div className="mt-3 hidden space-y-2 lg:block">
                        {filteredTrips.map((trip) => {
                          const revenue = Number(
                            trip.revenueEarned || trip.revenue || trip.freightAmount || 0,
                          )
                          const fuel = Number(trip.fuel || trip.fuelCost || 0)
                          const tolls = Number(trip.tolls || trip.tollCost || 0)
                          const driver = Number(trip.driver || trip.driverCost || 0)
                          const operatingCost = fuel + tolls + driver
                          const profit = Number(trip.directProfit || trip.profit || revenue - operatingCost)
                          const status = (trip.status || 'ACTIVE').toUpperCase()
                          const routeFrom = trip.fromLocation || trip.from || trip.fromCity || ''
                          const routeTo = trip.toLocation || trip.to || trip.toCity || ''
                          const tripCode = trip.tripCode || trip.code || trip.id || '—'
                          const truckNumber = trip.truckNumber || trip.truck?.truckNumber || '—'
                          return (
                            <div
                              key={trip.id || tripCode}
                              className="grid grid-cols-[2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr_1fr_80px] items-center gap-3 text-sm text-slate-600"
                            >
                              <div>
                                <p className="font-semibold text-[#111827]">
                                  {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : '—'}
                                </p>
                                <p className="text-xs text-slate-400">{tripCode}</p>
                              </div>
                              <span>{truckNumber}</span>
                              <span>{formatCurrency(revenue)}</span>
                              <span>{formatCurrency(fuel)}</span>
                              <span>{formatCurrency(tolls)}</span>
                              <span>{formatCurrency(driver)}</span>
                              <span className={profit < 0 ? 'text-rose-500' : ''}>
                                {formatCurrency(profit)}
                              </span>
                              <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  status === 'COMPLETED'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {status === 'COMPLETED' ? 'Completed' : 'Active'}
                              </span>
                              <button
                                className="text-xs font-semibold text-[#2563EB]"
                                type="button"
                                onClick={() => navigateTo(`/app/trips/${trip.id || trip.tripId}`)}
                              >
                                View
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h3 className="text-sm font-semibold text-[#111827]">Truck profit summary</h3>
                      <div className="mt-4 space-y-3 lg:hidden">
                        {truckSummary.map((truck) => {
                          const tripCostValue = Number(truck.tripCosts || 0)
                          const overhead = Number(truck.overhead || 0)
                          const net = Number(truck.netProfit || truck.revenue - (tripCostValue + overhead))
                          return (
                            <div
                              key={truck.id || truck.truckNumber}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#111827]">{truck.truckNumber}</span>
                                <span className="text-xs text-slate-400">{truck.trips} trips</span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Revenue</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(truck.revenue)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Trip costs</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(tripCostValue)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Overhead</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(overhead)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Net</span>
                                  <span className={`text-sm font-semibold ${net < 0 ? 'text-rose-500' : 'text-[#111827]'}`}>
                                    {formatCurrency(net)}
                                  </span>
                                </div>
                                <button
                                  className="text-xs font-semibold text-[#2563EB] text-right col-span-2"
                                  type="button"
                                  onClick={() => {
                                    if (!truck.id) return
                                    navigateTo(`/trucks/${truck.id}`)
                                  }}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-4 hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                        <span>Truck</span>
                        <span>Trips</span>
                        <span>Revenue</span>
                        <span>Trip costs</span>
                        <span>Direct</span>
                        <span>Repairs</span>
                        <span>Tyres</span>
                        <span>Overhead</span>
                        <span>Net</span>
                        <span></span>
                      </div>
                      <div className="mt-3 hidden space-y-2 lg:block">
                        {truckSummary.map((truck) => {
                          const tripCostValue = Number(truck.tripCosts || 0)
                          const overhead = Number(truck.overhead || 0)
                          const net = Number(truck.netProfit || truck.revenue - (tripCostValue + overhead))
                          return (
                            <div
                              key={truck.id || truck.truckNumber}
                              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] items-center gap-3 text-sm text-slate-600"
                            >
                              <span className="font-semibold text-[#111827]">{truck.truckNumber}</span>
                              <span>{truck.trips}</span>
                              <span>{formatCurrency(truck.revenue)}</span>
                              <span>{formatCurrency(tripCostValue)}</span>
                              <span>{formatCurrency(truck.directProfit)}</span>
                              <span>{formatCurrency(truck.repairs)}</span>
                              <span>{formatCurrency(truck.tyres)}</span>
                              <span>{formatCurrency(overhead)}</span>
                              <span className={net < 0 ? 'text-rose-500' : ''}>
                                {formatCurrency(net)}
                              </span>
                              <button
                                className="text-xs font-semibold text-[#2563EB]"
                                type="button"
                                onClick={() => {
                                  if (!truck.id) return
                                  navigateTo(`/trucks/${truck.id}`)
                                }}
                              >
                                View
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'Operating vs Revenue' && (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Revenue
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(revenueAccrual)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Total costs
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {formatCurrency(tripCost + overheadCost)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Cost % of Revenue
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {costShare === null ? '—' : `${costShare}%`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Avg cost / trip
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[#111827]">
                          {tripCount > 0
                            ? formatCurrency((tripCost + overheadCost) / tripCount)
                            : formatCurrency(0)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                        <h3 className="text-sm font-semibold text-[#111827]">
                          Operating cost vs Revenue
                        </h3>
                      <div className="mt-4 h-56">
                        <ChartErrorBoundary
                          fallback={
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                              Chart unavailable
                            </div>
                          }
                        >
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={operatingChartData.length ? operatingChartData : chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip content={renderOperatingTooltip} />
                              <Bar dataKey="operatingCost" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                              <Line
                                type="monotone"
                                dataKey="accrualRevenue"
                                stroke="#2563EB"
                                strokeWidth={2}
                                dot={false}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartErrorBoundary>
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h3 className="text-sm font-semibold text-[#111827]">
                        Trips with highest trip costs
                      </h3>
                      <div className="mt-4 space-y-3 lg:hidden">
                        {fuelHeavyTrips.length === 0 ? (
                          <p className="text-sm text-slate-400">No trip cost data available.</p>
                        ) : (
                          fuelHeavyTrips.map((trip) => (
                            <div
                              key={trip.id}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#111827]">{trip.route}</span>
                                <span className="text-xs text-slate-400">{trip.truckNumber}</span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Fuel</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(trip.fuel)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Toll</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(trip.tolls)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Driver</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(trip.driver)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Total</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(trip.totalTripCost)}
                                  </span>
                                </div>
                                <button
                                  className="text-xs font-semibold text-[#2563EB] text-right col-span-2"
                                  type="button"
                                  onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-4 hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                        <span>Trip</span>
                        <span>Truck</span>
                        <span>Fuel</span>
                        <span>Toll</span>
                        <span>Driver</span>
                        <span>Total</span>
                        <span />
                      </div>
                      <div className="mt-3 hidden space-y-2 lg:block">
                        {fuelHeavyTrips.length === 0 ? (
                          <p className="text-sm text-slate-400">No trip cost data available.</p>
                        ) : (
                          fuelHeavyTrips.map((trip) => (
                            <div
                              key={trip.id}
                              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_80px] items-center gap-3 text-sm text-slate-600"
                            >
                              <span className="font-semibold text-[#111827]">{trip.route}</span>
                              <span>{trip.truckNumber}</span>
                              <span>{formatCurrency(trip.fuel)}</span>
                              <span>{formatCurrency(trip.tolls)}</span>
                              <span>{formatCurrency(trip.driver)}</span>
                              <span>{formatCurrency(trip.totalTripCost)}</span>
                              <button
                                className="text-xs font-semibold text-[#2563EB]"
                                type="button"
                                onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                              >
                                View
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h3 className="text-sm font-semibold text-[#111827]">
                        Highest overhead trucks
                      </h3>
                      <div className="mt-4 space-y-3 lg:hidden">
                        {overheadTrucks.length === 0 ? (
                          <p className="text-sm text-slate-400">No overhead data available.</p>
                        ) : (
                          overheadTrucks.map((truck) => (
                            <div
                              key={truck.id || truck.truckNumber}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#111827]">
                                  {truck.truckNumber}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Repairs</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(truck.repairs)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Tyres</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(truck.tyres)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Overhead</span>
                                  <span className="text-sm font-semibold text-[#111827]">
                                    {formatCurrency(truck.overhead)}
                                  </span>
                                </div>
                                <button
                                  className="text-xs font-semibold text-[#2563EB] text-right col-span-2"
                                  type="button"
                                  onClick={() => {
                                    if (!truck.id) return
                                    navigateTo(`/trucks/${truck.id}`)
                                  }}
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-4 hidden grid-cols-[1fr_1fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                        <span>Truck</span>
                        <span>Repairs</span>
                        <span>Tyres</span>
                        <span>Overhead</span>
                        <span />
                      </div>
                      <div className="mt-3 hidden space-y-2 lg:block">
                        {overheadTrucks.length === 0 ? (
                          <p className="text-sm text-slate-400">No overhead data available.</p>
                        ) : (
                          overheadTrucks.map((truck) => (
                            <div
                              key={truck.id || truck.truckNumber}
                              className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] items-center gap-3 text-sm text-slate-600"
                            >
                              <span className="font-semibold text-[#111827]">
                                {truck.truckNumber}
                              </span>
                              <span>{formatCurrency(truck.repairs)}</span>
                              <span>{formatCurrency(truck.tyres)}</span>
                              <span>{formatCurrency(truck.overhead)}</span>
                              <button
                                className="text-xs font-semibold text-[#2563EB]"
                                type="button"
                                onClick={() => {
                                  if (!truck.id) return
                                  navigateTo(`/trucks/${truck.id}`)
                                }}
                              >
                                View
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 lg:hidden">
          <div className="w-full rounded-t-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#111827]">Filters</h2>
              <button
                className="text-sm font-semibold text-slate-500"
                type="button"
                onClick={() => setShowFilters(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  name="from"
                  type="date"
                  value={fromDate}
                  onChange={handleDateChange(setFromDate)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                />
                <input
                  name="to"
                  type="date"
                  value={toDate}
                  onChange={handleDateChange(setToDate)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                />
              </div>
              <select
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                {['day', 'week', 'month'].map((mode) => (
                  <option key={mode} value={mode}>
                    Group by {mode}
                  </option>
                ))}
              </select>
              <select
                value={truckFilter}
                onChange={(event) => setTruckFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                {truckOptions.map((truck) => (
                  <option key={truck.value} value={truck.value}>
                    {truck.label}
                  </option>
                ))}
              </select>
              <select
                value={partyFilter}
                onChange={(event) => setPartyFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                {partyOptions.map((party) => (
                  <option key={party.value} value={party.value}>
                    {party.label}
                  </option>
                ))}
              </select>
              <button
                className="text-sm font-semibold text-slate-500"
                type="button"
                onClick={() => {
                  setFromDate(toInputDate(startOfLast30Days()))
                  setToDate(toInputDate(new Date()))
                  setGroupBy('month')
                  setTruckFilter('All')
                  setPartyFilter('All')
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
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
