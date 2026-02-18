import { useEffect, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { normalizeError } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'
import { useTrips } from '../../hooks/useTrips.js'
import { useSubscription } from '../../hooks/useSubscription.js'

const truckTypes = ['Open', 'Container', 'Trailer', 'Tanker', 'Tipper', 'Other']

function normalizeTruckNumber(value) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.toUpperCase()
}

function isValidTruckNumber(value) {
  const compact = value.replace(/\s+/g, '')
  return compact.length >= 6
}

export default function AddTruckPage() {
  const [truckNumber, setTruckNumber] = useState('')
  const [truckType, setTruckType] = useState('')
  const [notes, setNotes] = useState('')
  const [compliance, setCompliance] = useState({
    insurance: { status: 'Missing', expiry: '' },
    permit: { status: 'Missing', expiry: '' },
    fitness: { status: 'Missing', expiry: '' },
  })
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [toast, setToast] = useState('')
  const [navToast, setNavToast] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)
  const numberRef = useRef(null)
  const typeRef = useRef(null)
  const notesRef = useRef(null)
  const modalRef = useRef(null)

  const { me } = useAuthSession()
  const { data: trucksData, create } = useTrucks()
  const { data: tripsData } = useTrips()
  const { data: subscription } = useSubscription()
  const planCode = String(subscription?.planCode || '').toUpperCase()
  const truckLimit = planCode === 'GROWTH' ? 10 : null
  const isTruckLimitReached =
    truckLimit != null && Number((trucksData || []).length || 0) >= truckLimit
  const truckLimitMessage =
    'Growth plan allows up to 10 trucks. Upgrade to Pro for unlimited trucks.'
  const hasTrucks = (trucksData || []).length > 0
  const hasTrips = (tripsData || []).length > 0

  const hasComplianceChange =
    compliance.insurance.status !== 'Missing' ||
    compliance.insurance.expiry ||
    compliance.permit.status !== 'Missing' ||
    compliance.permit.expiry ||
    compliance.fitness.status !== 'Missing' ||
    compliance.fitness.expiry
  const isDirty = truckNumber || truckType || notes || hasComplianceChange
  const isValid =
    normalizeTruckNumber(truckNumber).length > 0 &&
    isValidTruckNumber(truckNumber) &&
    truckType &&
    notes.length <= 200

  useEffect(() => {
    numberRef.current?.focus()
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

  const handleCancel = () => {
    if (!isDirty) {
      navigateTo('/trucks', { replace: true })
      return
    }
    setShowDiscard(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (isSaving) return
    if (isTruckLimitReached) {
      setToast(truckLimitMessage)
      window.setTimeout(() => setToast(''), 2400)
      return
    }
    const normalized = normalizeTruckNumber(truckNumber)
    const newErrors = {}
    if (!normalized || !isValidTruckNumber(normalized)) {
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
      await create({
        truckNumber: normalized,
        status: 'ACTIVE',
        notes: notes.trim(),
        truckType: truckType.toUpperCase(),
        compliance: {
          insurance: buildCompliance(compliance.insurance),
          permit: buildCompliance(compliance.permit),
          fitness: buildCompliance(compliance.fitness),
        },
      })
      setToast('Truck added')
      window.setTimeout(() => setToast(''), 2000)
      navigateTo('/trucks')
    } catch (err) {
      const normalizedError = normalizeError(err)
      if (normalizedError.status === 401) {
        navigateTo('/auth')
        return
      }
      if (normalizedError.status === 409) {
        setErrors({ truckNumber: 'Truck number already exists' })
      } else {
        setToast(normalizedError.message || 'Couldn’t save truck. Try again.')
        window.setTimeout(() => setToast(''), 2000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleNumberBlur = () => {
    setTruckNumber((value) => normalizeTruckNumber(value))
  }

  const handleNumberKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      typeRef.current?.focus()
    }
  }

  const handleTypeKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      notesRef.current?.focus()
    }
  }

  const handleNotesKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && isDesktop) {
      event.preventDefault()
      if (isValid) handleSave(event)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white">
      <AppNavbar
        businessName={me?.orgName || ''}
        onLogoClick={() => navigateTo('/dashboard')}
        onSettingsClick={() => navigateTo('/settings')}
        activePath="/trucks/new"
        onHamburgerClick={() => setIsDrawerOpen(true)}
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

        <main className="flex flex-1 items-start justify-center px-6 pt-8 pb-0 sm:pt-10 sm:pb-0">
          <div className="w-full max-w-[720px] rounded-2xl border border-[#E9EEF5] bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-8 lg:max-h-[600px] lg:overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[#111827]">Add Truck</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Save your truck details once and use it across trips.
                </p>
              </div>
              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#F0F7FF] text-xl text-[#2F66F6] sm:flex">
                🚚
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              {isTruckLimitReached && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  {truckLimitMessage}
                </div>
              )}
              <div>
                <label className="required text-sm font-semibold text-[#111827]" htmlFor="truckNumber">
                  Truck number
                </label>
                <input
                  ref={numberRef}
                  id="truckNumber"
                  value={truckNumber}
                  onChange={(event) => setTruckNumber(event.target.value.toUpperCase())}
                  onBlur={handleNumberBlur}
                  onKeyDown={handleNumberKey}
                  disabled={isSaving}
                  placeholder="e.g. MH 01 AB 1234"
                  required
                  aria-describedby={errors.truckNumber ? 'truck-number-error' : undefined}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-base uppercase text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />
                {errors.truckNumber && (
                  <p id="truck-number-error" className="mt-2 text-sm text-red-500">
                    {errors.truckNumber}
                  </p>
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
                  onKeyDown={handleTypeKey}
                  disabled={isSaving}
                  required
                  aria-describedby={errors.truckType ? 'truck-type-error' : undefined}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D9E2EF] px-4 text-base text-[#111827] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  <option value="">Select truck type</option>
                  {truckTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.truckType && (
                  <p id="truck-type-error" className="mt-2 text-sm text-red-500">
                    {errors.truckType}
                  </p>
                )}
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
                  disabled={isSaving}
                  placeholder="Add any details like model, capacity, tyre info…"
                  aria-describedby={errors.notes ? 'notes-error' : undefined}
                  className="mt-2 w-full rounded-xl border border-[#D9E2EF] px-4 py-3 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                  {errors.notes ? (
                    <span id="notes-error" className="text-red-500">
                      {errors.notes}
                    </span>
                  ) : (
                    <span />
                  )}
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
                <button
                  className="h-11 rounded-xl border border-[#D9E2EF] text-sm font-semibold text-[#111827]"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  className="flex h-11 items-center justify-center rounded-xl bg-[#2F66F6] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 lg:min-w-[160px]"
                  type="submit"
                  disabled={!isValid || isSaving || isTruckLimitReached}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Saving…
                    </span>
                  ) : (
                    'Save truck'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
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

      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={modalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Discard changes?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Your changes will be lost.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => setShowDiscard(false)}
              >
                Keep editing
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => {
                  setShowDiscard(false)
                  navigateTo('/trucks')
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
