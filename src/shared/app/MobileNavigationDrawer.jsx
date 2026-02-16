import { useEffect, useRef } from 'react'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Trucks', path: '/trucks', icon: '🚚' },
  { label: 'Trips', path: '/app/trips', icon: '🗺️' },
  { label: 'Settlements', path: '/app/settlements', icon: '💼' },
  { label: 'Reports', path: '/app/reports', icon: '📊' },
]

export default function MobileNavigationDrawer({
  isOpen,
  onClose,
  active = 'Dashboard',
  disabledItems = [],
  onItemClick,
  businessName,
}) {
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const focusable = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]
    first?.focus()

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
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
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleItemClick = (item) => {
    const isDisabled = disabledItems.includes(item.label)
    onItemClick?.(item, isDisabled)
    if (!isDisabled) {
      onClose?.()
    }
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div ref={drawerRef} className="absolute left-0 top-0 h-full w-[80%] bg-white shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <img className="h-7 w-7 object-contain" src="/logoIcon.png" alt="TruckBook logo" />
            <span className="font-display text-base font-semibold text-ink">TruckBook</span>
          </div>
          <button
            className="text-xl text-slate-500"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="py-2">
          {navItems.map((item) => {
            const isDisabled = disabledItems.includes(item.label)
            const isActive = active === item.label
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleItemClick(item)}
                aria-disabled={isDisabled}
                className={`flex h-12 w-full items-center gap-3 px-4 text-left text-base font-semibold ${
                  isActive
                    ? 'bg-[#F0F7FF] text-[#2563EB]'
                    : isDisabled
                      ? 'text-slate-300'
                      : 'text-slate-600'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-400">
          {businessName || 'Transport Business'}
        </div>
      </div>
    </div>
  )
}
