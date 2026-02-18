import { useEffect, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { normalizeError } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useTrips } from '../../hooks/useTrips.js'

const truckTypes = ['Open', 'Container', 'Trailer', 'Tanker', 'Tipper', 'Other']

function normalizeTruckNumber(value) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.toUpperCase()
}

function normalizeDate(value) {
  if (!value) return ''
  return value.includes('T') ? value.split('T')[0] : value
}

export default function EditTruckPage({ truckId }) {
  const [truckNumber, setTruckNumber] = useState('')
  const [truckType, setTruckType] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [compliance, setCompliance] = useState({
    insurance: { status: 'Missing', expiry: '' },
    permit: { status: 'Missing', expiry: '' },
    fitness: { status: 'Missing', expiry: '' },
  })
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [navToast, setNavToast] = useState('')
  const [truck, setTruck] = useState(null)
  const [pendingPath, setPendingPath] = useState('')
  const numberRef = useRef(null)
  const typeRef = useRef(null)
  const notesRef = useRef(null)
  const modalRef = useRef(null)

  const { me } = useAuthSession()
  const { getById, update } = useTrucks({ auto: false })
  const { data: tripsData } = useTrips()
  const hasTrucks = true
  const hasTrips = (tripsData || []).length > 0

  const isDirty =
    normalizeTruckNumber(truckNumber) !== (truck?.truckNumber || '') ||
    truckType !== (truck?.truckType || 'Other') ||
    notes !== (truck?.notes || '') ||
    isActive !== (truck?.status !== 'INACTIVE') ||
    JSON.stringify(compliance) !==
      JSON.stringify({
        insurance: {
          status: truck?.compliance?.insurance?.status
            ? truck.compliance.insurance.status
                .toLowerCase()
                .replace(/^\w/, (c) => c.toUpperCase())
            : 'Missing',
          expiry: truck?.compliance?.insurance?.expiryDate || '',
        },
        permit: {
          status: truck?.compliance?.permit?.status
            ? truck.compliance.permit.status
                .toLowerCase()
                .replace(/^\w/, (c) => c.toUpperCase())
            : 'Missing',
          expiry: truck?.compliance?.permit?.expiryDate || '',
        },
        fitness: {
          status: truck?.compliance?.fitness?.status
            ? truck.compliance.fitness.status
                .toLowerCase()
                .replace(/^\w/, (c) => c.toUpperCase())
            : 'Missing',
          expiry: truck?.compliance?.fitness?.expiryDate || '',
        },
      })

  const isValid =
    normalizeTruckNumber(truckNumber).length > 0 &&
    truckType &&
    notes.length <= 200

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
    let isMounted = true
    setIsLoading(true)
    getById(truckId)
      .then((found) => {
        if (!isMounted) return
        setTruck(found || null)
        if (found) {
          const normalizeTruckType = (value) => {
            if (!value) return 'Other'
            const key = String(value).toLowerCase()
            const map = {
              open: 'Open',
              container: 'Container',
              trailer: 'Trailer',
              tanker: 'Tanker',
              tipper: 'Tipper',
              other: 'Other',
            }
            return map[key] || value
          }
          setTruckNumber(found.truckNumber || '')
          setTruckType(normalizeTruckType(found.truckType))
          setNotes(found.notes || '')
          setIsActive(found.status !== 'INACTIVE')
          const normalizeStatus = (value) => {
            if (!value) return 'Missing'
            return value.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
          }
          setCompliance({
            insurance: {
              status: normalizeStatus(found.compliance?.insurance?.status),
              expiry: normalizeDate(found.compliance?.insurance?.expiryDate),
            },
            permit: {
              status: normalizeStatus(found.compliance?.permit?.status),
              expiry: normalizeDate(found.compliance?.permit?.expiryDate),
            },
            fitness: {
              status: normalizeStatus(found.compliance?.fitness?.status),
              expiry: normalizeDate(found.compliance?.fitness?.expiryDate),
            },
          })
        }
      })
      .catch((err) => {
        if (!isMounted) return
        const normalized = normalizeError(err)
        if (normalized.status === 401) {
          navigateTo('/auth')
          return
        }
        setTruck(null)
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [truckId])

  useEffect(() => {
    numberRef.current?.focus()
  }, [isLoading])

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
    const handleBeforeUnload = (event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

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

  const safeNavigate = (path) => {
    if (!isDirty) {
      navigateTo(path)
      return
    }
    setPendingPath(path)
    setShowDiscard(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const newErrors = {}
    const normalized = normalizeTruckNumber(truckNumber)
    if (!normalized) {
      newErrors.truckNumber = 'Enter a valid truck number'
    }
    if (!truckType) {
      newErrors.truckType = 'Select a truck type'
    }
    if (notes.length > 200) {
      newErrors.notes = "Notes can’t exceed 200 characters"
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    setIsSaving(true)
    try {
      const buildCompliance = (value) => {
        if (value.status === 'Missing') return { status: 'MISSING' }
        return {
          status: value.status.toUpperCase(),
          expiryDate: value.expiry || null,
        }
      }
      await update(truckId, {
        truckNumber: normalized,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        notes: notes.trim(),
        truckType: truckType.toUpperCase(),
        compliance: {
          insurance: buildCompliance(compliance.insurance),
          permit: buildCompliance(compliance.permit),
          fitness: buildCompliance(compliance.fitness),
        },
      })
      navigateTo(`/trucks/${truckId}`, { replace: true })
    } catch (err) {
      const normalizedError = normalizeError(err)
      if (normalizedError.status === 401) {
        navigateTo('/auth')
        return
      }
      if (normalizedError.status === 409) {
        setErrors({ truckNumber: 'This truck number already exists.' })
      } else {
        setErrors({ form: normalizedError.message || 'Failed to save changes.' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotesKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && isDesktop) {
      event.preventDefault()
      if (isValid) handleSave(event)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white">
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
        <div className="flex">
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
          <main className="flex flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
            <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-8 shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <div className="h-6 w-40 rounded-lg bg-slate-100" />
              <div className="mt-6 space-y-4">
                <div className="h-11 rounded-xl bg-slate-100" />
                <div className="h-11 rounded-xl bg-slate-100" />
                <div className="h-32 rounded-xl bg-slate-100" />
              </div>
            </div>
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

  if (!truck) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white">
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
        <div className="flex">
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
          <main className="flex flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
            <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-8 text-center shadow-[0_16px_32px_rgba(0,0,0,0.06)]">
              <h1 className="text-lg font-semibold text-[#111827]">Truck not found</h1>
              <button
                className="mt-4 h-11 rounded-xl bg-[#2F66F6] px-5 text-sm font-semibold text-white"
                type="button"
                onClick={() => navigateTo('/trucks')}
              >
                Back to Trucks
              </button>
            </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white">
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
          safeNavigate(item.path)
        }}
        businessName={me?.orgName || ''}
      />

      <div className="flex">
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
            safeNavigate(item.path)
          }}
        />

        <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-0 sm:px-6 sm:pt-10 sm:pb-0">
          <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-8 lg:max-h-[580px] lg:overflow-y-auto">
            <div className="text-sm text-slate-400">
              <button className="font-semibold text-[#2563EB]" type="button" onClick={() => safeNavigate('/trucks')}>
                Trucks
              </button>{' '}
              / {truck.truckNumber} / Edit
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[#111827]">Edit truck</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Update truck details.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="truckNumber">
                  Truck number
                </label>
                <input
                  ref={numberRef}
                  id="truckNumber"
                  value={truckNumber}
                  onChange={(event) => setTruckNumber(event.target.value.toUpperCase())}
                  disabled={isSaving}
                  placeholder="e.g. MH 12 AB 1234"
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-base uppercase text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
                {errors.truckNumber && (
                  <p className="mt-2 text-sm text-red-500">{errors.truckNumber}</p>
                )}
              </div>

              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="truckType">
                  Truck type
                </label>
                <select
                  ref={typeRef}
                  id="truckType"
                  value={truckType}
                  onChange={(event) => setTruckType(event.target.value)}
                  disabled={isSaving}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-base text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select truck type</option>
                  {truckTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.truckType && (
                  <p className="mt-2 text-sm text-red-500">{errors.truckType}</p>
                )}
              </div>

              <div>
                <span className="text-sm font-semibold text-[#111827]">Status</span>
                <div className="mt-2 inline-flex rounded-xl border border-[#D9E2EF] bg-white p-1">
                  <button
                    className={`h-9 rounded-lg px-4 text-sm font-semibold ${
                      isActive
                        ? 'bg-[#2F66F6] text-white'
                        : 'text-[#6B7280] hover:text-[#111827]'
                    }`}
                    type="button"
                    onClick={() => setIsActive(true)}
                    disabled={isSaving}
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
                    onClick={() => setIsActive(false)}
                    disabled={isSaving}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#111827]" htmlFor="notes">
                  Notes (optional)
                </label>
                <textarea
                  ref={notesRef}
                  id="notes"
                  rows={isDesktop ? 4 : 3}
                  value={notes}
                  onChange={(event) => {
                    const next = event.target.value
                    setNotes(next)
                    if (next.length > 200) {
                      setErrors((prev) => ({ ...prev, notes: "Notes can’t exceed 200 characters" }))
                    } else {
                      setErrors((prev) => {
                        if (!prev.notes) return prev
                        const { notes: _ignored, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  onKeyDown={handleNotesKey}
                  placeholder="Add any details like model, capacity, tyre info…"
                  disabled={isSaving}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-3 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                  {errors.notes ? <span className="text-red-500">{errors.notes}</span> : <span />}
                  <span>{notes.length}/200</span>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-[#111827]">Documents & compliance</h2>
                <div className="mt-3 space-y-3">
                  {[
                    { key: 'insurance', label: 'Insurance' },
                    { key: 'permit', label: 'Permit' },
                    { key: 'fitness', label: 'Fitness' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-[#D9E2EF] bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#111827]">{item.label}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={compliance[item.key].status}
                            onChange={(event) =>
                              setCompliance((prev) => ({
                                ...prev,
                                [item.key]: {
                                  ...prev[item.key],
                                  status: event.target.value,
                                },
                              }))
                            }
                            disabled={isSaving}
                            className="h-10 rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="Missing">Missing</option>
                            <option value="Valid">Valid</option>
                            <option value="Expired">Expired</option>
                          </select>
                          <input
                            type="date"
                            value={compliance[item.key].expiry}
                            onChange={(event) =>
                              setCompliance((prev) => ({
                                ...prev,
                                [item.key]: {
                                  ...prev[item.key],
                                  expiry: event.target.value,
                                },
                              }))
                            }
                            disabled={isSaving}
                            className="h-10 rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
                {errors.form && (
                  <p className="text-sm text-red-500 sm:mr-auto">{errors.form}</p>
                )}
                <button
                  className="h-11 rounded-xl border border-[#D9E2EF] text-sm font-semibold text-[#111827]"
                  type="button"
                  onClick={() => safeNavigate(`/trucks/${truckId}`)}
                >
                  Cancel
                </button>
                <button
                  className="flex h-11 items-center justify-center rounded-xl bg-[#2F66F6] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 lg:min-w-[180px]"
                  type="submit"
                  disabled={!isValid || isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Saving…
                    </span>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {navToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink z-[60] px-4 py-2 text-sm text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-20 md:translate-x-0">
          {navToast}
        </div>
      )}

      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={modalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Discard changes?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">You have unsaved changes.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => {
                  setShowDiscard(false)
                  setPendingPath('')
                }}
              >
                Stay
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => {
                  setShowDiscard(false)
                  if (pendingPath) navigateTo(pendingPath)
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
