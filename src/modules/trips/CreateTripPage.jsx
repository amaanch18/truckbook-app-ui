import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { useParties } from '../../hooks/useParties.js'
import { normalizeError } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toIsoDate(value) {
  if (!value) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().split('T')[0]
}

function sanitizeNonNegative(value) {
  if (value === '') return ''
  const next = Number(value)
  if (Number.isNaN(next) || next < 0) return null
  return value
}

export default function CreateTripPage() {
  const [selectedTruck, setSelectedTruck] = useState(null)
  const [selectedParty, setSelectedParty] = useState(null)
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [partyPhone, setPartyPhone] = useState('')
  const [partyError, setPartyError] = useState('')
  const [isPartySaving, setIsPartySaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [driver, setDriver] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [freight, setFreight] = useState('')
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isDesktop, setIsDesktop] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  const { me } = useAuthSession()
  const { data: trucksData } = useTrucks()
  const { data: tripsData, create } = useTrips()
  const {
    data: partiesData,
    create: createParty,
    refetch: refetchParties,
  } = useParties()
  const trucks = trucksData || []
  const parties = partiesData || []
  const businessName = useMemo(() => me?.orgName || '', [me])
  const hasTrucks = trucks.length > 0
  const hasTrips = (tripsData || []).length > 0

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetId = params.get('truckId')
    if (targetId) {
      const match = trucks.find((truck) => truck.id === targetId)
      if (match && match.status !== 'INACTIVE') {
        setSelectedTruck(match)
      }
    } else if (!selectedTruck && trucks.length === 1 && trucks[0].status !== 'INACTIVE') {
      setSelectedTruck(trucks[0])
    }
  }, [trucks, selectedTruck])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const handleChange = () => setIsDesktop(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navigateTo = (path, { replace = false } = {}) => {
    const url = new URL(window.location.href)
    url.pathname = path
    url.search = ''
    if (replace) {
      window.history.replaceState({}, '', url)
    } else {
      window.history.pushState({}, '', url)
    }
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

  const filteredTrucks = trucks.filter((truck) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      truck.truckNumber.toLowerCase().includes(query) ||
      (truck.truckType || '').toLowerCase().includes(query)
    )
  })

  const pendingAmount = Math.max(0, Number(freight || 0))
  const isStep1Valid = Boolean(selectedTruck && selectedParty)
  const isStep2Valid = Boolean(from.trim() && to.trim() && startDate)
  const isStep3Valid = !freight || Number(freight) >= 0

  const validate = () => {
    const nextErrors = {}
    if (!selectedTruck) {
      nextErrors.truck = 'Select a truck to continue.'
    }
    if (!selectedParty) {
      nextErrors.party = 'Select a party to continue.'
    }
    if (!from.trim()) {
      nextErrors.from = 'Enter pickup location.'
    }
    if (!to.trim()) {
      nextErrors.to = 'Enter drop location.'
    }
    if (!startDate) {
      nextErrors.startDate = 'Select a start date.'
    }
    if (freight && Number(freight) < 0) {
      nextErrors.freight = 'Freight must be 0 or more.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (isSaving) return
    if (!validate()) return
    setIsSaving(true)
    try {
      const tripCode = `TRP-${String(Date.now()).slice(-6)}`
      const created = await create({
        truckId: selectedTruck.id,
        partyId: selectedParty?.id || undefined,
        tripCode,
        driverName: driver.trim() || undefined,
        fromLocation: from.trim(),
        toLocation: to.trim(),
        startDate: toIsoDate(startDate),
        freightAmount: Number(freight || 0),
        notes: notes.trim() || undefined,
      })
      navigateTo(`/app/trips/${created.id}`, { replace: true })
    } catch (err) {
      const normalizedError = normalizeError(err)
      if (normalizedError.status === 401) {
        navigateTo('/auth')
        return
      }
      if (normalizedError.status === 404) {
        setSelectedParty(null)
        setErrors((prev) => ({ ...prev, party: 'Party not found.' }))
      } else {
        setNavToast(normalizedError.message || 'Couldn’t create trip. Try again.')
        window.setTimeout(() => setNavToast(''), 2800)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveParty = async () => {
    if (!partyName.trim()) {
      setPartyError('Party name is required.')
      return
    }
    setIsPartySaving(true)
    try {
      const created = await createParty({ name: partyName.trim() })
      setSelectedParty(created)
      setPartyName('')
      setPartyPhone('')
      setPartyError('')
      setShowPartyModal(false)
      await refetchParties()
      setErrors((prev) => {
        const { party: _ignored, ...rest } = prev
        return rest
      })
    } catch (err) {
      const normalizedError = normalizeError(err)
      if (normalizedError.status === 409) {
        setPartyError('Party already exists.')
      } else {
        setPartyError(normalizedError.message || 'Could not create party.')
      }
    } finally {
      setIsPartySaving(false)
    }
  }

  const isValid =
    selectedTruck &&
    from.trim() &&
    to.trim() &&
    startDate &&
    (!freight || Number(freight) >= 0)
  const isStep3Ready = !isDesktop || step === 3

  const paymentStatus = (() => {
    const total = Number(freight || 0)
    if (total <= 0) return 'UNPAID'
    if (pendingAmount === 0) return 'PAID'
    if (pendingAmount < total) return 'PARTIAL'
    return 'UNPAID'
  })()

  const goNext = () => {
    if (step === 1 && !isStep1Valid) {
      setErrors((prev) => ({ ...prev, truck: 'Select a truck to continue.' }))
      return
    }
    if (step === 2 && !isStep2Valid) {
      setErrors((prev) => ({
        ...prev,
        from: from.trim() ? prev.from : 'Enter pickup location.',
        to: to.trim() ? prev.to : 'Enter drop location.',
        startDate: startDate ? prev.startDate : 'Select a start date.',
      }))
      return
    }
    setStep((value) => Math.min(3, value + 1))
  }

  const goBack = () => setStep((value) => Math.max(1, value - 1))

  const setStepSafe = (target) => {
    if (target < step) {
      setStep(target)
      return
    }
    if (step === 1 && !isStep1Valid) return
    if (step === 2 && !isStep2Valid) return
    setStep(target)
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:h-screen lg:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={() => {
          navigateTo('/auth')
        }}
        activePath="/app/trips/new"
        onHamburgerClick={() => setIsDrawerOpen(true)}
        avatarVariant="brand"
        stickyDesktop
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

      <div className="flex">
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

        <main className="flex flex-1 flex-col px-6 py-7 pb-24 sm:py-10 sm:pb-10 lg:h-[calc(100vh-72px)] lg:overflow-hidden lg:pt-6 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className="text-sm font-semibold text-slate-500"
              type="button"
              onClick={() => navigateTo('/app/trips')}
            >
              ← Trips
            </button>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              <div>
                <h1 className="text-2xl font-semibold text-[#111827]">Create trip</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Add trip details for billing and tracking
                </p>
              </div>

              <div className="mt-6 hidden items-center gap-3 lg:flex">
                {[
                  { id: 1, label: 'Truck & Driver' },
                  { id: 2, label: 'Route' },
                  { id: 3, label: 'Billing' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStepSafe(item.id)}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      step === item.id
                        ? 'bg-[#2563EB] text-white'
                        : 'border border-slate-200 text-slate-500'
                    }`}
                  >
                    {item.id}. {item.label}
                  </button>
                ))}
              </div>

              <form
                className={`mt-6 space-y-6 lg:max-h-[calc(100vh-260px)] lg:pr-2 ${
                  showDropdown ? 'lg:overflow-visible' : 'lg:overflow-y-auto'
                }`}
                onSubmit={handleCreate}
              >
                {(step === 1 || !isDesktop) && (
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-[#111827]">Truck & driver</h2>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="party">
                          Party
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            id="party"
                            value={selectedParty?.id || ''}
                            onChange={(event) => {
                              const match = parties.find((party) => party.id === event.target.value)
                              setSelectedParty(match || null)
                            }}
                            required
                            className="h-11 w-full rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="">Select a party</option>
                            {parties.map((party) => (
                              <option key={party.id} value={party.id}>
                                {party.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600"
                            type="button"
                            onClick={() => setShowPartyModal(true)}
                          >
                            Add new
                          </button>
                        </div>
                        {errors.party && (
                          <p className="mt-2 text-sm text-red-500">{errors.party}</p>
                        )}
                      </div>
                      <div ref={dropdownRef}>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="truck">
                          Truck
                        </label>
                        <div className="relative mt-2">
                          <button
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                            type="button"
                            onClick={() => {
                              setShowDropdown((value) => !value)
                              setTimeout(() => searchRef.current?.focus(), 0)
                            }}
                          >
                            <span>
                              {selectedTruck ? selectedTruck.truckNumber : 'Select a truck'}
                            </span>
                            <span className="text-slate-400">▾</span>
                          </button>
                          {showDropdown && (
                            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                              <div className="border-b border-slate-100 p-2">
                                <input
                                  ref={searchRef}
                                  value={search}
                                  onChange={(event) => setSearch(event.target.value)}
                                  placeholder="Search truck..."
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-[#2F66F6] focus:outline-none"
                                />
                              </div>
                              <div className="max-h-40 overflow-y-auto p-2">
                                {filteredTrucks.length === 0 && (
                                  <p className="px-3 py-2 text-sm text-slate-400">
                                    No matching trucks
                                  </p>
                                )}
                                {filteredTrucks.map((truck) => {
                                  const isInactive = !(truck.isActive ?? true)
                                  return (
                                    <button
                                      key={truck.id}
                                      type="button"
                                      disabled={isInactive}
                                      onClick={() => {
                                        if (isInactive) return
                                        setSelectedTruck(truck)
                                        setShowDropdown(false)
                                        setSearch('')
                                      }}
                                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                                        isInactive
                                          ? 'cursor-not-allowed text-slate-300'
                                          : 'text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <div>
                                        <p className="font-semibold text-[#111827]">
                                          {truck.truckNumber}
                                        </p>
                                        <p className="text-xs text-slate-400">{truck.truckType}</p>
                                      </div>
                                      <span
                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                          isInactive
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-emerald-50 text-emerald-600'
                                        }`}
                                      >
                                        {isInactive ? 'Inactive' : 'Active'}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {trucks.length === 1 && selectedTruck && (
                          <p className="mt-2 text-xs text-slate-500">
                            Selected automatically (only truck).
                          </p>
                        )}
                        {trucks.some((truck) => !(truck.isActive ?? true)) && (
                          <p className="mt-2 text-xs text-slate-400">
                            Inactive trucks can’t be used for trips.
                          </p>
                        )}
                        {errors.truck && (
                          <p className="mt-2 text-sm text-red-500">{errors.truck}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-[#111827]" htmlFor="driver">
                          Driver
                        </label>
                        <input
                          id="driver"
                          value={driver}
                          onChange={(event) => setDriver(event.target.value)}
                          placeholder="e.g. Raju"
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(step === 2 || !isDesktop) && (
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-[#111827]">Route</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="from">
                          From
                        </label>
                        <input
                          id="from"
                          value={from}
                          onChange={(event) => setFrom(event.target.value)}
                          placeholder="e.g. Bhiwandi, MH"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                        {errors.from && (
                          <p className="mt-2 text-sm text-red-500">{errors.from}</p>
                        )}
                      </div>
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="to">
                          To
                        </label>
                        <input
                          id="to"
                          value={to}
                          onChange={(event) => setTo(event.target.value)}
                          placeholder="e.g. Pune, MH"
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                        {errors.to && <p className="mt-2 text-sm text-red-500">{errors.to}</p>}
                      </div>
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="startDate">
                          Start date
                        </label>
                        <input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                          required
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                        {errors.startDate && (
                          <p className="mt-2 text-sm text-red-500">{errors.startDate}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-[#111827]" htmlFor="notes">
                          Notes
                        </label>
                        <input
                          id="notes"
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="Any notes for this trip…"
                          className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(step === 3 || !isDesktop) && (
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold text-[#111827]">Billing</h2>
                    <div className="mt-4">
                      <label className="required text-sm font-semibold text-[#111827]" htmlFor="freight">
                        Freight amount
                      </label>
                      <div className="mt-2 flex h-11 items-center rounded-xl border border-[#D9E2EF] px-3">
                        <span className="text-slate-400">₹</span>
                          <input
                            id="freight"
                            value={freight}
                            onChange={(event) => {
                              const next = sanitizeNonNegative(event.target.value)
                              if (next === null) return
                              setFreight(next)
                            }}
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="ml-2 w-full bg-transparent text-sm text-[#111827] outline-none"
                          />
                      </div>
                      {errors.freight && (
                        <p className="mt-2 text-sm text-red-500">{errors.freight}</p>
                      )}
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Settlements are recorded after the trip is created. You can add or edit
                      settlements anytime from the Trip Details page.
                    </p>
                  </div>
                )}
                {isDesktop && (
                  <div className="hidden items-center justify-between gap-3 lg:flex">
                    <button
                      className="text-sm font-semibold text-slate-500"
                      type="button"
                      onClick={goBack}
                      disabled={step === 1}
                    >
                      ← Back
                    </button>
                    {step < 3 && (
                      <button
                        className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                        type="button"
                        onClick={goNext}
                      >
                        Next step
                      </button>
                    )}
                  </div>
                )}
              </form>

              <div className="mt-6 lg:hidden">
                <details className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <summary className="cursor-pointer text-sm font-semibold text-[#111827]">
                    Trip summary
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Truck</span>
                      <span className="font-semibold text-[#111827]">
                        {selectedTruck?.truckNumber || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Route</span>
                      <span className="font-semibold text-[#111827]">
                        {from && to ? `${from} → ${to}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      <span className="font-semibold text-[#111827]">
                        {formatDate(startDate) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Freight</span>
                      <span className="font-semibold text-[#111827]">₹{freight || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pending settlement</span>
                      <span className="font-semibold text-[#111827]">₹{pendingAmount}</span>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <h2 className="text-lg font-semibold text-[#111827]">Trip summary</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Truck</span>
                    <span className="font-semibold text-[#111827]">
                      {selectedTruck?.truckNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Route</span>
                    <span className="font-semibold text-[#111827]">
                      {from && to ? `${from} → ${to}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Date</span>
                    <span className="font-semibold text-[#111827]">
                      {formatDate(startDate) || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Freight</span>
                    <span className="font-semibold text-[#111827]">₹{freight || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                      <span>Pending settlement</span>
                    <span className="font-semibold text-[#111827]">₹{pendingAmount}</span>
                  </div>
                </div>
                <button
                  className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="button"
                  disabled={!isValid || isSaving || !isStep3Ready}
                  onClick={handleCreate}
                >
                  {isSaving ? 'Creating…' : 'Create trip'}
                </button>
                <button
                  className="mt-3 w-full text-sm font-semibold text-slate-500"
                  type="button"
                  onClick={() => navigateTo('/app/trips')}
                >
                  Cancel
                </button>
                <p className="mt-3 text-xs text-slate-400">You can edit details later.</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:hidden">
        <button
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={!isValid || isSaving}
          onClick={handleCreate}
        >
          {isSaving ? 'Creating…' : 'Create trip'}
        </button>
        <button
          className="mt-2 w-full text-sm font-semibold text-slate-500"
          type="button"
          onClick={() => navigateTo('/app/trips')}
        >
          Cancel
        </button>
      </div>

      {showPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Add party</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Create a party to attach this trip.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="party-name">
                  Party name
                </label>
                <input
                  id="party-name"
                  value={partyName}
                  onChange={(event) => setPartyName(event.target.value)}
                  placeholder="e.g. Sharma Traders"
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-[#111827]"
                />
                {partyError && <p className="mt-2 text-sm text-red-500">{partyError}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="party-phone">
                  Phone (optional)
                </label>
                <input
                  id="party-phone"
                  value={partyPhone}
                  onChange={(event) => setPartyPhone(event.target.value)}
                  placeholder="e.g. 98765 43210"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-[#111827]"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowPartyModal(false)
                  setPartyName('')
                  setPartyPhone('')
                  setPartyError('')
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleSaveParty}
                disabled={isPartySaving}
              >
                {isPartySaving ? 'Saving...' : 'Save party'}
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
