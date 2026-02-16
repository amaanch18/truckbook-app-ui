export default function PhoneMock() {
  return (
    <div className="relative hidden w-40 shrink-0 md:block">
      <div className="rounded-[32px] border border-deep/20 bg-white/90 p-5 shadow-xl">
        <div className="flex items-center justify-between text-xs text-deep/60">
          <span>9:41</span>
          <span>LTE</span>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <img className="h-6 w-6" src="/logo.png" alt="Truckbook logo" />
          <span className="text-sm font-semibold text-ink">TruckBook</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-ink">
          Manage your trucks, drivers and money —
        </p>
        <p className="mt-2 text-xs text-deep/70">Track trips, fuel and payments.</p>
        <div className="mt-4 rounded-xl bg-blue-600 py-2 text-center text-xs font-semibold text-white">
          Start Free
        </div>
        <div className="mt-3 rounded-xl border border-emerald-700/40 py-2 text-center text-xs font-semibold text-emerald-700">
          Talk on WhatsApp
        </div>
      </div>
    </div>
  )
}
