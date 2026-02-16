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

function toInputDate(value) {
  if (!value) return ''
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    return `${year}-${month}-${day}`
  }
  return value
}

function toIsoDate(value) {
  if (!value) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().split('T')[0]
}

export default function EditTripPage({ tripId }) {
  const [trucks, setTrucks] = useState([])
  const [selectedTruck, setSelectedTruck] = useState(null)
  const [parties, setParties] = useState([])
  const [selectedParty, setSelectedParty] = useState(null)
  const [showPartyModal, setShowPartyModal] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [partyPhone, setPartyPhone] = useState('')
  const [settlements] = useState([])
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
  const [toast, setToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isDesktop, setIsDesktop] = useState(false)
  const [trip, setTrip] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pendingPath, setPendingPath] = useState('')
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)
  const modalRef = useRef(null)
  const deleteModalRef = useRef(null)

  const { me } = useAuthSession()
  const { data: trucksData } = useTrucks()
  const { getById, update } = useTrips({}, { auto: false })
  const { data: partiesData, create: createParty, refetch: refetchParties } = useParties()
  const businessName = useMemo(() => me?.orgName || '', [me])
  const hasTrucks = (trucksData || []).length > 0
  const hasTrips = Boolean(trip)

  useEffect(() => {
    setTrucks(trucksData || [])
  }, [trucksData])

  useEffect(() => {
    setParties(partiesData || [])
  }, [partiesData])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setNotFound(false)
    getById(tripId)
      .then((found) => {
        if (!isMounted) return
        if (!found) {
          setNotFound(true)
          return
        }
        setTrip(found)
        setDriver(found.driverName || '')
        setFrom(found.fromLocation || '')
        setTo(found.toLocation || '')
        setStartDate(toInputDate(found.startDate || ''))
        setNotes(found.notes || '')
        setFreight(found.freightAmount != null ? String(found.freightAmount) : '')
        setInitialSnapshot({
          partyId: found.partyId || '',
          truckId: found.truckId || '',
          driver: found.driverName || '',
          from: found.fromLocation || '',
          to: found.toLocation || '',
          startDate: toInputDate(found.startDate || ''),
          notes: found.notes || '',
          freight: found.freightAmount != null ? String(found.freightAmount) : '',
        })
      })
      .catch((err) => {
        if (!isMounted) return
        const normalized = normalizeError(err)
        if (normalized.status === 401) {
          navigateTo('/auth')
          return
        }
        setNotFound(true)
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [tripId, getById])

  useEffect(() => {
    if (!trip) return
    const linkedParty = parties.find((party) => party.id === trip.partyId)
    setSelectedParty(linkedParty || null)
  }, [parties, trip])

  useEffect(() => {
    if (!trip) return
    const linkedTruck = trucks.find((truck) => truck.id === trip.truckId)
    if (linkedTruck) {
      setSelectedTruck(linkedTruck)
    } else if (trip.truckId) {
      setSelectedTruck({
        id: trip.truckId,
        truckNumber: 'Truck missing',
        truckType: '—',
        status: 'ACTIVE',
        missing: true,
      })
    }
  }, [trucks, trip])

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
    if (!showDropdown) return
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  useEffect(() => {
    if (!showDiscard) return
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowDiscard(false)
        setPendingPath('')
      }
      if (event.key !== 'Tab' || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showDiscard])

  useEffect(() => {
    if (!showDelete) return
    const focusable = deleteModalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowDelete(false)
        setDeleteText('')
      }
      if (event.key !== 'Tab' || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showDelete])

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

  const filteredTrucks = trucks.filter((truck) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      truck.truckNumber.toLowerCase().includes(query) ||
      truck.truckType.toLowerCase().includes(query)
    )
  })

  const settledAmount = settlements.reduce((sum, settlement) => {
    const allocations = settlement.allocations || []
    const allocatedForTrip = allocations.reduce((allocSum, allocation) => {
      if (allocation.tripId !== trip?.id) return allocSum
      return allocSum + Number(allocation.allocatedAmount || 0)
    }, 0)
    return sum + allocatedForTrip
  }, 0)
  const pendingSettlement = Math.max(0, Number(freight || 0) - settledAmount)
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
    if (freight && Number(freight) < settledAmount) {
      nextErrors.freight = `Freight cannot be less than ₹${settledAmount} already settled`
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const isValid =
    selectedTruck &&
    from.trim() &&
    to.trim() &&
    startDate &&
    (!freight || Number(freight) >= 0)

  const isStep3Ready = !isDesktop || step === 3

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

  const isDirty = initialSnapshot
    ? JSON.stringify({
        partyId: selectedParty?.id || '',
        truckId: selectedTruck?.id || '',
        driver: driver.trim(),
        from: from.trim(),
        to: to.trim(),
        startDate,
        notes: notes.trim(),
        freight: freight ? String(freight) : '',
      }) !== JSON.stringify(initialSnapshot)
    : false

  const safeNavigate = (path) => {
    if (isDirty) {
      setPendingPath(path)
      setShowDiscard(true)
      return
    }
    navigateTo(path)
  }

  const handleCancel = () => safeNavigate(`/app/trips/${tripId}`)

  const handleSave = async (event) => {
    event.preventDefault()
    if (isSaving) return
    if (!validate()) return
    setIsSaving(true)
    try {
      const payload =
        (trip?.status || '').toUpperCase() === 'COMPLETED'
          ? { notes: notes.trim() }
          : {
              partyId: selectedParty?.id || undefined,
              driverName: driver.trim() || undefined,
              fromLocation: from.trim(),
              toLocation: to.trim(),
              startDate: toIsoDate(startDate),
              freightAmount: Number(freight || 0),
              notes: notes.trim() || undefined,
            }
      await update(tripId, payload)
      navigateTo(`/app/trips/${tripId}`)
    } catch (err) {
      const normalized = normalizeError(err)
      if (normalized.status === 401) {
        navigateTo('/auth')
        return
      }
      if (normalized.status === 404) {
        setSelectedParty(null)
        setErrors((prev) => ({ ...prev, party: 'Party not found.' }))
        return
      }
      setToast(normalized.message || 'Couldn’t save changes.')
      window.setTimeout(() => setToast(''), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveParty = async () => {
    if (!partyName.trim()) {
      setErrors((prev) => ({ ...prev, party: 'Party name is required.' }))
      return
    }
    try {
      const created = await createParty({ name: partyName.trim() })
      setSelectedParty(created)
      setPartyName('')
      setPartyPhone('')
      setShowPartyModal(false)
      await refetchParties()
      setErrors((prev) => {
        const { party: _ignored, ...rest } = prev
        return rest
      })
    } catch (err) {
      const normalized = normalizeError(err)
      if (normalized.status === 409) {
        setErrors((prev) => ({ ...prev, party: 'Party already exists.' }))
      } else {
        setErrors((prev) => ({ ...prev, party: normalized.message || 'Failed to add party.' }))
      }
    }
  }

  const canDeleteTrip =
    (trip?.status || '').toLowerCase() !== 'completed' &&
    !settlements.some((settlement) =>
      (settlement.allocations || []).some((allocation) => allocation.tripId === trip?.id),
    )


  const handleDelete = () => {
    if (!trip) return
    if (!canDeleteTrip) {
      setToast('Trips with settlements can’t be deleted.')
      window.setTimeout(() => setToast(''), 2000)
      return
    }
    const storedTrips = JSON.parse(sessionStorage.getItem('truckbook.trips') || '[]')
    sessionStorage.setItem(
      'truckbook.trips',
      JSON.stringify(storedTrips.filter((item) => item.id !== trip.id)),
    )
    sessionStorage.setItem('truckbook.toast', 'Trip deleted')
    navigateTo('/app/trips')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNavbar
          businessName={businessName}
          onLogoClick={() => navigateTo('/dashboard')}
          onSettingsClick={() => navigateTo('/settings')}
          onLogout={() => {
            sessionStorage.clear()
            navigateTo('/')
          }}
          activePath="/app/trips"
          onHamburgerClick={() => setIsDrawerOpen(true)}
          avatarVariant="brand"
          stickyDesktop
        />
        <div className="flex">
          <AppSidebar active="Trips" disabledItems={[]} />
          <main className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="h-32 w-full max-w-[720px] rounded-2xl bg-white shadow-[0_16px_32px_rgba(0,0,0,0.06)]" />
          </main>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNavbar
          businessName={businessName}
          onLogoClick={() => navigateTo('/dashboard')}
          onSettingsClick={() => navigateTo('/settings')}
          onLogout={() => {
            sessionStorage.clear()
            navigateTo('/')
          }}
          activePath="/app/trips"
          onHamburgerClick={() => setIsDrawerOpen(true)}
          avatarVariant="brand"
        />
        <div className="flex">
          <AppSidebar active="Trips" disabledItems={[]} onItemClick={() => navigateTo('/app/trips')} />
          <main className="flex flex-1 items-start justify-center px-6 py-10">
            <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <h1 className="text-lg font-semibold text-[#111827]">Trip not found</h1>
              <button
                className="mt-4 h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
                type="button"
                onClick={() => navigateTo('/app/trips')}
              >
                Back to Trips
              </button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const isCompleted = (trip?.status || '').toLowerCase() === 'completed'
  const missingTruck = selectedTruck?.missing

  return (
    <div className="min-h-screen bg-slate-50 lg:h-screen lg:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={() => {
          sessionStorage.clear()
          navigateTo('/')
        }}
        activePath="/app/trips"
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
          safeNavigate(item.path)
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
            safeNavigate(item.path)
          }}
        />

        <main className="flex flex-1 flex-col px-6 py-7 pb-24 sm:py-10 sm:pb-10 lg:h-[calc(100vh-72px)] lg:overflow-hidden lg:pt-6 lg:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className="text-sm font-semibold text-slate-500"
              type="button"
              onClick={() => safeNavigate(`/app/trips/${tripId}`)}
            >
              ← Trips
            </button>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              <div>
                <h1 className="text-2xl font-semibold text-[#111827]">Edit trip</h1>
                <p className="mt-1 text-sm text-[#6B7280]">Update trip details.</p>
                <p className="mt-2 text-xs font-semibold uppercase text-slate-400">
                  Trip ID: {trip?.id}
                  {trip?.createdAt ? ` • Created on ${formatDate(trip.createdAt)}` : ''}
                </p>
                {isCompleted && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    This trip is completed. Only notes can be edited.
                  </div>
                )}
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
                className="mt-6 space-y-6 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto lg:pr-2"
                onSubmit={handleSave}
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
                            disabled={isCompleted}
                            required
                            className="h-11 w-full rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                          >
                            <option value="">Select a party</option>
                            {parties.map((party) => (
                              <option key={party.id} value={party.id}>
                                {party.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                            type="button"
                            disabled={isCompleted}
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
                            disabled={isCompleted}
                            onClick={() => {
                              if (isCompleted) return
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
                              <div className="max-h-56 overflow-y-auto p-2">
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
                        {missingTruck && (
                          <p className="mt-2 text-xs text-amber-600">
                            This trip’s truck was removed. Please select another truck.
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
                          disabled={isCompleted}
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
                          disabled={isCompleted}
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
                          disabled={isCompleted}
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
                          disabled={isCompleted}
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
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="required text-sm font-semibold text-[#111827]" htmlFor="freight">
                          Freight amount
                        </label>
                        <div className="mt-2 flex h-11 items-center rounded-xl border border-[#D9E2EF] px-3">
                          <span className="text-slate-400">₹</span>
                          <input
                            id="freight"
                            value={freight}
                            onChange={(event) => setFreight(event.target.value)}
                            type="number"
                            min="0"
                            disabled={isCompleted}
                            required
                            className="ml-2 w-full bg-transparent text-sm text-[#111827] outline-none"
                          />
                        </div>
                        {errors.freight && (
                          <p className="mt-2 text-sm text-red-500">{errors.freight}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-[#111827]">
                          Settled amount
                        </label>
                        <p className="mt-2 text-sm font-semibold text-[#111827]">
                          ₹{settledAmount}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Settlements are recorded separately.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                      <span>Pending settlement:</span>
                      <span
                        className={
                          pendingSettlement === 0 ? 'text-emerald-600' : 'text-slate-600'
                        }
                      >
                        ₹{pendingSettlement}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Settlements are recorded separately. You can add or edit settlements anytime
                      from the Trip Details page.
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
                      <span className="font-semibold text-[#111827]">₹{pendingSettlement}</span>
                    </div>
                  </div>
                </details>
              </div>

            </div>

            <div className="hidden lg:block">
              <div className="sticky top-16 rounded-2xl border border-[#E9EEF5] bg-white p-7 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <h2 className="text-lg font-semibold text-[#111827]">Trip summary</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
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
                    <span className="font-semibold text-[#111827]">₹{pendingSettlement}</span>
                  </div>
                </div>
                <button
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="button"
                  disabled={!isValid || isSaving || !isStep3Ready}
                  onClick={handleSave}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  className="mt-3 w-full text-sm font-semibold text-slate-500"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <p className="mt-3 text-xs text-slate-400">You can edit details later.</p>
                <div className="mt-6 rounded-2xl border border-red-100 bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-red-500">
                    Danger zone
                  </h2>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p className="font-semibold text-[#111827]">Delete this trip</p>
                    <p className="text-xs text-slate-500">This action cannot be undone.</p>
                    <button
                      className={`mt-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                        canDeleteTrip
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'cursor-not-allowed border-slate-200 text-slate-400'
                      }`}
                      type="button"
                      onClick={() => {
                        if (!canDeleteTrip) {
                          setToast('Trips with settlements can’t be deleted.')
                          window.setTimeout(() => setToast(''), 2000)
                          return
                        }
                        setShowDelete(true)
                      }}
                      aria-disabled={!canDeleteTrip}
                    >
                      Delete trip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:hidden">
        <button
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={!isValid || isSaving || !isStep3Ready}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          className="mt-2 w-full text-sm font-semibold text-slate-500"
          type="button"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>

      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={modalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Discard changes?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              You have unsaved changes. Your edits will be lost.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowDiscard(false)
                  setPendingPath('')
                }}
              >
                Keep editing
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => {
                  setShowDiscard(false)
                  navigateTo(pendingPath || `/app/trips/${tripId}`)
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}


      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={deleteModalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete trip?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This will permanently delete this trip. This action cannot be undone.
            </p>
            <div className="mt-4">
              <label className="text-sm font-semibold text-[#111827]" htmlFor="delete-confirm">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirm"
                value={deleteText}
                onChange={(event) => setDeleteText(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827] focus:border-red-400 focus:outline-none focus:ring-4 focus:ring-red-100"
                placeholder="DELETE"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowDelete(false)
                  setDeleteText('')
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-200"
                type="button"
                disabled={deleteText !== 'DELETE'}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleSaveParty}
              >
                Save party
              </button>
            </div>
          </div>
        </div>
      )}

      {(toast || navToast) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {toast || navToast}
        </div>
      )}
    </div>
  )
}
