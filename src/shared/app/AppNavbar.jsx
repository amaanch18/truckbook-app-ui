import { useEffect, useRef, useState } from 'react'
import { clearAll } from '../auth/authStorage.js'
import { useSubscription } from '../../hooks/useSubscription.js'

export default function AppNavbar({
  businessName,
  onLogoClick,
  onSettingsClick,
  onLogout,
  settingsLabel = 'Settings',
  activePath = '',
  onHamburgerClick,
  avatarVariant = 'brand',
  stickyDesktop = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const menuRef = useRef(null)
  const modalRef = useRef(null)
  const { data: subscription, isExpired, isTrial, daysLeft } = useSubscription()
  const isSettings = activePath.startsWith('/app/settings') || activePath.startsWith('/settings')
  const initials = businessName
    ? businessName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : ''

  useEffect(() => {
    if (!isMenuOpen) return
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (!showLogout) return
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowLogout(false)
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
  }, [showLogout])

  const handleSettingsClick = () => {
    if (isSettings) return
    onSettingsClick?.()
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    setShowLogout(true)
    setIsMenuOpen(false)
  }

  const handleManagePlan = () => {
    const url = new URL(window.location.href)
    url.pathname = '/pricing'
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
    setIsMenuOpen(false)
  }

  const confirmLogout = () => {
    clearAll()
    onLogout?.()
    const url = new URL(window.location.href)
    url.pathname = '/auth'
    url.search = ''
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('app:navigate'))
  }

  const planCode = String(subscription?.planCode || '').toUpperCase()
  const subscriptionStatus = String(subscription?.status || '').toUpperCase()
  const hideManagePlan = planCode === 'PRO' && subscriptionStatus === 'ACTIVE' && !isExpired
  const planLabel = isExpired
    ? `Plan: ${planCode || 'Trial'} (Expired)`
    : isTrial
      ? `Plan: Trial${daysLeft != null ? ` (${daysLeft} days left)` : ''}`
      : `Plan: ${planCode || '—'}`

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 ${
        stickyDesktop ? '' : 'md:relative'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          className="text-xl text-slate-600 md:hidden"
          type="button"
          onClick={onHamburgerClick}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <button
          className="flex items-center gap-3 text-left"
          type="button"
          onClick={onLogoClick}
          aria-label="Go to dashboard"
        >
          <img
            className="h-10 w-10 object-contain sm:h-14 sm:w-16"
            src="/logoIcon.png"
            alt="TruckBook logo"
          />
          <span className="font-display text-xl font-semibold text-ink">TruckBook</span>
        </button>
      </div>
      <div className="hidden items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm md:flex">
        {businessName || 'Transport Business'}
      </div>
      <div className="flex items-center gap-3">
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            avatarVariant === 'neutral'
              ? 'border border-slate-200 bg-slate-100 text-slate-600'
              : 'bg-[var(--brand-blue)] text-white'
          }`}
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          aria-label="Open account actions"
        >
          {initials || (
            <span className="text-lg">{avatarVariant === 'neutral' ? '👤' : '🚚'}</span>
          )}
        </button>
      </div>
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute right-6 top-14 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-lg"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400">
            {businessName || 'Transport Business'}
          </div>
          <button
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-semibold ${
              isSettings ? 'text-slate-400' : 'text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
            onClick={handleSettingsClick}
            aria-disabled={isSettings}
          >
            Settings
            {isSettings && <span className="text-emerald-500">✓</span>}
          </button>
          <button
            className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left font-semibold text-slate-600 hover:bg-slate-50"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500">
              <span>{planLabel}</span>
              {isExpired && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-500">
                  Expired
                </span>
              )}
            </div>
            {!hideManagePlan && (
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-left font-semibold text-blue-600 hover:bg-slate-50"
                type="button"
                onClick={handleManagePlan}
              >
                Manage Plan
              </button>
            )}
          </div>
        </div>
      )}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div ref={modalRef} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#111827]">Log out?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">You will be returned to the home page.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-xl border border-[#D9E2EF] px-4 py-2 text-sm font-semibold text-[#111827]"
                type="button"
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => {
                  setShowLogout(false)
                  confirmLogout()
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
