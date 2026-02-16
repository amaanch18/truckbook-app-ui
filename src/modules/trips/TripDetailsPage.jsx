import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrips } from '../../hooks/useTrips.js'
import { useSettlements } from '../../hooks/useSettlements.js'
import { useParties } from '../../hooks/useParties.js'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTripFuel } from '../../hooks/useTripFuel.js'
import { useTripTolls } from '../../hooks/useTripTolls.js'
import { useTripDriverExpenses } from '../../hooks/useTripDriverExpenses.js'
import { normalizeError, toDdMmYyyy } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

const todayISO = () => new Date().toISOString().split('T')[0]

const DRIVER_CATEGORY_TO_API = {
  Food: 'FOOD',
  PhoneInternet: 'PHONE',
  Bata: 'STAY',
  Parking: 'OTHER',
  LoadingUnloading: 'OTHER',
  Police: 'OTHER',
  Other: 'OTHER',
}

const DRIVER_CATEGORY_FROM_API = {
  FOOD: 'Food',
  PHONE: 'PhoneInternet',
  STAY: 'Bata',
  REPAIR_HELP: 'Other',
  OTHER: 'Other',
}

const driverLabel = (value) => {
  if (value === 'PhoneInternet') return 'Phone/Internet'
  if (value === 'LoadingUnloading') return 'Loading/Unloading'
  return value
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toInputDate(value) {
  if (!value) return value
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    return `${year}-${month}-${day}`
  }
  return value
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

export default function TripDetailsPage({ tripId }) {
  const [trip, setTrip] = useState(null)
  const [status, setStatus] = useState('loading')
  const [toast, setToast] = useState('')
  const [navToast, setNavToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const modalRef = useRef(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [settledAmount, setSettledAmount] = useState(0)
  const [tripSettlements, setTripSettlements] = useState([])
  const [parties, setParties] = useState([])
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [fuelType, setFuelType] = useState('Diesel')
  const [fuelQuantity, setFuelQuantity] = useState('')
  const [fuelPrice, setFuelPrice] = useState('')
  const [fuelDate, setFuelDate] = useState('')
  const [fuelLocation, setFuelLocation] = useState('')
  const [fuelNotes, setFuelNotes] = useState('')
  const [fuelError, setFuelError] = useState('')
  const [editingFuelId, setEditingFuelId] = useState(null)
  const [showFuelDelete, setShowFuelDelete] = useState(false)
  const [fuelToDelete, setFuelToDelete] = useState(null)
  const [showTollModal, setShowTollModal] = useState(false)
  const [tollAmount, setTollAmount] = useState('')
  const [tollDate, setTollDate] = useState('')
  const [tollLocation, setTollLocation] = useState('')
  const [tollNotes, setTollNotes] = useState('')
  const [tollError, setTollError] = useState('')
  const [editingTollId, setEditingTollId] = useState(null)
  const [showTollDelete, setShowTollDelete] = useState(false)
  const [tollToDelete, setTollToDelete] = useState(null)
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [driverType, setDriverType] = useState('Bata')
  const [driverAmount, setDriverAmount] = useState('')
  const [driverDate, setDriverDate] = useState('')
  const [driverNotes, setDriverNotes] = useState('')
  const [driverError, setDriverError] = useState('')
  const [editingDriverId, setEditingDriverId] = useState(null)
  const [showDriverDelete, setShowDriverDelete] = useState(false)
  const [driverToDelete, setDriverToDelete] = useState(null)

  const { me } = useAuthSession()
  const { data: trucksData } = useTrucks()
  const { getById, complete, remove } = useTrips({}, { auto: false })
  const { data: partiesData } = useParties()
  const {
    data: settlementsData,
    isLoading: settlementsLoading,
    error: settlementsError,
    refetch: refetchSettlements,
    getById: getSettlementById,
  } = useSettlements()
  const {
    data: fuelData,
    isLoading: fuelLoading,
    isFetching: fuelFetching,
    error: fuelLoadError,
    refetch: refetchFuel,
    create: createFuel,
    update: updateFuel,
    remove: removeFuel,
  } = useTripFuel(tripId)
  const {
    data: tollData,
    isLoading: tollLoading,
    isFetching: tollFetching,
    error: tollLoadError,
    refetch: refetchTolls,
    create: createToll,
    update: updateToll,
    remove: removeToll,
  } = useTripTolls(tripId)
  const {
    data: driverExpenseData,
    isLoading: driverLoading,
    isFetching: driverFetching,
    error: driverLoadError,
    refetch: refetchDriverExpenses,
    create: createDriverExpense,
    update: updateDriverExpense,
    remove: removeDriverExpense,
  } = useTripDriverExpenses(tripId)
  const businessName = useMemo(() => me?.orgName || '', [me])
  const [hasTrucks, hasTrips] = useMemo(() => {
    return [(trucksData || []).length > 0, Boolean(trip)]
  }, [trucksData, trip])

  useEffect(() => {
    let isMounted = true
    setStatus('loading')
    getById(tripId)
      .then((found) => {
        if (!isMounted) return
        if (!found) {
          setStatus('not-found')
          return
        }
        setTrip({
          id: found.id,
          tripCode: found.tripCode,
          status: found.status,
          partyId: found.partyId,
          truckId: found.truckId,
          from: found.fromLocation,
          to: found.toLocation,
          startDate: toInputDate(found.startDate),
          driver: found.driverName || '',
          notes: found.notes || '',
          freight: found.freightAmount,
          paidAmount: found.paidAmount,
          outstandingAmount: found.outstandingAmount,
          billingStatus: found.billingStatus,
          fuelTotal: found.fuelTotal,
          tollTotal: found.tollTotal,
          driverExpenseTotal: found.driverExpenseTotal,
          totalExpense: found.totalExpense,
          createdAt: found.createdAt,
          updatedAt: found.updatedAt,
        })
        setStatus('ready')
      })
      .catch((err) => {
        if (!isMounted) return
        const normalized = normalizeError(err)
        if (normalized.status === 401) {
          navigateTo('/auth')
          return
        }
        setStatus('not-found')
      })
    return () => {
      isMounted = false
    }
  }, [tripId, getById])

  useEffect(() => {
    if (!trip?.id) return
    if (!settlementsData || settlementsData.length === 0) {
      setTripSettlements([])
      setSettledAmount(0)
      return
    }
    let isMounted = true
    const relevant = settlementsData.filter((settlement) => {
      if (settlement.partyId && trip.partyId && settlement.partyId !== trip.partyId) return false
      if (settlement.truckId && trip.truckId && settlement.truckId !== trip.truckId) return false
      return true
    })
    Promise.all(
      relevant.map(async (settlement) => {
        try {
          const detail = await getSettlementById(settlement.id)
          const settlementInfo = detail?.settlement || settlement
          const allocations = detail?.allocations || []
          const allocated = allocations.reduce((sum, allocation) => {
            if (allocation.tripId !== trip.id) return sum
            return sum + Number(allocation.amountApplied || allocation.allocatedAmount || 0)
          }, 0)
          if (allocated <= 0) return null
          return {
            ...settlementInfo,
            mode: settlementInfo.paymentMode || settlementInfo.mode,
            settlementDate: settlementInfo.settlementDate,
            receivedAmount: settlementInfo.receivedAmount,
            allocated,
          }
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (!isMounted) return
      const filtered = results.filter(Boolean)
      setTripSettlements(filtered)
      setSettledAmount(filtered.reduce((sum, item) => sum + Number(item.allocated || 0), 0))
    })
    return () => {
      isMounted = false
    }
  }, [trip?.id, trip?.partyId, trip?.truckId, settlementsData, getSettlementById])

  useEffect(() => {
    setParties(partiesData || [])
  }, [partiesData])

  const linkedTruck = useMemo(() => {
    if (!trip || !(trucksData || []).length) return null
    return (trucksData || []).find((truckItem) => truckItem.id === trip.truckId) || null
  }, [trip, trucksData])

  useEffect(() => {
    const message = sessionStorage.getItem('truckbook.toast')
    if (message) {
      setToast(message)
      sessionStorage.removeItem('truckbook.toast')
      window.setTimeout(() => setToast(''), 2000)
    }
  }, [])

  useEffect(() => {
    if (!showDelete) return
    const focusable = modalRef.current?.querySelectorAll(
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
    const url = new URL(path, window.location.origin)
    window.history.pushState({}, '', `${url.pathname}${url.search}`)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const handleLogout = () => {
    sessionStorage.clear()
    navigateTo('/')
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

  const fuelLogs = useMemo(() => {
    return (fuelData || []).map((entry) => ({
      id: entry.id,
      type: 'Diesel',
      quantity: entry.liters,
      pricePerUnit: entry.ratePerLiter,
      totalAmount: entry.amount,
      date: toInputDate(entry.filledOn),
      location: entry.fuelStation || '',
      notes: entry.notes || '',
      createdAt: entry.createdAt,
    }))
  }, [fuelData])

  const tollLogs = useMemo(() => {
    return (tollData || []).map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      date: toInputDate(entry.paidOn),
      location: entry.plazaName || '',
      notes: entry.notes || '',
      createdAt: entry.createdAt,
    }))
  }, [tollData])

  const driverExpenseLogs = useMemo(() => {
    return (driverExpenseData || []).map((entry) => ({
      id: entry.id,
      type: DRIVER_CATEGORY_FROM_API[entry.category] || 'Other',
      amount: entry.amount,
      date: toInputDate(entry.spentOn),
      notes: entry.notes || '',
      createdAt: entry.createdAt,
    }))
  }, [driverExpenseData])

  const settledAmountValue =
    settledAmount > 0 ? settledAmount : Number(trip?.paidAmount || 0)
  const pendingSettlement =
    trip?.outstandingAmount != null
      ? Math.max(0, Number(trip.outstandingAmount || 0))
      : Math.max(0, Number(trip?.freight || 0) - settledAmountValue)
  const settlementStatus =
    settledAmountValue === 0
      ? 'UNSETTLED'
      : settledAmountValue < Number(trip?.freight || 0)
        ? 'PARTIAL'
        : 'SETTLED'
  const party = parties.find((item) => item.id === trip?.partyId)
  const totalFuelCost = fuelLogs.reduce(
    (sum, entry) => sum + Number(entry.totalAmount || 0),
    0,
  )
  const totalTollCost = tollLogs.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  )
  const totalDriverExpenses = driverExpenseLogs.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  )
  const isDriverValid = driverType && Number(driverAmount || 0) > 0
  const isCompleted = (trip?.status || '').toUpperCase() === 'COMPLETED'

  const markCompleted = () => {
    if (!trip) return
    complete(trip.id)
      .then((updated) => {
        setTrip((prev) => ({
          ...prev,
          status: updated.status || 'COMPLETED',
          completedAt: updated.completedAt || new Date().toISOString(),
        }))
        setToast('Trip marked as completed.')
        window.setTimeout(() => setToast(''), 2000)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setToast(normalized.message || 'Failed to complete trip.')
        window.setTimeout(() => setToast(''), 2000)
      })
  }

  const canDeleteTrip =
    (trip?.status || '').toUpperCase() === 'ACTIVE' && settledAmountValue === 0

  const handleFuelBlocked = () => {
    setToast("Fuel entries can’t be modified after trip completion.")
    window.setTimeout(() => setToast(''), 2400)
  }

  const handleTollBlocked = () => {
    setToast("Toll entries can’t be modified after trip completion.")
    window.setTimeout(() => setToast(''), 2400)
  }

  const handleDriverBlocked = () => {
    setToast("Driver expenses can’t be modified after trip completion.")
    window.setTimeout(() => setToast(''), 2400)
  }

  const handleAddFuel = async () => {
    if (!trip) return
    if (isCompleted) {
      handleFuelBlocked()
      return
    }
    const quantity = Number(fuelQuantity || 0)
    const price = Number(fuelPrice || 0)
    if (quantity <= 0 || price <= 0) {
      setFuelError('Enter quantity and price per unit.')
      return
    }
    try {
      const payload = {
        filledOn: toDdMmYyyy(fuelDate || todayISO()),
        liters: Number(quantity),
        ratePerLiter: Number(price),
        fuelStation: fuelLocation.trim() || undefined,
        notes: fuelNotes.trim() || undefined,
      }
      if (editingFuelId) {
        await updateFuel(editingFuelId, payload)
      } else {
        await createFuel(payload)
      }
      setEditingFuelId(null)
      setFuelQuantity('')
      setFuelPrice('')
      setFuelDate('')
      setFuelLocation('')
      setFuelNotes('')
      setFuelError('')
      setShowFuelModal(false)
      setToast(
        editingFuelId
          ? 'Fuel entry updated. Reports updated.'
          : 'Fuel entry added. Reports updated.',
      )
      window.setTimeout(() => setToast(''), 2400)
    } catch (err) {
      const normalized = normalizeError(err)
      setFuelError(normalized.message || 'Couldn’t save fuel entry.')
      setToast(normalized.message || 'Failed to save fuel entry.')
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const handleEditFuel = (entry) => {
    if (isCompleted) {
      handleFuelBlocked()
      return
    }
    setEditingFuelId(entry.id)
    setFuelType(entry.type)
    setFuelQuantity(String(entry.quantity || ''))
    setFuelPrice(String(entry.pricePerUnit || ''))
    setFuelDate(entry.date || '')
    setFuelLocation(entry.location || '')
    setFuelNotes(entry.notes || '')
    setFuelError('')
    setShowFuelModal(true)
  }

  const handleDeleteFuel = () => {
    if (!trip || !fuelToDelete) return
    if (isCompleted) {
      handleFuelBlocked()
      return
    }
    removeFuel(fuelToDelete.id)
      .then(() => {
        setFuelToDelete(null)
        setShowFuelDelete(false)
        setToast('Fuel entry deleted.')
        window.setTimeout(() => setToast(''), 2400)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setToast(normalized.message || 'Failed to delete fuel entry.')
        window.setTimeout(() => setToast(''), 2400)
      })
  }

  const handleAddToll = async () => {
    if (!trip) return
    if (isCompleted) {
      handleTollBlocked()
      return
    }
    const amount = Number(tollAmount || 0)
    if (amount <= 0) {
      setTollError('Enter a valid toll amount.')
      return
    }
    try {
      const payload = {
        paidOn: toDdMmYyyy(tollDate || todayISO()),
        amount: Number(amount.toFixed(2)),
        plazaName: tollLocation.trim() || undefined,
        notes: tollNotes.trim() || undefined,
      }
      if (editingTollId) {
        await updateToll(editingTollId, payload)
      } else {
        await createToll(payload)
      }
      setEditingTollId(null)
      setTollAmount('')
      setTollDate('')
      setTollLocation('')
      setTollNotes('')
      setTollError('')
      setShowTollModal(false)
      setToast(
        editingTollId
          ? 'Toll entry updated. Reports updated.'
          : 'Toll entry added. Reports updated.',
      )
      window.setTimeout(() => setToast(''), 2400)
    } catch (err) {
      const normalized = normalizeError(err)
      setTollError(normalized.message || 'Couldn’t save toll entry.')
      setToast(normalized.message || 'Failed to save toll entry.')
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const handleEditToll = (entry) => {
    if (isCompleted) {
      handleTollBlocked()
      return
    }
    setEditingTollId(entry.id)
    setTollAmount(String(entry.amount || ''))
    setTollDate(entry.date || '')
    setTollLocation(entry.location || '')
    setTollNotes(entry.notes || '')
    setTollError('')
    setShowTollModal(true)
  }

  const handleDeleteToll = () => {
    if (!trip || !tollToDelete) return
    if (isCompleted) {
      handleTollBlocked()
      return
    }
    removeToll(tollToDelete.id)
      .then(() => {
        setTollToDelete(null)
        setShowTollDelete(false)
        setToast('Toll entry deleted. Reports updated.')
        window.setTimeout(() => setToast(''), 2400)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setToast(normalized.message || 'Failed to delete toll entry.')
        window.setTimeout(() => setToast(''), 2400)
      })
  }

  const handleAddDriverExpense = async () => {
    if (!trip) return
    if (isCompleted) {
      handleDriverBlocked()
      return
    }
    const amountValue = Number(driverAmount || 0)
    if (!driverType || amountValue <= 0) {
      setDriverError('Enter a valid amount and type.')
      return
    }
    try {
      const payload = {
        spentOn: toDdMmYyyy(driverDate || todayISO()),
        category: DRIVER_CATEGORY_TO_API[driverType] || 'OTHER',
        amount: Number(amountValue.toFixed(2)),
        notes: driverNotes.trim() || undefined,
      }
      if (editingDriverId) {
        await updateDriverExpense(editingDriverId, payload)
      } else {
        await createDriverExpense(payload)
      }
      setEditingDriverId(null)
      setDriverAmount('')
      setDriverDate('')
      setDriverNotes('')
      setDriverError('')
      setShowDriverModal(false)
      setToast(editingDriverId ? 'Expense updated' : 'Expense added')
      window.setTimeout(() => setToast(''), 2400)
    } catch (err) {
      const normalized = normalizeError(err)
      setDriverError(normalized.message || 'Couldn’t save expense.')
      setToast(normalized.message || 'Failed to save expense.')
      window.setTimeout(() => setToast(''), 2400)
    }
  }

  const handleEditDriverExpense = (entry) => {
    if (isCompleted) {
      handleDriverBlocked()
      return
    }
    setEditingDriverId(entry.id)
    setDriverType(entry.type || 'Bata')
    setDriverAmount(String(entry.amount || ''))
    setDriverDate(entry.date || '')
    setDriverNotes(entry.notes || '')
    setDriverError('')
    setShowDriverModal(true)
  }

  const handleDeleteDriverExpense = () => {
    if (!trip || !driverToDelete) return
    if (isCompleted) {
      handleDriverBlocked()
      return
    }
    removeDriverExpense(driverToDelete.id)
      .then(() => {
        setDriverToDelete(null)
        setShowDriverDelete(false)
        setToast('Expense deleted')
        window.setTimeout(() => setToast(''), 2400)
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        setToast(normalized.message || 'Failed to delete expense.')
        window.setTimeout(() => setToast(''), 2400)
      })
  }

  const handleDelete = () => {
    if (!trip) return
    if (!canDeleteTrip) {
      setToast('Trips with settlements can’t be deleted.')
      window.setTimeout(() => setToast(''), 2000)
      return
    }
    remove(trip.id)
      .then(() => {
        setToast('Trip deleted')
        window.setTimeout(() => setToast(''), 2000)
        navigateTo('/app/trips')
      })
      .catch((err) => {
        const normalized = normalizeError(err)
        if (normalized.status === 409) {
          setToast(normalized.message || 'Completed trips cannot be deleted')
        } else {
          setToast(normalized.message || 'Failed to delete trip')
        }
        window.setTimeout(() => setToast(''), 2000)
      })
  }

  const formatStatus = (value) => {
    const status = (value || 'ACTIVE').toUpperCase()
    return status === 'COMPLETED' ? 'Completed' : 'Active'
  }

  const [showComplete, setShowComplete] = useState(false)
  const completeModalRef = useRef(null)

  useEffect(() => {
    if (!showComplete) return
    const focusable = completeModalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowComplete(false)
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
  }, [showComplete])

  return (
    <div className="min-h-screen bg-slate-50 md:h-screen md:overflow-hidden">
      <AppNavbar
        businessName={businessName}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        onLogout={handleLogout}
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

        <main className="flex flex-1 flex-col px-6 py-7 sm:py-10 md:h-full md:overflow-y-auto">
          {status === 'not-found' && (
            <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <h1 className="text-lg font-semibold text-[#111827]">Trip not found</h1>
              <button
                className="mt-4 h-11 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white"
                type="button"
                onClick={() => navigateTo('/app/trips')}
              >
                Back to Trips
              </button>
            </div>
          )}

          {status === 'ready' && trip && (
            <div className="w-full max-w-[1100px] md:flex md:h-full md:flex-col md:overflow-hidden">
              <div className="md:shrink-0">
                <button
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500"
                  type="button"
                  onClick={() => navigateTo('/app/trips')}
                >
                  ← Trips
                </button>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Trip #{trip.id}
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Trip details</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {trip.from} → {trip.to}
                    </p>
                  </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isCompleted
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {formatStatus(trip.status)}
                  </span>
                  <button
                    className="h-10 rounded-xl border border-[#D9E2EF] px-4 text-sm font-semibold text-[#111827]"
                    type="button"
                    onClick={() => navigateTo(`/app/trips/${trip.id}/edit`)}
                  >
                    Edit
                  </button>
                  {!isCompleted && (
                    <button
                      className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white"
                      type="button"
                      onClick={() => setShowComplete(true)}
                    >
                      Mark completed
                    </button>
                  )}
                </div>
              </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr] md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-3">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-lg font-semibold text-[#111827]">Trip overview</h2>
                    <div className="mt-4 space-y-3 text-sm text-[#4B5563]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Truck</span>
                        <span className="font-semibold text-[#111827]">
                          {linkedTruck?.truckNumber || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Party</span>
                        <span className="text-[#111827]">
                          {party?.name || trip.partyName || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Driver</span>
                        <span className="text-[#111827]">{trip.driver || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Route</span>
                        <span className="text-[#111827]">
                          {trip.from} → {trip.to}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Start date</span>
                        <span className="text-[#111827]">{formatDate(trip.startDate)}</span>
                      </div>
                      {isCompleted && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Completed on</span>
                          <span className="text-[#111827]">
                            {formatDate(trip.completedAt)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Notes</span>
                        <span className="text-right text-[#111827]">{trip.notes || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-lg font-semibold text-[#111827]">Billing</h2>
                    <div className="mt-4 space-y-3 text-sm text-[#4B5563]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Freight</span>
                        <span className="font-semibold text-[#111827]">₹{trip.freight}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Settled amount</span>
                        <span className="text-[#111827]">₹{settledAmount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Pending settlement</span>
                        <span className="font-semibold text-[#111827]">
                          ₹{pendingSettlement}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">Fuel logs</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Total fuel cost: ₹{totalFuelCost}
                        </p>
                        {isCompleted && (
                          <p className="mt-1 text-xs text-slate-400">
                            Fuel entries can’t be modified after trip completion.
                          </p>
                        )}
                      </div>
                      <button
                        className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? 'cursor-not-allowed border-slate-200 text-slate-400'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                        type="button"
                        onClick={() => {
                          if (isCompleted) {
                            handleFuelBlocked()
                            return
                          }
                          setEditingFuelId(null)
                          setFuelType('Diesel')
                          setFuelQuantity('')
                          setFuelPrice('')
                          setFuelDate('')
                          setFuelLocation('')
                          setFuelNotes('')
                          setFuelError('')
                          setShowFuelModal(true)
                        }}
                      >
                        + Add fuel entry
                      </button>
                    </div>
                    {fuelLoading || fuelFetching ? (
                      <div className="mt-4 text-sm text-slate-500">Loading fuel logs…</div>
                    ) : fuelLoadError ? (
                      <div className="mt-4 text-sm text-slate-500">
                        Unable to load fuel logs.
                        <button
                          className="ml-2 text-xs font-semibold text-[#2563EB]"
                          type="button"
                          onClick={() => refetchFuel()}
                        >
                          Retry
                        </button>
                      </div>
                    ) : fuelLogs.length === 0 ? (
                      <div className="mt-4 text-sm text-slate-500">
                        <p>No fuel entries recorded for this trip.</p>
                        <p className="mt-2">Add fuel entries to track costs and mileage.</p>
                        <button
                          className={`mt-4 inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${
                            isCompleted
                              ? 'cursor-not-allowed border-slate-200 text-slate-400'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                          type="button"
                          onClick={() => {
                            if (isCompleted) {
                              handleFuelBlocked()
                              return
                            }
                            setEditingFuelId(null)
                            setFuelType('Diesel')
                            setFuelQuantity('')
                            setFuelPrice('')
                            setFuelDate('')
                            setFuelLocation('')
                            setFuelNotes('')
                            setFuelError('')
                            setShowFuelModal(true)
                          }}
                        >
                          + Add fuel entry
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-sm text-[#4B5563]">
                        {fuelLogs.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#111827]">
                                  🛢️ {entry.type} • {entry.quantity}{' '}
                                  {entry.type === 'CNG' ? 'kg' : 'L'} • ₹{entry.totalAmount}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(entry.date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className={`text-xs font-semibold ${
                                    isCompleted
                                      ? 'cursor-not-allowed text-slate-300'
                                      : 'text-slate-500'
                                  }`}
                                  type="button"
                                  onClick={() => handleEditFuel(entry)}
                                  aria-disabled={isCompleted}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className={`text-xs font-semibold ${
                                    isCompleted
                                      ? 'cursor-not-allowed text-slate-300'
                                      : 'text-rose-500'
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    if (isCompleted) {
                                      handleFuelBlocked()
                                      return
                                    }
                                    setFuelToDelete(entry)
                                    setShowFuelDelete(true)
                                  }}
                                  aria-disabled={isCompleted}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                            {entry.location && (
                              <p className="mt-1 text-xs text-slate-400">📍 {entry.location}</p>
                            )}
                            {entry.notes && (
                              <p className="mt-1 text-xs text-slate-400">{entry.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">Settlements</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {settlementStatus === 'UNSETTLED' && 'Not settled yet'}
                          {settlementStatus === 'PARTIAL' && 'Partially settled'}
                          {settlementStatus === 'SETTLED' && 'Settled'}
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563EB]"
                        type="button"
                        onClick={() => {
                          if (settlementStatus === 'SETTLED' && trip?.id) {
                            navigateTo(`/app/settlements?tripId=${trip.id}`)
                            return
                          }
                          navigateTo('/app/settlements/new')
                        }}
                      >
                        {settlementStatus === 'SETTLED' ? 'View settlements' : 'Create settlement'}
                      </button>
                    </div>
                    {tripSettlements.length === 0 ? (
                      <p className="mt-4 text-sm text-[#6B7280]">
                        No settlements linked to this trip yet.
                      </p>
                    ) : (
                      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-sm text-[#4B5563]">
                        {tripSettlements.map((settlement) => (
                          <button
                            key={settlement.id}
                            className="flex w-full items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left"
                            type="button"
                            onClick={() => navigateTo(`/app/settlements/${settlement.id}`)}
                          >
                            <div>
                              <p className="font-semibold text-[#111827]">
                                {formatCurrency(settlement.receivedAmount)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {settlement.mode} • {formatDate(settlement.settlementDate)}
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-slate-500">
                              Allocated ₹{settlement.allocated}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">Toll logs</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Total toll cost: ₹{totalTollCost}
                        </p>
                        {isCompleted && (
                          <p className="mt-1 text-xs text-slate-400">
                            Toll entries can’t be modified after trip completion.
                          </p>
                        )}
                      </div>
                      <button
                        className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? 'cursor-not-allowed border-slate-200 text-slate-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                        type="button"
                        onClick={() => {
                          if (isCompleted) {
                            handleTollBlocked()
                            return
                          }
                          setEditingTollId(null)
                          setTollAmount('')
                          setTollDate('')
                          setTollLocation('')
                          setTollNotes('')
                          setTollError('')
                          setShowTollModal(true)
                        }}
                      >
                        + Add toll entry
                      </button>
                    </div>
                    {tollLoading || tollFetching ? (
                      <div className="mt-4 text-sm text-slate-500">Loading toll logs…</div>
                    ) : tollLoadError ? (
                      <div className="mt-4 text-sm text-slate-500">
                        Unable to load toll logs.
                        <button
                          className="ml-2 text-xs font-semibold text-[#2563EB]"
                          type="button"
                          onClick={() => refetchTolls()}
                        >
                          Retry
                        </button>
                      </div>
                    ) : tollLogs.length === 0 ? (
                      <div className="mt-4 text-sm text-slate-500">
                        <p>No toll entries recorded for this trip.</p>
                        <p className="mt-2">Add toll entries to track costs on the route.</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-sm text-[#4B5563]">
                        {tollLogs.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#111827]">
                                  🛣️ Toll • ₹{entry.amount}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(entry.date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className={`text-xs font-semibold ${
                                    isCompleted
                                      ? 'cursor-not-allowed text-slate-300'
                                      : 'text-slate-500'
                                  }`}
                                  type="button"
                                  onClick={() => handleEditToll(entry)}
                                  aria-disabled={isCompleted}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className={`text-xs font-semibold ${
                                    isCompleted
                                      ? 'cursor-not-allowed text-slate-300'
                                      : 'text-rose-500'
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    if (isCompleted) {
                                      handleTollBlocked()
                                      return
                                    }
                                    setTollToDelete(entry)
                                    setShowTollDelete(true)
                                  }}
                                  aria-disabled={isCompleted}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                            {entry.location && (
                              <p className="mt-1 text-xs text-slate-400">📍 {entry.location}</p>
                            )}
                            {entry.notes && (
                              <p className="mt-1 text-xs text-slate-400">{entry.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[#111827]">Driver expenses</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Total driver expenses: ₹{totalDriverExpenses}
                        </p>
                        {isCompleted && (
                          <p className="mt-1 text-xs text-slate-400">
                            Driver expenses are locked after trip completion.
                          </p>
                        )}
                      </div>
                      <button
                        className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? 'cursor-not-allowed border-slate-200 text-slate-400'
                            : 'border-violet-200 bg-violet-50 text-violet-700'
                        }`}
                        type="button"
                        onClick={() => {
                          if (isCompleted) {
                            handleDriverBlocked()
                            return
                          }
                          setEditingDriverId(null)
                          setDriverType('Bata')
                          setDriverAmount('')
                          setDriverDate('')
                          setDriverNotes('')
                          setDriverError('')
                          setShowDriverModal(true)
                        }}
                      >
                        + Add expense
                      </button>
                    </div>
                    {driverLoading || driverFetching ? (
                      <div className="mt-4 text-sm text-slate-500">
                        Loading driver expenses…
                      </div>
                    ) : driverLoadError ? (
                      <div className="mt-4 text-sm text-slate-500">
                        Unable to load driver expenses.
                        <button
                          className="ml-2 text-xs font-semibold text-[#2563EB]"
                          type="button"
                          onClick={() => refetchDriverExpenses()}
                        >
                          Retry
                        </button>
                      </div>
                    ) : driverExpenseLogs.length === 0 ? (
                      <div className="mt-4 text-sm text-slate-500">
                        <p>No driver expenses recorded for this trip.</p>
                        <p className="mt-2">Add expenses to track driver costs.</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-sm text-[#4B5563]">
                        {[...driverExpenseLogs]
                          .sort((a, b) => {
                            const dateDiff = new Date(b.date) - new Date(a.date)
                            if (dateDiff !== 0) return dateDiff
                            return Number(b.createdAt || 0) - Number(a.createdAt || 0)
                          })
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-[#111827]">
                                    {driverLabel(entry.type)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    ₹{entry.amount} • {formatDate(entry.date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className={`text-xs font-semibold ${
                                      isCompleted
                                        ? 'cursor-not-allowed text-slate-300'
                                        : 'text-slate-500'
                                    }`}
                                    type="button"
                                    onClick={() => handleEditDriverExpense(entry)}
                                    aria-disabled={isCompleted}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className={`text-xs font-semibold ${
                                      isCompleted
                                        ? 'cursor-not-allowed text-slate-300'
                                        : 'text-rose-500'
                                    }`}
                                    type="button"
                                    onClick={() => {
                                      if (isCompleted) {
                                        handleDriverBlocked()
                                        return
                                      }
                                      setDriverToDelete(entry)
                                      setShowDriverDelete(true)
                                    }}
                                    aria-disabled={isCompleted}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                              {entry.notes && (
                                <p className="mt-1 text-xs text-slate-400">{entry.notes}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">
                      Danger zone
                    </h2>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p className="font-semibold text-[#111827]">Delete this trip</p>
                      <p>This action cannot be undone.</p>
                      <button
                        className={`mt-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
                          canDeleteTrip
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'cursor-not-allowed border-slate-200 text-slate-400'
                        }`}
                        type="button"
                        title={
                          canDeleteTrip
                            ? ''
                            : 'Trips with settlements cannot be deleted'
                        }
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
          )}
        </main>
      </div>

      {(toast || navToast) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {toast || navToast}
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={modalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
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

      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={completeModalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Mark trip as completed</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              You won’t be able to edit route or truck details after this. Settlements can still be
              recorded.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => setShowComplete(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => {
                  setShowComplete(false)
                  markCompleted()
                }}
              >
                Mark completed
              </button>
            </div>
          </div>
        </div>
      )}

      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingFuelId ? 'Edit fuel entry' : 'Add fuel entry'}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">Log fuel used during this trip.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="fuel-type">
                  Fuel type
                </label>
                <select
                  id="fuel-type"
                  value={fuelType}
                  onChange={(event) => setFuelType(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827]"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Petrol">Petrol</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="required text-sm font-semibold text-[#111827]" htmlFor="fuel-quantity">
                    Quantity
                  </label>
                  <input
                    id="fuel-quantity"
                    type="number"
                    min="0"
                    value={fuelQuantity}
                    onChange={(event) => setFuelQuantity(event.target.value)}
                    placeholder={fuelType === 'CNG' ? 'kg' : 'liters'}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#111827]"
                  />
                </div>
                <div>
                  <label className="required text-sm font-semibold text-[#111827]" htmlFor="fuel-price">
                    Price per unit
                  </label>
                  <input
                    id="fuel-price"
                    type="number"
                    min="0"
                    value={fuelPrice}
                    onChange={(event) => setFuelPrice(event.target.value)}
                    placeholder="₹"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#111827]"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]">Total amount</label>
                <p className="mt-2 text-sm font-semibold text-[#111827]">
                  ₹{Number(fuelQuantity || 0) * Number(fuelPrice || 0)}
                </p>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="fuel-date">
                  Date
                </label>
                <input
                  id="fuel-date"
                  type="date"
                  value={fuelDate}
                  onChange={(event) => setFuelDate(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="fuel-location">
                  Location (optional)
                </label>
                <input
                  id="fuel-location"
                  type="text"
                  value={fuelLocation}
                  onChange={(event) => setFuelLocation(event.target.value)}
                  placeholder="e.g. HP Petrol Pump, Bhiwandi"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="fuel-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="fuel-notes"
                  rows={2}
                  value={fuelNotes}
                  onChange={(event) => setFuelNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#111827]"
                />
              </div>
              {fuelError && <p className="text-sm font-semibold text-rose-500">{fuelError}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowFuelModal(false)
                  setFuelError('')
                  setEditingFuelId(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleAddFuel}
              >
                Save fuel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFuelDelete && fuelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete fuel entry?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This fuel entry will be removed. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowFuelDelete(false)
                  setFuelToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDeleteFuel}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showTollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingTollId ? 'Edit toll entry' : 'Add toll entry'}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="toll-amount">
                  Toll amount
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D9E2EF] px-4 py-3">
                  <span className="text-sm text-slate-400">₹</span>
                  <input
                    id="toll-amount"
                    type="number"
                    min="0"
                    value={tollAmount}
                    onChange={(event) => setTollAmount(event.target.value)}
                    required
                    className="w-full text-sm text-[#111827] focus:outline-none"
                  />
                </div>
                {tollError && <p className="mt-1 text-xs text-rose-500">{tollError}</p>}
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="toll-date">
                  Date
                </label>
                <input
                  id="toll-date"
                  type="date"
                  value={tollDate}
                  onChange={(event) => setTollDate(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="toll-location">
                  Location (optional)
                </label>
                <input
                  id="toll-location"
                  value={tollLocation}
                  onChange={(event) => setTollLocation(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                  placeholder="Toll plaza name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="toll-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="toll-notes"
                  rows={3}
                  value={tollNotes}
                  onChange={(event) => setTollNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-3 text-sm text-[#111827]"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowTollModal(false)
                  setTollError('')
                  setEditingTollId(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleAddToll}
              >
                {editingTollId ? 'Save changes' : 'Save toll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingDriverId ? 'Edit expense' : 'Add driver expense'}
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">Log expenses paid to the driver.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="driver-type">
                  Type
                </label>
                <select
                  id="driver-type"
                  value={driverType}
                  onChange={(event) => setDriverType(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827]"
                >
                  <option value="Bata">Bata</option>
                  <option value="Food">Food</option>
                  <option value="Parking">Parking</option>
                  <option value="LoadingUnloading">Loading/Unloading</option>
                  <option value="Police">Police</option>
                  <option value="PhoneInternet">Phone/Internet</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="driver-amount">
                  Amount
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D9E2EF] px-4 py-3">
                  <span className="text-sm text-slate-400">₹</span>
                  <input
                    id="driver-amount"
                    type="number"
                    min="0"
                    value={driverAmount}
                    onChange={(event) => setDriverAmount(event.target.value)}
                    required
                    className="w-full text-sm text-[#111827] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="driver-date">
                  Date
                </label>
                <input
                  id="driver-date"
                  type="date"
                  value={driverDate}
                  onChange={(event) => setDriverDate(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="driver-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="driver-notes"
                  rows={2}
                  value={driverNotes}
                  onChange={(event) => setDriverNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm text-[#111827]"
                />
              </div>
              {driverError && <p className="text-sm font-semibold text-rose-500">{driverError}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowDriverModal(false)
                  setEditingDriverId(null)
                  setDriverError('')
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-200"
                type="button"
                disabled={!isDriverValid}
                onClick={handleAddDriverExpense}
              >
                Save expense
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriverDelete && driverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete this expense?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This driver expense will be removed. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowDriverDelete(false)
                  setDriverToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDeleteDriverExpense}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showTollDelete && tollToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete toll entry?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This will remove the toll entry from the trip.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowTollDelete(false)
                  setTollToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDeleteToll}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
