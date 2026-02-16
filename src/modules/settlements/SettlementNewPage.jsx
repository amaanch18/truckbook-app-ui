import { useCallback, useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useParties } from '../../hooks/useParties.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useSettlements } from '../../hooks/useSettlements.js'
import { useOutstanding } from '../../hooks/useOutstanding.js'
import { normalizeError, partiesApi, toDdMmYyyy } from '../../api/index.js'

const STEPS = ['Party & Truck', 'Select Trips', 'Allocate']
const MODES = ['Cash', 'UPI', 'Bank', 'Cheque', 'Other']
const DRAFT_KEY = 'truckbook_settlement_draft'

const MODE_MAP = {
  Cash: 'CASH',
  UPI: 'UPI',
  Bank: 'BANK',
  Cheque: 'CHEQUE',
  Other: 'OTHER',
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

const getTripDate = (trip) => trip.startDate || trip.date || ''

const defaultDraft = () => ({
  scope: 'PARTY_LEVEL',
  partyId: null,
  truckId: null,
  settlementDate: toInputDate(new Date()),
  mode: 'Cash',
  referenceNo: '',
  notes: '',
  receivedAmount: '',
  selectedTripIds: [],
  allocations: {},
  lastStep: 1,
})

const loadDraft = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    if (!stored) return defaultDraft()
    return { ...defaultDraft(), ...stored }
  } catch (error) {
    return defaultDraft()
  }
}

