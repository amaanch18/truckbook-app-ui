import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { useTruckRepairs } from '../../hooks/useTruckRepairs.js'
import { useTruckTyres } from '../../hooks/useTruckTyres.js'
import { normalizeError, toDdMmYyyy } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

const todayISO = () => new Date().toISOString().split('T')[0]

const REPAIR_CATEGORIES = ['Repair', 'Service', 'Electrical', 'Battery', 'Other']
const TYRE_TYPES = ['New', 'Retread', 'Repair', 'Other']

function formatDate(value) {
  if (!value) return '—'
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const toIsoDate = (value) => {
  if (!value) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    return `${year}-${month}-${day}`
  }
  return value
}

const parseRepairDescription = (description = '') => {
  const match = description.match(
    /^(Repair|Service|Electrical|Battery|Other)\s*[:\-]\s*(.*)$/i,
  )
  if (!match) return { category: 'Repair', description }
  const category =
    REPAIR_CATEGORIES.find(
      (item) => item.toLowerCase() === match[1].toLowerCase(),
    ) || 'Repair'
  return { category, description: match[2] || '' }
}

const buildRepairDescription = (category, description) => {
  const trimmed = description.trim()
  if (!category) return trimmed
  if (!trimmed) return `${category}:`
  return `${category}: ${trimmed}`
}

const parseTyreNotes = (notes = '') => {
  const match = notes.match(/^Type:\s*([^|]+)\s*\|\s*(.*)$/i)
  if (!match) return { type: 'Other', notes }
  const type =
    TYRE_TYPES.find((item) => item.toLowerCase() === match[1].trim().toLowerCase()) ||
    'Other'
  return { type, notes: match[2] || '' }
}

const buildTyreNotes = (type, notes) => {
  const trimmed = notes.trim()
  return trimmed ? `Type: ${type} | ${trimmed}` : `Type: ${type}`
}

const parseTripDate = (value) => {
  if (!value) return new Date(0)
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-')
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  return new Date(value)
}

const sanitizeNonNegative = (value) => {
  if (value === '') return ''
  const next = Number(value)
  if (Number.isNaN(next) || next < 0) return null
  return value
}

