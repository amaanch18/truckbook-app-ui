export default function LaptopMock() {
  return (
    <div className="relative w-full max-w-md rounded-[36px] border border-deep/20 bg-white/90 p-6 shadow-2xl">
      <div className="absolute -right-6 -top-6 hidden h-20 w-20 rounded-full border border-deep/10 bg-white shadow-md md:flex md:items-center md:justify-center">
        <span className="h-10 w-10 rounded-full bg-slate-300/80" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img className="h-7 w-7" src="/logo.png" alt="Truckbook logo" />
          <span className="text-sm font-semibold text-ink">TruckBook</span>
        </div>
        <div className="text-xs font-semibold text-deep/60">Features</div>
      </div>
      <div className="mt-6 rounded-3xl bg-blue-600/10 p-6">
        <div className="flex items-center gap-3">
          <img className="h-14 w-14" src="/logo.png" alt="Truckbook logo" />
          <div>
            <p className="text-sm font-semibold text-ink">Fleet overview</p>
            <p className="text-xs text-deep/60">Live loads and payments</p>
          </div>
        </div>
        <div className="mt-5 h-28 rounded-2xl bg-white shadow-inner" />
      </div>
      <div className="mt-6 flex items-center justify-between text-xs text-deep/60">
        <span>Features</span>
        <span>How it works</span>
        <span>Pricing</span>
        <span>Contact</span>
      </div>
    </div>
  )
}
