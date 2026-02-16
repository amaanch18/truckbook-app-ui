import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useSettlements } from '../../hooks/useSettlements.js'
import { useParties } from '../../hooks/useParties.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { normalizeError } from '../../api/index.js'

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

export default function SettlementDetailsPage({ settlementId }) {
  const { getById } = useSettlements({}, { auto: false })
  const { data: parties } = useParties()
  const { data: trucks } = useTrucks()
  const { data: trips } = useTrips()
  const { me } = useAuthSession()
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navToast, setNavToast] = useState('')

  const businessName = useMemo(() => {
    return me?.orgName || ''
  }, [me])

  const hasTrucks = (trucks || []).length > 0
  const hasTrips = true

  useEffect(() => {
    if (!settlementId) {
      setStatus('not-found')
      return
    }
    setStatus('loading')
    setError('')
    getById(settlementId)
      .then((data) => {
        setDetail(data)
        setStatus('ready')
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setError(normalized.message || 'Failed to load settlement')
        setStatus('not-found')
      })
  }, [settlementId, getById])

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

  const settlement = detail?.settlement || null
  const allocations = detail?.allocations || []

  const party = useMemo(() => {
    if (!settlement?.partyId) return null
    return parties.find((item) => item.id === settlement.partyId) || null
  }, [settlement, parties])

  const truck = useMemo(() => {
    if (!settlement?.truckId) return null
    return trucks.find((item) => item.id === settlement.truckId) || null
  }, [settlement, trucks])

  const allocationRows = useMemo(() => {
    return allocations.map((allocation) => {
      const trip = trips.find((item) => item.id === allocation.tripId)
      const truck = trip?.truckId ? trucks.find((item) => item.id === trip.truckId) : null
      const route =
        allocation.route || (trip ? `${trip.fromLocation || trip.from || '—'} → ${trip.toLocation || trip.to || '—'}` : '—')
      const pendingAfter =
        allocation.pendingAmount != null
          ? Number(allocation.pendingAmount || 0)
          : trip?.outstandingAmount != null
            ? Number(trip.outstandingAmount || 0)
            : null
      return {
        id: allocation.tripId,
        route,
        tripId: allocation.tripId,
        truckNumber: truck?.truckNumber || trip?.truckNumber || '—',
        allocatedAmount: Number(allocation.amountApplied || 0),
        pendingAfter,
      }
    })
  }, [allocations, trips, trucks])

  const allocatedTotal = allocationRows.reduce(
    (sum, row) => sum + Number(row.allocatedAmount || 0),
    0,
  )
  const unallocatedAmount = Math.max(Number(settlement?.receivedAmount || 0) - allocatedTotal, 0)
  const statusLabel =
    settlement && allocatedTotal < Number(settlement.receivedAmount || 0)
      ? 'Unallocated'
      : 'Allocated'

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
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-slate-500"
            onClick={() => navigateTo('/app/settlements')}
          >
            ← Settlements
          </button>

          {status === 'not-found' && (
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <h1 className="text-2xl font-semibold text-[#111827]">Settlement not found</h1>
              <p className="mt-2 text-sm text-slate-500">{error || 'We couldn’t find this settlement record.'}</p>
              <button
                className="mt-4 h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                type="button"
                onClick={() => navigateTo('/app/settlements')}
              >
                Back to Settlements
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-slate-500">Loading settlement details…</p>
            </div>
          )}

          {status === 'ready' && settlement && (
            <div className="grid flex-1 gap-6 lg:grid-cols-[1.5fr_0.7fr] lg:overflow-hidden">
              <div className="space-y-6 overflow-y-auto pr-1">
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Settlement</p>
                      <h1 className="mt-1 text-2xl font-semibold text-[#111827]">
                        {settlement.settlementCode || settlement.id}
                      </h1>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(settlement.settlementDate)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusLabel === 'Allocated'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Party</p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {party?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Truck</p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {settlement.truckId ? truck?.truckNumber || '—' : 'Multiple trucks'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Amount</p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {formatCurrency(settlement.receivedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Mode</p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {settlement.paymentMode || '—'}
                      </p>
                      {settlement.reference && (
                        <p className="text-xs text-slate-400">{settlement.reference}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <h2 className="text-sm font-semibold text-[#111827]">Allocations</h2>
                  <div className="mt-4 hidden grid-cols-[2fr_1fr_1fr_1fr_80px] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase text-slate-400 lg:grid">
                    <span>Trip</span>
                    <span>Truck</span>
                    <span>Allocated</span>
                    <span>Pending after</span>
                    <span />
                  </div>
                  <div className="mt-3 space-y-2">
                    {allocationRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-1 items-center gap-2 rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-600 lg:grid-cols-[2fr_1fr_1fr_1fr_80px]"
                      >
                        <div>
                          <p className="font-semibold text-[#111827]">{row.route}</p>
                          <p className="text-xs text-slate-400">{row.tripId}</p>
                        </div>
                        <span className="text-sm text-slate-600">{row.truckNumber}</span>
                        <span className="font-semibold text-[#111827]">
                          {formatCurrency(row.allocatedAmount)}
                        </span>
                        <span>{row.pendingAfter ? formatCurrency(row.pendingAfter) : '—'}</span>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#2563EB]"
                          onClick={() => navigateTo(`/app/trips/${row.tripId}`)}
                        >
                          View
                        </button>
                      </div>
                    ))}
                    {allocationRows.length === 0 && (
                      <p className="text-sm text-slate-500">No trips allocated yet.</p>
                    )}
                  </div>
                </div>

                {settlement.notes && (
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 text-sm text-slate-600 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-[#111827]">Notes</h2>
                    <p className="mt-2">{settlement.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit lg:col-start-2 lg:row-start-1">
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <h3 className="text-sm font-semibold text-[#111827]">Summary</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Allocated</span>
                      <span className="font-semibold text-[#111827]">
                        {formatCurrency(allocatedTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Unallocated</span>
                      <span className="font-semibold text-[#111827]">
                        {formatCurrency(unallocatedAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Unallocated Amount will be used in future settlements.
                    </p>
                    <div className="flex items-center justify-between">
                      <span>Trips covered</span>
                      <span className="font-semibold text-[#111827]">
                        {allocationRows.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