const saveDraft = (draft) => {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const resetDraft = () => {
  sessionStorage.removeItem(DRAFT_KEY)
}

export default function SettlementNewPage() {
  const { data: trucks } = useTrucks()
  const { data: parties, create: createParty } = useParties()
  const { create: createSettlement, allocate } = useSettlements({}, { auto: false })
  const { getPartyTrips, getPartyTrucks, getTruckTrips } = useOutstanding('party', {
    auto: false,
  })
  const { me } = useAuthSession()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [draft, setDraft] = useState(() => loadDraft())
  const [step, setStep] = useState(draft.lastStep || 1)
  const [pendingOnly, setPendingOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [truckFilter, setTruckFilter] = useState('All')
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [partyPhone, setPartyPhone] = useState('')
  const [partyNotes, setPartyNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [showScopeConfirm, setShowScopeConfirm] = useState(false)
  const [pendingScope, setPendingScope] = useState(null)
  const [trips, setTrips] = useState([])
  const [partyTrucks, setPartyTrucks] = useState([])
  const [isTripsLoading, setIsTripsLoading] = useState(false)
  const [tripsError, setTripsError] = useState('')
  const [partyCredit, setPartyCredit] = useState(0)
  const [isCreditLoading, setIsCreditLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(false)

  const businessName = useMemo(() => me?.orgName || '', [me])

  const hasTrucks = (trucks || []).length > 0
  const hasTrips = true

  useEffect(() => {
    saveDraft({ ...draft, lastStep: step })
  }, [draft, step])

  useEffect(() => {
    if (!draft.partyId) {
      setTrips([])
      setPartyTrucks([])
      setPartyCredit(0)
      return
    }
    setIsTripsLoading(true)
    setTripsError('')
    const loader =
      draft.scope === 'SINGLE_TRUCK'
        ? draft.truckId
          ? getTruckTrips(draft.truckId)
          : Promise.resolve([])
        : getPartyTrips(draft.partyId)
    loader
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setTrips(list)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setTripsError(normalized.message || 'Failed to load trips')
        setTrips([])
      })
      .finally(() => setIsTripsLoading(false))

    getPartyTrucks(draft.partyId)
      .then((rows) => setPartyTrucks(Array.isArray(rows) ? rows : []))
      .catch(() => setPartyTrucks([]))
  }, [draft.partyId, draft.truckId, draft.scope, getPartyTrips, getTruckTrips, getPartyTrucks])

  const refreshCredit = useCallback(() => {
    if (!draft.partyId) return Promise.resolve()
    setIsCreditLoading(true)
    return partiesApi
      .getPartyCredit(draft.partyId)
      .then((data) => setPartyCredit(Number(data?.creditAmount || 0)))
      .catch(() => setPartyCredit(0))
      .finally(() => setIsCreditLoading(false))
  }, [draft.partyId])

  useEffect(() => {
    refreshCredit()
  }, [refreshCredit])

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

  const selectedParty = parties.find((party) => party.id === draft.partyId)
  const selectedTruck = trucks.find((truck) => truck.id === draft.truckId)

  const mapTrip = (trip, index) => {
    const truck = trip.truckId ? trucks.find((item) => item.id === trip.truckId) : null
    return {
      id: trip.tripId || trip.id || trip.tripCode || `${trip.from || trip.fromLocation || 'trip'}-${trip.to || trip.toLocation || 'route'}-${trip.startDate || index}-${index}`,
      tripCode: trip.tripCode || trip.code || '—',
      from: trip.fromLocation || trip.from || '—',
      to: trip.toLocation || trip.to || '—',
      startDate: trip.startDate,
      freight: Number(trip.freightAmount || trip.freight || 0),
      paid: Number(trip.paidAmount || 0),
      pending: Number(trip.outstandingAmount ?? trip.pendingAmount ?? 0),
      status: trip.billingStatus || trip.status || 'ACTIVE',
      truckId: trip.truckId,
      truckNumber: trip.truckNumber || truck?.truckNumber || '—',
    }
  }

  const tripOptions = useMemo(() => {
    return (trips || []).map((trip, index) => mapTrip(trip, index))
  }, [trips, trucks])

  const totalAllocatable = useMemo(
    () => Number(partyCredit || 0) + Number(draft.receivedAmount || 0),
    [partyCredit, draft.receivedAmount],
  )

  const availableTrucksForParty = useMemo(() => {
    if (!draft.partyId) return trucks
    if (partyTrucks.length > 0) {
      return partyTrucks
        .map((item) => ({
          id: item.truckId || item.id,
          truckNumber: item.truckNumber || item.name || '—',
        }))
        .filter((item) => item.id)
    }
    const ids = new Set()
    tripOptions.forEach((trip) => {
      if (trip.truckId) ids.add(trip.truckId)
    })
    return trucks.filter((truck) => ids.has(truck.id))
  }, [draft.partyId, partyTrucks, tripOptions, trucks])

  const autoSelectTrips = (amountValue = totalAllocatable, listOverride = null) => {
    const baseList = listOverride && listOverride.length ? listOverride : tripOptions
    const sortedTrips = [...baseList].sort(
      (a, b) => new Date(getTripDate(a)) - new Date(getTripDate(b)),
    )
    let remaining = amountValue > 0 ? amountValue : 0
    const selected = []
    const allocations = {}
    sortedTrips.forEach((trip) => {
      selected.push(trip.id)
      if (amountValue > 0 && remaining > 0 && trip.pending > 0) {
        const apply = Math.min(trip.pending, remaining)
        allocations[trip.id] = Number(apply.toFixed(2))
        remaining -= apply
      }
    })
    setDraft((prev) => ({
      ...prev,
      selectedTripIds: selected,
      allocations: amountValue > 0 ? allocations : prev.allocations,
    }))
    setErrors((prev) => ({ ...prev, trips: '' }))
  }

  const filteredTrips = useMemo(() => {
    return tripOptions.filter((trip) => {
      const status = (trip.status || 'ACTIVE').toUpperCase()
      if (statusFilter !== 'All' && statusFilter.toUpperCase() !== status) return false
      if (pendingOnly && trip.pending <= 0) return false
      if (draft.scope === 'PARTY_LEVEL' && truckFilter !== 'All') {
        if (trip.truckId !== truckFilter) return false
      }
      if (searchQuery.trim()) {
        const haystack = `${trip.from} ${trip.to} ${trip.tripCode}`.toLowerCase()
        if (!haystack.includes(searchQuery.trim().toLowerCase())) return false
      }
      return true
    })
  }, [tripOptions, statusFilter, pendingOnly, searchQuery, draft.scope, truckFilter])

  useEffect(() => {
    if (step !== 2 || !autoSelectEnabled) return
    autoSelectTrips(totalAllocatable, filteredTrips)
  }, [step, filteredTrips, autoSelectEnabled, totalAllocatable])

  const totalPendingSelected = useMemo(() => {
    return tripOptions.reduce((sum, trip) => {
      if (!draft.selectedTripIds.includes(trip.id)) return sum
      return sum + Number(trip.pending || 0)
    }, 0)
  }, [tripOptions, draft.selectedTripIds])

  const totalAllocated = useMemo(() => {
    return Object.values(draft.allocations).reduce((sum, value) => sum + Number(value || 0), 0)
  }, [draft.allocations])

  const remainder = Math.max(totalAllocatable - totalAllocated, 0)
  const uncoveredPending = Math.max(totalPendingSelected - totalAllocated, 0)

  useEffect(() => {
    if (step !== 3) return
    const amount = totalAllocatable
    const sortedTrips = [...tripOptions]
      .filter((trip) => draft.selectedTripIds.includes(trip.id))
      .sort((a, b) => new Date(getTripDate(a)) - new Date(getTripDate(b)))
    let remaining = amount
    const nextAllocations = {}
    sortedTrips.forEach((trip) => {
      if (remaining <= 0) {
        nextAllocations[trip.id] = 0
        return
      }
      const allocation = Math.min(trip.pending, remaining)
      nextAllocations[trip.id] = Number(allocation.toFixed(2))
      remaining -= allocation
    })
    setDraft((prev) => ({ ...prev, allocations: nextAllocations }))
  }, [step, totalAllocatable, tripOptions, draft.selectedTripIds])

  const applyScopeChange = (scope) => {
    if (!scope) return
    setDraft((prev) => ({
      ...prev,
      scope,
      truckId: scope === 'PARTY_LEVEL' ? null : prev.truckId,
      selectedTripIds: [],
      allocations: {},
    }))
    setTruckFilter('All')
  }

  const handleScopeChange = (scope) => {
    if (draft.selectedTripIds.length > 0) {
      setPendingScope(scope)
      setShowScopeConfirm(true)
      return
    }
    applyScopeChange(scope)
  }

  const handleNext = () => {
    if (step === 1) {
      const nextErrors = {}
      if (!draft.partyId) nextErrors.partyId = 'Select a party'
      if (draft.scope === 'SINGLE_TRUCK' && !draft.truckId) nextErrors.truckId = 'Select a truck'
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) return
      setStep(2)
    } else if (step === 2) {
      if (draft.selectedTripIds.length === 0) {
        setErrors({ trips: 'No pending trips available.' })
        return
      }
      setErrors({})
      setStep(3)
    }
  }

  const handleBack = () => {
    setErrors({})
    setStep((prev) => Math.max(1, prev - 1))
  }

  const handleSaveParty = () => {
    if (!partyName.trim()) {
      setErrors({ partyName: 'Party name is required' })
      return
    }
    createParty({ name: partyName.trim() })
      .then((created) => {
        setDraft((prev) => ({ ...prev, partyId: created.id }))
        setShowPartyModal(false)
        setPartyName('')
        setPartyPhone('')
        setPartyNotes('')
        setErrors({})
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setErrors({ partyName: normalized.message || 'Failed to create party' })
      })
  }

  const handleSave = async () => {
    const nextErrors = {}
    if (totalAllocatable <= 0) {
      nextErrors.receivedAmount = 'Enter a valid amount'
    }
    if (!draft.settlementDate) nextErrors.settlementDate = 'Select a date'
    if (!draft.partyId) nextErrors.partyId = 'Select a party'
    if (draft.scope === 'SINGLE_TRUCK' && !draft.truckId) nextErrors.truckId = 'Select a truck'
    if (draft.mode !== 'Cash' && !draft.referenceNo.trim()) {
      nextErrors.referenceNo = 'Reference is required'
    }
    const pendingByTrip = new Map(tripOptions.map((trip) => [trip.id, Number(trip.pending || 0)]))
    const allocationsPayload = []
    let appliedTotal = 0
    Object.entries(draft.allocations).forEach(([tripId, amount]) => {
      const numeric = Number(amount || 0)
      if (numeric <= 0) return
      const pending = pendingByTrip.get(tripId) ?? 0
      if (numeric > pending) {
        nextErrors.allocations = 'Allocated amount cannot exceed pending.'
        return
      }
      allocationsPayload.push({ tripId, amountApplied: numeric })
      appliedTotal += numeric
    })

    if (appliedTotal > totalAllocatable) {
      nextErrors.allocations = 'Allocations exceed available amount (including credit).'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      partyId: draft.partyId,
      truckId: draft.scope === 'SINGLE_TRUCK' ? draft.truckId : null,
      settlementDate: toDdMmYyyy(draft.settlementDate),
      receivedAmount: Number(draft.receivedAmount || 0),
      paymentMode: MODE_MAP[draft.mode] || 'CASH',
      reference: draft.referenceNo.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    }

    try {
      const created = await createSettlement(payload)
      if (allocationsPayload.length > 0) {
        await allocate(created.id, { allocations: allocationsPayload })
        await refreshCredit()
      }
      setToast('Settlement saved')
      window.setTimeout(() => setToast(''), 2200)
      resetDraft()
      navigateTo(`/app/settlements/${created.id}`)
    } catch (err) {
      const normalized = normalizeError(err)
      setToast(normalized.message || 'Failed to save settlement')
      window.setTimeout(() => setToast(''), 2200)
    }
  }

  const saveDisabled = totalAllocatable <= 0

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

        <main className="flex flex-1 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 md:h-full md:overflow-hidden">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-slate-500"
            onClick={() => navigateTo('/app/settlements')}
          >
            ← Settlements
          </button>

          <div className="-mx-4 flex items-center gap-3 overflow-x-auto px-4 text-[11px] font-semibold uppercase text-slate-400 sm:mx-0 sm:px-0 sm:text-xs">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`flex items-center gap-2 ${step === index + 1 ? 'text-blue-600' : ''}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    step === index + 1 ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200'
                  }`}
                >
                  {index + 1}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="grid flex-1 gap-5 lg:grid-cols-[1.6fr_0.6fr] lg:gap-6 lg:overflow-hidden">
            <div className="space-y-5 lg:space-y-6 lg:overflow-y-auto lg:pr-1">
              {step === 1 && (
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-6">
                  <h2 className="text-lg font-semibold text-[#111827]">Party & Truck</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Party-level settlements can cover multiple trucks. Choose Single truck if you want to filter trips by one truck.
                  </p>

                  <div className="mt-5 flex flex-col items-stretch gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:flex-row sm:items-center sm:rounded-full">
                    <button
                      type="button"
                      onClick={() => handleScopeChange('PARTY_LEVEL')}
                      className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold ${
                        draft.scope === 'PARTY_LEVEL'
                          ? 'bg-white text-blue-600 shadow'
                          : 'text-slate-500'
                      }`}
                    >
                      All trucks (Party-level)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScopeChange('SINGLE_TRUCK')}
                      className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold ${
                        draft.scope === 'SINGLE_TRUCK'
                          ? 'bg-white text-blue-600 shadow'
                          : 'text-slate-500'
                      }`}
                    >
                      Single truck
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="required text-sm font-semibold text-[#111827]">Party</label>
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                        value={draft.partyId || ''}
                        onChange={(event) => {
                          setDraft((prev) => ({
                            ...prev,
                            partyId: event.target.value || null,
                            selectedTripIds: [],
                            allocations: {},
                          }))
                          setErrors((prev) => ({ ...prev, partyId: '' }))
                        }}
                        required
                      >
                        <option value="">Select party</option>
                        {parties.map((party) => (
                          <option key={party.id} value={party.id}>
                            {party.name}
                          </option>
                        ))}
                      </select>
                      {errors.partyId && (
                        <p className="mt-2 text-xs text-rose-500">{errors.partyId}</p>
                      )}
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-blue-600"
                        onClick={() => setShowPartyModal(true)}
                      >
                        + Add new party
                      </button>
                    </div>
                    <div>
                      <label className={`${draft.scope === 'SINGLE_TRUCK' ? 'required ' : ''}text-sm font-semibold text-[#111827]`}>Truck</label>
                      <select
                        className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                        value={draft.truckId || ''}
                        onChange={(event) => {
                          setDraft((prev) => ({
                            ...prev,
                            truckId: event.target.value || null,
                            selectedTripIds: [],
                            allocations: {},
                          }))
                          setErrors((prev) => ({ ...prev, truckId: '' }))
                        }}
                        disabled={draft.scope === 'PARTY_LEVEL'}
                        required={draft.scope === 'SINGLE_TRUCK'}
                      >
                        <option value="">{draft.scope === 'PARTY_LEVEL' ? 'All trucks' : 'Select truck'}</option>
                        {(draft.scope === 'SINGLE_TRUCK' ? availableTrucksForParty : trucks).map(
                          (truck) => (
                            <option key={truck.id} value={truck.id}>
                              {truck.truckNumber}
                            </option>
                          ),
                        )}
                      </select>
                      {errors.truckId && (
                        <p className="mt-2 text-xs text-rose-500">{errors.truckId}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#111827]">Select trips</h2>
                      <p className="mt-1 text-sm text-slate-500">Trips are auto-selected oldest first.</p>
                    </div>
                    {draft.scope === 'PARTY_LEVEL' && (
                      <select
                        className="h-10 rounded-xl border border-[#D9E2EF] px-3 text-sm"
                        value={truckFilter}
                        onChange={(event) => setTruckFilter(event.target.value)}
                      >
                        <option value="All">All trucks</option>
                        {partyTrucks.map((truck) => (
                          <option key={truck.truckId || truck.id} value={truck.truckId || truck.id}>
                            {truck.truckNumber || truck.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                    <label className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:w-auto sm:bg-transparent sm:px-0 sm:py-0 sm:border-0">
                      <input
                        type="checkbox"
                        checked={autoSelectEnabled}
                        onChange={(event) => {
                          const next = event.target.checked
                          setAutoSelectEnabled(next)
                          if (next) {
                            autoSelectTrips()
                          }
                        }}
                      />
                      Auto select trips (oldest first)
                    </label>
                    <button
                      type="button"
                      onClick={() => setPendingOnly((prev) => !prev)}
                      className={`w-full rounded-full px-3 py-2 text-xs font-semibold sm:w-auto sm:py-1 ${
                        pendingOnly ? 'bg-blue-50 text-blue-600' : 'border border-slate-200 text-slate-500'
                      }`}
                    >
                      Pending only
                    </button>
                    <select
                      className="h-10 w-full rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-600 sm:h-9 sm:w-auto"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="All">All status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                    <input
                      className="h-10 w-full flex-1 rounded-full border border-slate-200 px-4 text-xs sm:h-9 sm:w-auto"
                      placeholder="Search route or trip code"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {isTripsLoading && <p className="text-sm text-slate-400">Loading trips...</p>}
                    {tripsError && <p className="text-sm text-rose-500">{tripsError}</p>}
                    {filteredTrips.length === 0 ? (
                      <p className="text-sm text-slate-400">No pending trips found.</p>
                    ) : (
                      filteredTrips.map((trip) => (
                        <label
                          key={trip.id}
                          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={draft.selectedTripIds.includes(trip.id)}
                              disabled={autoSelectEnabled}
                              onChange={(event) => {
                                if (autoSelectEnabled) return
                                const checked = event.target.checked
                                setDraft((prev) => {
                                  const next = new Set(prev.selectedTripIds)
                                  if (checked) next.add(trip.id)
                                  else next.delete(trip.id)
                                  const allocations = { ...prev.allocations }
                                  if (!checked) delete allocations[trip.id]
                                  return { ...prev, selectedTripIds: Array.from(next), allocations }
                                })
                              }}
                            />
                            <div>
                              <p className="font-semibold text-[#111827]">
                                {trip.from} → {trip.to}
                              </p>
                              <p className="text-xs text-slate-400">{trip.tripCode}</p>
                            </div>
                          </div>
                          {draft.scope === 'PARTY_LEVEL' && (
                            <span className="text-xs text-slate-400">{trip.truckNumber}</span>
                          )}
                          <span className="text-sm font-semibold text-[#111827]">
                            {formatCurrency(trip.pending)}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {errors.trips && <p className="mt-2 text-xs text-rose-500">{errors.trips}</p>}
                </div>
              )}

              {step === 3 && (
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-6">
                  <h2 className="text-lg font-semibold text-[#111827]">Amount & Allocation</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    We’ll auto-allocate amount oldest-first. You can edit allocations.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="required text-sm font-semibold text-[#111827]">Received amount</label>
                      <input
                        className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                        value={draft.receivedAmount}
                        onChange={(event) => {
                          const value = event.target.value.replace(/^0+(?=\d)/, '')
                          setDraft((prev) => ({ ...prev, receivedAmount: value }))
                        }}
                        placeholder="e.g. 50000"
                        required
                      />
                      {errors.receivedAmount && (
                        <p className="mt-2 text-xs text-rose-500">{errors.receivedAmount}</p>
                      )}
                    </div>
                    <div>
                      <label className="required text-sm font-semibold text-[#111827]">Settlement date</label>
                      <input
                        className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                        type="date"
                        value={draft.settlementDate}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, settlementDate: event.target.value }))
                        }
                        required
                      />
                      {errors.settlementDate && (
                        <p className="mt-2 text-xs text-rose-500">{errors.settlementDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="required text-sm font-semibold text-[#111827]">Mode</label>
                    <select
                      className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                      value={draft.mode}
                      onChange={(event) => setDraft((prev) => ({ ...prev, mode: event.target.value }))}
                      required
                    >
                        {MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                    {draft.mode !== 'Cash' && (
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]">Reference</label>
                        <input
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
                          value={draft.referenceNo}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, referenceNo: event.target.value }))
                          }
                          placeholder="Transaction / UTR"
                          required
                        />
                        {errors.referenceNo && (
                          <p className="mt-2 text-xs text-rose-500">{errors.referenceNo}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Previous Credit</span>
                      <span className="font-semibold text-[#111827]">
                        {isCreditLoading ? '—' : formatCurrency(partyCredit)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Total Available to Allocate</span>
                      <span className="font-semibold text-[#111827]">
                        {formatCurrency(totalAllocatable)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-semibold text-[#111827]">Notes</label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-3 text-sm"
                      rows={3}
                      value={draft.notes}
                      onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-[#111827]">Allocation</h3>
                    <div className="mt-3 space-y-3">
                      {tripOptions
                        .filter((trip) => draft.selectedTripIds.includes(trip.id))
                        .map((trip) => (
                          <div
                            key={trip.id}
                            className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:grid-cols-[2fr_1fr_1fr_1fr]"
                          >
                            <div>
                              <p className="font-semibold text-[#111827]">{trip.from} → {trip.to}</p>
                              <p className="text-xs text-slate-400">{trip.tripCode}</p>
                              {draft.scope === 'PARTY_LEVEL' && (
                                <p className="text-xs text-slate-400">{trip.truckNumber}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Pending</p>
                              <p className="font-semibold text-[#111827]">{formatCurrency(trip.pending)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Allocate</p>
                              <input
                                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                                value={draft.allocations[trip.id] ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value
                                  setDraft((prev) => ({
                                    ...prev,
                                    allocations: { ...prev.allocations, [trip.id]: value },
                                  }))
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Remaining</p>
                              <p className="font-semibold text-[#111827]">
                                {formatCurrency(Math.max(trip.pending - Number(draft.allocations[trip.id] || 0), 0))}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    {errors.allocations && (
                      <p className="mt-2 text-xs text-rose-500">{errors.allocations}</p>
                    )}
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-100 bg-white px-4 py-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Total pending</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalPendingSelected)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Total allocated</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalAllocated)}</span>
                    </div>
                    {remainder > 0 && (
                      <p className="mt-3 text-xs text-blue-600">
                        ₹{remainder.toLocaleString('en-IN')} will be saved as credit for this party.
                      </p>
                    )}
                    {uncoveredPending > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        ₹{uncoveredPending.toLocaleString('en-IN')} remains pending after this settlement.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
              <div className="lg:hidden">
                <details className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <summary className="cursor-pointer text-sm font-semibold text-[#111827]">
                    Settlement summary
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Party</span>
                      <span className="font-semibold text-[#111827]">{selectedParty?.name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Truck</span>
                      <span className="font-semibold text-[#111827]">
                        {draft.scope === 'SINGLE_TRUCK'
                          ? selectedTruck?.truckNumber || '—'
                          : 'Multiple trucks'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trips selected</span>
                      <span className="font-semibold text-[#111827]">{draft.selectedTripIds.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total pending</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalPendingSelected)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Previous credit</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(partyCredit)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Received amount</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(draft.receivedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total available</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalAllocatable)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total allocated</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalAllocated)}</span>
                    </div>
                  </div>
                </details>
              </div>

              <div className="hidden lg:block">
                <div className="rounded-2xl border border-[#E9EEF5] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <h3 className="text-sm font-semibold text-[#111827]">Settlement summary</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Party</span>
                      <span className="font-semibold text-[#111827]">{selectedParty?.name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Truck</span>
                      <span className="font-semibold text-[#111827]">
                        {draft.scope === 'SINGLE_TRUCK'
                          ? selectedTruck?.truckNumber || '—'
                          : 'Multiple trucks'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trips selected</span>
                      <span className="font-semibold text-[#111827]">{draft.selectedTripIds.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total pending</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalPendingSelected)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Previous credit</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(partyCredit)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Received amount</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(draft.receivedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total available</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalAllocatable)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total allocated</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(totalAllocated)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" className="text-sm font-semibold text-slate-500" onClick={handleBack}>
                  Back
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white sm:w-auto"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`h-11 rounded-xl px-6 text-sm font-semibold text-white sm:w-auto ${
                      saveDisabled ? 'cursor-not-allowed bg-slate-300' : 'bg-[#2563EB]'
                    }`}
                    onClick={handleSave}
                    disabled={saveDisabled}
                  >
                    Save settlement
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {toast}
        </div>
      )}

      {showPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#111827]">Add new party</h2>
            <div className="mt-4 space-y-3">
              <input
                value={partyName}
                onChange={(event) => setPartyName(event.target.value)}
                placeholder="Party name"
                required
                className="h-12 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
              />
              {errors.partyName && <p className="text-xs text-rose-500">{errors.partyName}</p>}
              <input
                value={partyPhone}
                onChange={(event) => setPartyPhone(event.target.value)}
                placeholder="Phone (optional)"
                className="h-12 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm"
              />
              <textarea
                value={partyNotes}
                onChange={(event) => setPartyNotes(event.target.value)}
                placeholder="Notes (optional)"
                rows={3}
                className="w-full rounded-xl border border-[#D9E2EF] px-4 py-3 text-sm"
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-slate-500"
                onClick={() => setShowPartyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                onClick={handleSaveParty}
              >
                Save party
              </button>
            </div>
          </div>
        </div>
      )}

      {showScopeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#111827]">Change scope?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Changing scope will reset selected trips and allocations. Continue?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-slate-500"
                onClick={() => {
                  setShowScopeConfirm(false)
                  setPendingScope(null)
                }}
              >
                No
              </button>
              <button
                type="button"
                className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                onClick={() => {
                  applyScopeChange(pendingScope)
                  setShowScopeConfirm(false)
                  setPendingScope(null)
                }}
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {navToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {navToast}
        </div>
      )}
    </div>
  )
}
