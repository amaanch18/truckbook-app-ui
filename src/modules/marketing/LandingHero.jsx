import HeroContent from './components/HeroContent.jsx'

export default function LandingHero() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-20 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
      <div className="relative z-10">
        <HeroContent />
      </div>
      <div className="pointer-events-none relative hidden h-full items-center justify-center lg:flex">
        <div className="flex h-[420px] w-[420px] items-center justify-center rounded-full bg-white/80 shadow-2xl">
          <img
            className="h-[320px] w-[320px] object-contain"
            src="/logo.png"
            alt="Truckbook logo"
          />
        </div>
      </div>
    </main>
  )
}