export default function TruckDetailsPage({ truckId }) {
  const [truck, setTruck] = useState(null)
  const [trips, setTrips] = useState([])
  const [status, setStatus] = useState('loading')
  const [toast, setToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [navToast, setNavToast] = useState('')
  const [repairFilter, setRepairFilter] = useState('this')
  const [tyreFilter, setTyreFilter] = useState('this')
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [repairDate, setRepairDate] = useState('')
  const [repairCategory, setRepairCategory] = useState('Repair')
  const [repairAmount, setRepairAmount] = useState('')
  const [repairDescription, setRepairDescription] = useState('')
  const [repairVendor, setRepairVendor] = useState('')
  const [repairNotes, setRepairNotes] = useState('')
  const [repairError, setRepairError] = useState('')
  const [editingRepairId, setEditingRepairId] = useState(null)
  const [showRepairDelete, setShowRepairDelete] = useState(false)
  const [repairToDelete, setRepairToDelete] = useState(null)
  const [showTyreModal, setShowTyreModal] = useState(false)
  const [tyreDate, setTyreDate] = useState('')
  const [tyreType, setTyreType] = useState('New')
  const [tyreAmount, setTyreAmount] = useState('')
  const [tyreVendor, setTyreVendor] = useState('')
  const [tyreNotes, setTyreNotes] = useState('')
  const [tyreError, setTyreError] = useState('')
  const [editingTyreId, setEditingTyreId] = useState(null)
  const [showTyreDelete, setShowTyreDelete] = useState(false)
  const [tyreToDelete, setTyreToDelete] = useState(null)
  const deleteRef = useRef(null)
  const { me } = useAuthSession()
  const { getById, update, remove } = useTrucks({ auto: false })
  const { data: tripsData } = useTrips()
  const {
    data: repairLogsRaw,
    isLoading: repairLoading,
    isFetching: repairFetching,
    error: repairLoadError,
    refetch: refetchRepairs,
    create: createRepair,
    update: updateRepair,
    remove: removeRepair,
  } = useTruckRepairs(truckId)
  const {
    data: tyreLogsRaw,
    isLoading: tyreLoading,
    isFetching: tyreFetching,
    error: tyreLoadError,
    refetch: refetchTyres,
    create: createTyre,
    update: updateTyre,
    remove: removeTyre,
  } = useTruckTyres(truckId)
  const isActive = truck?.status !== 'INACTIVE'
  const hasTrucks = true
  const hasTrips = (tripsData || []).length > 0

  useEffect(() => {
    let isMounted = true
    setStatus('loading')
    getById(truckId)
      .then((found) => {
        if (!isMounted) return
        if (!found) {
          setStatus('not-found')
          return
        }
        setTruck(found)
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
  }, [truckId, getById])

  useEffect(() => {
    setTrips(tripsData || [])
  }, [tripsData])

  useEffect(() => {
    if (!showDelete) return
    const focusable = deleteRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') setShowDelete(false)
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

  const handleDelete = async () => {
    if (!truck) return
    try {
      await remove(truck.id)
      setToast('Truck deleted')
      window.setTimeout(() => setToast(''), 2000)
      navigateTo('/trucks')
    } catch (err) {
      const normalized = normalizeError(err)
      if (normalized.status === 409) {
        setToast('Can’t delete a truck with trips attached.')
      } else {
        setToast(normalized.message || 'Failed to delete truck')
      }
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const handleStatusChange = async (nextActive) => {
    if (!truck) return
    const nextStatus = nextActive ? 'ACTIVE' : 'INACTIVE'
    try {
      const updated = await update(truck.id, {
        truckNumber: truck.truckNumber,
        status: nextStatus,
        notes: truck.notes || '',
      })
      setTruck(updated)
      setToast(nextActive ? 'Truck marked active' : 'Truck marked inactive')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setToast(normalized.message || 'Failed to update status')
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const handleInactiveTripClick = () => {
    if (isActive) return
    setToast('Activate this truck to create a trip.')
    window.setTimeout(() => setToast(''), 2000)
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

  const filterLogs = (logs, filterKey) => {
    if (!logs || logs.length === 0) return []
    if (filterKey === 'all') return logs
    const now = new Date()
    if (filterKey === 'this') {
      return logs.filter((log) => {
        const date = new Date(log.date)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
    }
    if (filterKey === 'last3') {
      const threshold = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return logs.filter((log) => new Date(log.date) >= threshold)
    }
    return logs
  }

  const sortLogs = (logs) =>
    [...logs].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date)
      if (dateDiff !== 0) return dateDiff
      return Number(b.createdAt || 0) - Number(a.createdAt || 0)
    })

  const recentTrips = useMemo(() => {
    if (!truck) return []
    const filtered = trips
      .filter(
        (trip) =>
          trip.truckId === truck.id || (trip.truckNumber && trip.truckNumber === truck.truckNumber),
      )
      .sort((a, b) => {
        const dateA = parseTripDate(a.startDate || a.startedAt || a.createdAt)
        const dateB = parseTripDate(b.startDate || b.startedAt || b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 3)
    return filtered
  }, [trips, truck])

  const repairLogs = useMemo(() => {
    return (repairLogsRaw || []).map((entry) => {
      const parsed = parseRepairDescription(entry.description || '')
      return {
        id: entry.id,
        date: toIsoDate(entry.repairedOn),
        category: parsed.category,
        description: parsed.description,
        amount: entry.amount,
        vendor: entry.vendorName,
        notes: entry.notes,
        createdAt: entry.createdAt,
      }
    })
  }, [repairLogsRaw])

  const tyreLogs = useMemo(() => {
    return (tyreLogsRaw || []).map((entry) => {
      const parsed = parseTyreNotes(entry.notes || '')
      return {
        id: entry.id,
        date: toIsoDate(entry.purchasedOn),
        type: parsed.type,
        amount: entry.amount,
        vendor: entry.brand,
        notes: parsed.notes,
        createdAt: entry.createdAt,
      }
    })
  }, [tyreLogsRaw])

  const filteredRepairLogs = sortLogs(filterLogs(repairLogs, repairFilter))
  const filteredTyreLogs = sortLogs(filterLogs(tyreLogs, tyreFilter))
  const repairTotalThisMonth = filterLogs(repairLogs, 'this').reduce(
    (sum, log) => sum + Number(log.amount || 0),
    0,
  )
  const tyreTotalThisMonth = filterLogs(tyreLogs, 'this').reduce(
    (sum, log) => sum + Number(log.amount || 0),
    0,
  )
  const isRepairValid =
    repairCategory &&
    repairDescription.trim().length > 0 &&
    Number(repairAmount || 0) > 0
  const isTyreValid = tyreType && Number(tyreAmount || 0) > 0

  const handleSaveRepair = async () => {
    if (!truck) return
    const amountValue = Number(repairAmount || 0)
    if (!repairCategory || amountValue <= 0 || !repairDescription.trim()) {
      setRepairError('Enter a valid amount and description.')
      return
    }
    try {
      const payload = {
        repairedOn: toDdMmYyyy(repairDate || todayISO()),
        amount: Number(amountValue.toFixed(2)),
        vendorName: repairVendor.trim() || undefined,
        description: buildRepairDescription(repairCategory, repairDescription),
        notes: repairNotes.trim() || undefined,
      }
      if (editingRepairId) {
        await updateRepair(editingRepairId, payload)
      } else {
        await createRepair(payload)
      }
      setEditingRepairId(null)
      setRepairDate('')
      setRepairAmount('')
      setRepairDescription('')
      setRepairVendor('')
      setRepairNotes('')
      setRepairError('')
      setShowRepairModal(false)
      setToast(editingRepairId ? 'Expense updated' : 'Expense added')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setRepairError(normalized.message || 'Couldn’t save expense.')
      setToast(normalized.message || 'Failed to save expense')
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const handleEditRepair = (entry) => {
    setEditingRepairId(entry.id)
    setRepairDate(entry.date || '')
    setRepairCategory(entry.category || 'Repair')
    setRepairAmount(String(entry.amount || ''))
    setRepairDescription(entry.description || '')
    setRepairVendor(entry.vendor || '')
    setRepairNotes(entry.notes || '')
    setRepairError('')
    setShowRepairModal(true)
  }

  const handleDeleteRepair = async () => {
    if (!repairToDelete) return
    try {
      await removeRepair(repairToDelete.id)
      setRepairToDelete(null)
      setShowRepairDelete(false)
      setToast('Expense deleted')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setToast(normalized.message || 'Failed to delete expense')
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const handleSaveTyre = async () => {
    if (!truck) return
    const amountValue = Number(tyreAmount || 0)
    if (!tyreType || amountValue <= 0) {
      setTyreError('Enter a valid amount.')
      return
    }
    try {
      const payload = {
        purchasedOn: toDdMmYyyy(tyreDate || todayISO()),
        amount: Number(amountValue.toFixed(2)),
        brand: tyreVendor.trim() || undefined,
        notes: buildTyreNotes(tyreType, tyreNotes),
      }
      if (editingTyreId) {
        await updateTyre(editingTyreId, payload)
      } else {
        await createTyre(payload)
      }
      setEditingTyreId(null)
      setTyreDate('')
      setTyreAmount('')
      setTyreVendor('')
      setTyreNotes('')
      setTyreError('')
      setShowTyreModal(false)
      setToast(editingTyreId ? 'Expense updated' : 'Expense added')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setTyreError(normalized.message || 'Couldn’t save expense.')
      setToast(normalized.message || 'Failed to save expense')
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const handleEditTyre = (entry) => {
    setEditingTyreId(entry.id)
    setTyreDate(entry.date || '')
    setTyreType(entry.type || 'New')
    setTyreAmount(String(entry.amount || ''))
    setTyreVendor(entry.vendor || '')
    setTyreNotes(entry.notes || '')
    setTyreError('')
    setShowTyreModal(true)
  }

  const handleDeleteTyre = async () => {
    if (!tyreToDelete) return
    try {
      await removeTyre(tyreToDelete.id)
      setTyreToDelete(null)
      setShowTyreDelete(false)
      setToast('Expense deleted')
      window.setTimeout(() => setToast(''), 2000)
    } catch (err) {
      const normalized = normalizeError(err)
      setToast(normalized.message || 'Failed to delete expense')
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white md:h-screen md:overflow-hidden">
      <div className="flex min-h-screen flex-col md:h-full md:overflow-hidden">
        <AppNavbar
          businessName={me?.orgName || ''}
          onLogoClick={() => navigateTo('/dashboard')}
          onSettingsClick={() => navigateTo('/settings')}
          activePath="/trucks"
          onHamburgerClick={() => setIsDrawerOpen(true)}
          avatarVariant="brand"
        />
        <MobileNavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          active="Trucks"
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
          businessName={me?.orgName || ''}
        />

        <div className="flex flex-1 items-stretch md:h-[calc(100vh-72px)] md:overflow-hidden">
          <AppSidebar
            active="Trucks"
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

          <main className="flex flex-1 flex-col gap-4 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 md:h-full md:overflow-y-auto">
            <div className="mx-auto w-full max-w-full lg:max-w-[960px]">
            {status === 'loading' && (
              <div className="space-y-4">
                <div className="h-8 w-48 rounded-lg bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
              </div>
            )}

            {status === 'not-found' && (
              <div className="rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                <h1 className="text-xl font-semibold text-[#111827]">Truck not found</h1>
                <button
                  className="mt-4 h-11 rounded-xl bg-[#2F66F6] px-5 text-sm font-semibold text-white"
                  type="button"
                  onClick={() => navigateTo('/trucks')}
                >
                  Back to Trucks
                </button>
              </div>
            )}

            {status === 'ready' && truck && (
              <>
                <div className="flex flex-col gap-3">
                  <button
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500"
                    type="button"
                    onClick={() => navigateTo('/trucks')}
                  >
                    ← Trucks
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Trucks / {truck.truckNumber}
                      </p>
                      <h1 className="mt-2 text-3xl font-semibold text-[#111827]">
                        {truck.truckNumber}
                      </h1>
                      <p className="mt-2 text-sm text-[#6B7280]">
                        {(truck.truckType || 'Other')} {truck.notes ? `• ${truck.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="h-11 rounded-xl border border-[#D9E2EF] px-4 text-sm font-semibold text-[#111827]"
                        type="button"
                        onClick={() => navigateTo(`/trucks/${truck.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className={`h-11 rounded-xl px-4 text-sm font-semibold ${
                          isActive
                            ? 'bg-[#2F66F6] text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                        type="button"
                        onClick={() => {
                          if (!isActive) {
                            handleInactiveTripClick()
                            return
                          }
                          navigateTo(`/trips/new?truckId=${truck.id}`)
                        }}
                        aria-disabled={!isActive}
                      >
                        Create trip
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h2 className="text-base font-semibold text-[#111827]">Truck overview</h2>
                      <div className="mt-3 space-y-2 text-sm text-[#4B5563]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Truck number</span>
                          <span className="font-semibold text-[#111827]">{truck.truckNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Truck type</span>
                          <span className="inline-flex rounded-full bg-[#F0F7FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                            {truck.truckType || 'Other'}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-slate-500">Notes</span>
                          <span className="text-right text-[#111827]">
                            {truck.notes || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Status</span>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Added on</span>
                          <span className="text-[#111827]">{formatDate(truck.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-[#111827]">Recent trips</h2>
                        <button
                          className={`text-sm font-semibold ${
                            isActive ? 'text-[#2563EB]' : 'text-slate-400'
                          }`}
                          type="button"
                          onClick={() => {
                            if (!isActive) {
                              handleInactiveTripClick()
                              return
                            }
                            if (recentTrips.length > 0) {
                              navigateTo('/app/trips')
                              return
                            }
                            navigateTo(`/trips/new?truckId=${truck.id}`)
                          }}
                          aria-disabled={!isActive}
                        >
                          {recentTrips.length > 0 ? 'View all trips' : 'Create first trip'}
                        </button>
                      </div>
                      {recentTrips.length === 0 ? (
                        <div className="mt-4 text-sm text-[#6B7280]">
                          No trips for this truck yet.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {recentTrips.map((trip) => (
                            <button
                              key={trip.id}
                              className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left"
                              type="button"
                              onClick={() => navigateTo(`/app/trips/${trip.id}`)}
                            >
                              <p className="text-sm font-semibold text-[#111827]">
                                {trip.fromLocation || trip.from} → {trip.toLocation || trip.to}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>{formatDate(trip.startDate || trip.startedAt || trip.createdAt)}</span>
                                <span>•</span>
                                <span>{trip.status || 'Active'}</span>
                                <span>•</span>
                                <span className="font-semibold text-[#111827]">
                                  ₹{Number(trip.freightAmount ?? trip.freight ?? 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-[#111827]">
                            Repairs &amp; Maintenance
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Total (This month): ₹{repairTotalThisMonth}
                          </p>
                        </div>
                        <button
                          className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563EB]"
                          type="button"
                          onClick={() => {
                            setEditingRepairId(null)
                            setRepairDate('')
                            setRepairCategory('Repair')
                            setRepairAmount('')
                            setRepairDescription('')
                            setRepairVendor('')
                            setRepairNotes('')
                            setRepairError('')
                            setShowRepairModal(true)
                          }}
                        >
                          + Add expense
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { label: 'This month', key: 'this' },
                          { label: 'Last 3 months', key: 'last3' },
                          { label: 'All', key: 'all' },
                        ].map((chip) => (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => setRepairFilter(chip.key)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              repairFilter === chip.key
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      {filteredRepairLogs.length === 0 ? (
                        <div className="mt-4 text-sm text-slate-500">
                          No repair expenses recorded yet.
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 hidden text-xs font-semibold uppercase text-slate-400 md:grid md:grid-cols-[1fr_1fr_1.6fr_0.8fr_1fr_100px] md:gap-3">
                            <span>Date</span>
                            <span>Category</span>
                            <span>Description</span>
                            <span>Amount</span>
                            <span>Vendor</span>
                            <span></span>
                          </div>
                          <div className="mt-3 space-y-3">
                            {filteredRepairLogs.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm md:grid md:grid-cols-[1fr_1fr_1.6fr_0.8fr_1fr_100px] md:items-center md:gap-3"
                              >
                                <p className="text-slate-500">{formatDate(entry.date)}</p>
                                <p className="text-slate-700">{entry.category}</p>
                                <p className="mt-1 text-slate-700 md:mt-0">{entry.description}</p>
                                <p className="mt-1 font-semibold text-[#111827] md:mt-0">
                                  ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="mt-1 text-slate-500 md:mt-0">
                                  {entry.vendor || '—'}
                                </p>
                                <div className="mt-2 flex items-center gap-2 md:mt-0 md:justify-end">
                                  <button
                                    className="text-xs font-semibold text-slate-500"
                                    type="button"
                                    onClick={() => handleEditRepair(entry)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="text-xs font-semibold text-rose-500"
                                    type="button"
                                    onClick={() => {
                                      setRepairToDelete(entry)
                                      setShowRepairDelete(true)
                                    }}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-[#111827]">Tyre costs</h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Total (This month): ₹{tyreTotalThisMonth}
                          </p>
                        </div>
                        <button
                          className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                          type="button"
                          onClick={() => {
                            setEditingTyreId(null)
                            setTyreDate('')
                            setTyreType('New')
                            setTyreAmount('')
                            setTyreVendor('')
                            setTyreNotes('')
                            setTyreError('')
                            setShowTyreModal(true)
                          }}
                        >
                          + Add tyre expense
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { label: 'This month', key: 'this' },
                          { label: 'Last 3 months', key: 'last3' },
                          { label: 'All', key: 'all' },
                        ].map((chip) => (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => setTyreFilter(chip.key)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              tyreFilter === chip.key
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      {filteredTyreLogs.length === 0 ? (
                        <div className="mt-4 text-sm text-slate-500">
                          No tyre expenses recorded yet.
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 hidden text-xs font-semibold uppercase text-slate-400 md:grid md:grid-cols-[1fr_1fr_0.8fr_1fr_100px] md:gap-3">
                            <span>Date</span>
                            <span>Type</span>
                            <span>Amount</span>
                            <span>Vendor</span>
                            <span></span>
                          </div>
                          <div className="mt-3 space-y-3">
                            {filteredTyreLogs.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm md:grid md:grid-cols-[1fr_1fr_0.8fr_1fr_100px] md:items-center md:gap-3"
                              >
                                <p className="text-slate-500">{formatDate(entry.date)}</p>
                                <p className="text-slate-700">{entry.type}</p>
                                <p className="mt-1 font-semibold text-[#111827] md:mt-0">
                                  ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="mt-1 text-slate-500 md:mt-0">
                                  {entry.vendor || '—'}
                                </p>
                                <div className="mt-2 flex items-center gap-2 md:mt-0 md:justify-end">
                                  <button
                                    className="text-xs font-semibold text-slate-500"
                                    type="button"
                                    onClick={() => handleEditTyre(entry)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="text-xs font-semibold text-rose-500"
                                    type="button"
                                    onClick={() => {
                                      setTyreToDelete(entry)
                                      setShowTyreDelete(true)
                                    }}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h2 className="text-base font-semibold text-[#111827]">Quick actions</h2>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-xl border border-[#D9E2EF] p-2 lg:hidden">
                          <p className="text-xs font-semibold uppercase text-slate-400">Status</p>
                          <div className="mt-2 inline-flex rounded-xl border border-[#D9E2EF] bg-white p-1">
                            <button
                              className={`h-9 rounded-lg px-4 text-sm font-semibold ${
                                isActive
                                  ? 'bg-[#2F66F6] text-white'
                                  : 'text-[#6B7280] hover:text-[#111827]'
                              }`}
                              type="button"
                              onClick={() => handleStatusChange(true)}
                            >
                              Active
                            </button>
                            <button
                              className={`h-9 rounded-lg px-4 text-sm font-semibold ${
                                !isActive
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'text-[#6B7280] hover:text-[#111827]'
                              }`}
                              type="button"
                              onClick={() => handleStatusChange(false)}
                            >
                              Inactive
                            </button>
                          </div>
                        </div>
                        <button
                          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2F66F6] text-sm font-semibold text-white"
                          type="button"
                          onClick={() => navigateTo(`/trucks/${truck.id}/edit`)}
                        >
                          Edit truck
                        </button>
                        <button
                          className={`flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold ${
                            isActive
                              ? 'border-[#D9E2EF] text-[#111827]'
                              : 'border-slate-200 text-slate-400'
                          }`}
                          type="button"
                          onClick={() => {
                            if (!isActive) {
                              handleInactiveTripClick()
                              return
                            }
                            navigateTo(`/trips/new?truckId=${truck.id}`)
                          }}
                          aria-disabled={!isActive}
                        >
                          Create trip
                        </button>
                        <button
                          className="w-full text-sm font-semibold text-red-500"
                          type="button"
                          onClick={() => setShowDelete(true)}
                        >
                          Delete truck
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
                      <h2 className="text-lg font-semibold text-[#111827]">Documents & compliance</h2>
                      <div className="mt-4 space-y-3 text-sm text-[#4B5563]">
                        {[
                          { key: 'insurance', label: 'Insurance' },
                          { key: 'permit', label: 'Permit' },
                          { key: 'fitness', label: 'Fitness' },
                        ].map((item) => {
                          const normalizeStatus = (value) => {
                            if (!value) return 'Missing'
                            return value.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
                          }
                          const record =
                            item.key === 'insurance'
                              ? {
                                  status: normalizeStatus(truck.compliance?.insurance?.status),
                                  expiry: truck.compliance?.insurance?.expiryDate || '',
                                }
                              : item.key === 'permit'
                                ? {
                                    status: normalizeStatus(truck.compliance?.permit?.status),
                                    expiry: truck.compliance?.permit?.expiryDate || '',
                                  }
                                : {
                                    status: normalizeStatus(truck.compliance?.fitness?.status),
                                    expiry: truck.compliance?.fitness?.expiryDate || '',
                                  }
                          const statusClass =
                            record.status === 'Valid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : record.status === 'Expired'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-slate-100 text-slate-500'
                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="text-slate-500">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                                >
                                  {record.status}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {record.expiry
                                    ? record.expiry.split('T')[0]
                                    : 'No expiry date'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            </div>
          </main>
        </div>
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

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={deleteRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete truck?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              This will remove the truck from your list. Trips linked to it won’t be deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingRepairId ? 'Edit expense' : 'Add expense'}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="repair-date">
                  Date
                </label>
                <input
                  id="repair-date"
                  type="date"
                  value={repairDate}
                  onChange={(event) => setRepairDate(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="repair-category">
                  Category
                </label>
                <select
                  id="repair-category"
                  value={repairCategory}
                  onChange={(event) => setRepairCategory(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] bg-white px-3 py-2 text-sm text-[#111827]"
                >
                  <option value="Repair">Repair</option>
                  <option value="Service">Service</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Battery">Battery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="repair-amount">
                  Amount
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D9E2EF] px-4 py-3">
                  <span className="text-sm text-slate-400">₹</span>
                  <input
                    id="repair-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={repairAmount}
                    onChange={(event) => {
                      const next = sanitizeNonNegative(event.target.value)
                      if (next === null) return
                      setRepairAmount(next)
                    }}
                    required
                    className="w-full text-sm text-[#111827] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="repair-desc">
                  Description
                </label>
                <input
                  id="repair-desc"
                  value={repairDescription}
                  onChange={(event) => setRepairDescription(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                  placeholder="e.g. Brake service"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="repair-vendor">
                  Vendor (optional)
                </label>
                <input
                  id="repair-vendor"
                  value={repairVendor}
                  onChange={(event) => setRepairVendor(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                  placeholder="Garage name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="repair-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="repair-notes"
                  rows={2}
                  value={repairNotes}
                  onChange={(event) => setRepairNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm text-[#111827]"
                />
              </div>
              {repairError && <p className="text-sm font-semibold text-rose-500">{repairError}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowRepairModal(false)
                  setEditingRepairId(null)
                  setRepairError('')
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-200"
                type="button"
                disabled={!isRepairValid}
                onClick={handleSaveRepair}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showRepairDelete && repairToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete this expense?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Delete this repair expense? This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowRepairDelete(false)
                  setRepairToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDeleteRepair}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showTyreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingTyreId ? 'Edit tyre expense' : 'Add tyre expense'}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="tyre-date">
                  Date
                </label>
                <input
                  id="tyre-date"
                  type="date"
                  value={tyreDate}
                  onChange={(event) => setTyreDate(event.target.value)}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="tyre-type">
                  Type
                </label>
                <select
                  id="tyre-type"
                  value={tyreType}
                  onChange={(event) => setTyreType(event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] bg-white px-3 py-2 text-sm text-[#111827]"
                >
                  <option value="New">New</option>
                  <option value="Retread">Retread</option>
                  <option value="Repair">Repair</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="tyre-amount">
                  Amount
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D9E2EF] px-4 py-3">
                  <span className="text-sm text-slate-400">₹</span>
                  <input
                    id="tyre-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={tyreAmount}
                    onChange={(event) => {
                      const next = sanitizeNonNegative(event.target.value)
                      if (next === null) return
                      setTyreAmount(next)
                    }}
                    required
                    className="w-full text-sm text-[#111827] focus:outline-none"
                  />
                </div>
                {tyreError && <p className="mt-1 text-xs text-rose-500">{tyreError}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="tyre-vendor">
                  Vendor (optional)
                </label>
                <input
                  id="tyre-vendor"
                  value={tyreVendor}
                  onChange={(event) => setTyreVendor(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="tyre-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="tyre-notes"
                  rows={2}
                  value={tyreNotes}
                  onChange={(event) => setTyreNotes(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm text-[#111827]"
                />
              </div>
              {tyreError && <p className="text-sm font-semibold text-rose-500">{tyreError}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowTyreModal(false)
                  setEditingTyreId(null)
                  setTyreError('')
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-200"
                type="button"
                disabled={!isTyreValid}
                onClick={handleSaveTyre}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showTyreDelete && tyreToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Delete this expense?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Delete this tyre expense? This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowTyreDelete(false)
                  setTyreToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={handleDeleteTyre}
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
