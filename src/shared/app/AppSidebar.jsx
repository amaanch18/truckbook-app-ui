const defaultItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Trucks', path: '/trucks' },
  { label: 'Trips', path: '/app/trips' },
  { label: 'Settlements', path: '/app/settlements' },
  { label: 'Reports', path: '/app/reports' },
]

export default function AppSidebar({ active = 'Dashboard', disabledItems = [], onItemClick }) {
  return (
    <aside className="hidden w-60 border-r border-slate-200 bg-white p-4 md:block min-h-full self-stretch">
      <nav className="space-y-2 text-sm font-semibold">
        {defaultItems.map((item) => {
          const isDisabled = disabledItems.includes(item.label)
          const isActive = item.label === active
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onItemClick?.(item, isDisabled)}
              aria-disabled={isDisabled}
              className={`w-full rounded-lg px-3 py-2 text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : isDisabled
                    ? 'text-slate-300'
                    : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
