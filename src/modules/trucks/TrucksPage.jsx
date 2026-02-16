import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../../shared/app/AppNavbar.jsx'
import AppSidebar from '../../shared/app/AppSidebar.jsx'
import MobileNavigationDrawer from '../../shared/app/MobileNavigationDrawer.jsx'
import { useTrucks } from '../../hooks/useTrucks.js'
import { useTrips } from '../../hooks/useTrips.js'
import { normalizeError } from '../../api/index.js'
import { useAuthSession } from '../../shared/auth/AuthContext.jsx'

const truckTypes = ['All types', 'Open', 'Container', 'Trailer', 'Tanker', 'Tipper', 'Other']
const sortOptions = ['Recently added', 'Truck number A–Z', 'Truck number Z–A']

function normalizeSearch(value) {
  return value.replace(/\s+/g, '').toLowerCase()
}

export default function TrucksPage() {
  const [toast, setToast] = useState('')
  const [navToast, setNavToast] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [sort, setSort] = useState('Recently added')
  const [activeMenuId, setActiveMenuId] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const [showDelete, setShowDelete] = useState(null)
  const deleteRef = useRef(null)
  const { me } = useAuthSession()
  const { data: apiTrucks, isLoading, error: apiError, remove } = useTrucks()
  const { data: tripsData } = useTrips()
  const trucks = apiTrucks || []
  const hasTrips = (tripsData || []).length > 0

  useEffect(() => {
    if (!apiError) return
    if (apiError.status === 401) {
      navigateTo('/auth')
      return
    }
    setToast(apiError.message || 'Failed to load trucks')
    window.setTimeout(() => setToast(''), 2000)
  }, [apiError])


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!activeMenuId) return
    const handleClick = (event) => {
      const target = event.target
      const element = target instanceof Element ? target : target.parentElement
      if (element && element.closest('[data-menu]')) return
      setActiveMenuId('')
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [activeMenuId])

  useEffect(() => {
    if (!showDelete) return
    const focusable = deleteRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowDelete(null)
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

  const filteredTrucks = useMemo(() => {
    let result = [...trucks]
    const query = normalizeSearch(debouncedSearch)
    if (query) {
      result = result.filter((truck) =>
        normalizeSearch(truck.truckNumber).includes(query),
      )
    }
    if (typeFilter !== 'All types') {
      result = result.filter(
        (truck) => (truck.truckType || 'Other') === typeFilter,
      )
    }
    if (sort === 'Truck number A–Z') {
      result.sort((a, b) => a.truckNumber.localeCompare(b.truckNumber))
    }
    if (sort === 'Truck number Z–A') {
      result.sort((a, b) => b.truckNumber.localeCompare(a.truckNumber))
    }
    if (sort === 'Recently added') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    return result
  }, [trucks, debouncedSearch, typeFilter, sort])

  const handleDelete = async () => {
    if (!showDelete) return
    try {
      await remove(showDelete.id)
      setShowDelete(null)
      setToast('Truck deleted')
      window.setTimeout(() => setToast(''), 2000)
    } catch (error) {
      const normalized = normalizeError(error)
      setShowDelete(null)
      if (normalized.status === 409) {
        setToast('Can’t delete a truck with trips attached.')
      } else {
        setToast(normalized.message || 'Failed to delete truck')
      }
      window.setTimeout(() => setToast(''), 2000)
    }
  }

  const clearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
  }

  const openMenu = (event, id) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const menuHeight = 150
    const gap = 8
    const bottom = rect.bottom + gap
    const top = rect.top - menuHeight - gap
    const nextTop = bottom + menuHeight > window.innerHeight ? Math.max(16, top) : bottom
    setMenuPosition({
      top: nextTop,
      right: Math.max(16, window.innerWidth - rect.right),
    })
    setActiveMenuId((value) => (value === id ? '' : id))
  }

  const emptyState = !isLoading && trucks.length === 0
  const noMatches = !isLoading && trucks.length > 0 && filteredTrucks.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] to-white">
      <div className="flex min-h-screen flex-col">
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
            trucks.length === 0
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

        <div className="flex flex-1 items-stretch">
          <AppSidebar
            active="Trucks"
            disabledItems={
              trucks.length === 0
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

          <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden px-4 pt-6 pb-0 sm:px-6 sm:pt-10 sm:pb-0">
            <div className="w-full max-w-full lg:mx-auto lg:max-w-[720px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[#111827]">Trucks</h1>
                <p className="mt-1 text-sm text-[#6B7280]">All your trucks in one place.</p>
              </div>
              <button
                className="h-11 w-full rounded-xl bg-[#2F66F6] px-4 text-sm font-semibold text-white sm:w-auto"
                type="button"
                onClick={() => navigateTo('/trucks/new')}
              >
                + Add truck
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">🔍</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by truck number…"
                  className="h-11 w-full rounded-xl border border-[#D9E2EF] pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2F66F6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                <select
                  className="h-11 w-full rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] sm:w-auto"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  {truckTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 w-full rounded-xl border border-[#D9E2EF] px-3 text-sm text-[#111827] sm:w-auto"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  {sortOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 sm:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {truckTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                      typeFilter === type
                        ? 'bg-[#F0F7FF] text-[#2563EB]'
                        : 'bg-white text-[#6B7280]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 w-full rounded-2xl border border-[#E9EEF5] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.06)] sm:p-6">
              {isLoading && (
                <>
                  <div className="hidden space-y-4 lg:block">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`skeleton-row-${index}`} className="h-16 rounded-xl bg-slate-100" />
                    ))}
                  </div>
                  <div className="space-y-3 lg:hidden">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`skeleton-card-${index}`} className="h-24 rounded-xl bg-slate-100" />
                    ))}
                  </div>
                </>
              )}

              {emptyState && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0F7FF] text-xl text-[#2F66F6]">
                    🚚
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-[#111827]">No trucks added yet</h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Add your first truck to start creating trips.
                  </p>
                  <button
                    className="mt-4 h-11 rounded-xl bg-[#2F66F6] px-5 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => navigateTo('/trucks/new')}
                  >
                    Add your first truck
                  </button>
                </div>
              )}

              {noMatches && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h2 className="text-lg font-semibold text-[#111827]">No matching trucks</h2>
                  <button
                    className="mt-2 text-sm font-semibold text-[#2563EB]"
                    type="button"
                    onClick={clearSearch}
                  >
                    Clear search
                  </button>
                </div>
              )}

              {!isLoading && !emptyState && !noMatches && (
                <div className="max-h-[290px] space-y-2 overflow-y-auto pr-1 sm:max-h-[390px] lg:max-h-[430px]">
                  <div className="sticky top-0 z-10 hidden grid-cols-[1.4fr_1fr_2fr_60px] gap-4 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-3 text-xs font-semibold uppercase text-slate-400 backdrop-blur lg:grid">
                    <span>Truck number</span>
                    <span>Type</span>
                    <span>Notes</span>
                    <span />
                  </div>
                  {filteredTrucks.map((truck) => {
                    const isActive = truck.status !== 'INACTIVE'
                    const truckTypeLabel = truck.truckType || 'Other'
                    return (
                    <div
                      key={truck.id}
                      className={`rounded-xl border border-slate-100 px-4 py-3 hover:bg-[#F7FAFF] cursor-pointer ${
                        !isActive ? 'opacity-70' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        if (event.defaultPrevented) return
                        const target = event.target
                        const element =
                          target instanceof Element ? target : target.parentElement
                        if (element && element.closest('[data-menu]')) return
                        navigateTo(`/trucks/${truck.id}`)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') navigateTo(`/trucks/${truck.id}`)
                      }}
                    >
                      <div className="hidden grid-cols-[1.4fr_1fr_2fr_60px] items-center gap-4 lg:grid">
                        <span className="font-semibold text-[#111827]">{truck.truckNumber}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#F0F7FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                            {truckTypeLabel}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <span className="truncate text-sm text-[#6B7280]">
                          {truck.notes || '—'}
                        </span>
                        <div className="relative text-right">
                          <button
                            data-menu
                            className="text-xl text-slate-400"
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              openMenu(event, truck.id)
                            }}
                          >
                            ⋯
                          </button>
                          {activeMenuId === truck.id && (
                            <div
                              data-menu
                              className="fixed z-[70] w-40 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg"
                              style={{ top: menuPosition.top, right: menuPosition.right }}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                data-menu
                                className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  navigateTo(`/trucks/${truck.id}`)
                                }}
                              >
                                View details
                              </button>
                              <button
                                data-menu
                                className="w-full rounded-lg px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  navigateTo(`/trucks/${truck.id}/edit`)
                                }}
                              >
                                Edit truck
                              </button>
                              <button
                                data-menu
                                className="w-full rounded-lg px-3 py-2 text-left text-red-500 hover:bg-red-50"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setShowDelete(truck)
                                  setActiveMenuId('')
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:hidden">
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-[#111827]">{truck.truckNumber}</span>
                          <button
                            data-menu
                            className="text-xl text-slate-400"
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              setActiveMenuId((value) => (value === truck.id ? '' : truck.id))
                            }}
                          >
                            ⋯
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-[#F0F7FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                            {truckTypeLabel}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-sm text-[#6B7280]">
                            {truck.notes || 'No notes'}
                          </span>
                        </div>
                        {activeMenuId === truck.id && (
                          <div
                            data-menu
                            className="flex gap-2 rounded-xl border border-slate-200 p-2 text-sm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              data-menu
                              className="flex-1 rounded-lg px-3 py-2 text-slate-600"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                navigateTo(`/trucks/${truck.id}`)
                              }}
                            >
                              View
                            </button>
                            <button
                              data-menu
                              className="flex-1 rounded-lg px-3 py-2 text-slate-600"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                navigateTo(`/trucks/${truck.id}/edit`)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              data-menu
                              className="flex-1 rounded-lg px-3 py-2 text-red-500"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setShowDelete(truck)
                                setActiveMenuId('')
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
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
                onClick={() => setShowDelete(null)}
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
    </div>
  )
}
