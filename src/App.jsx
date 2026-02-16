import { useEffect, useState } from 'react'
import LandingHero from './modules/marketing/LandingHero.jsx'
import Navbar from './modules/marketing/Navbar.jsx'
import FeaturesPage from './modules/marketing/pages/FeaturesPage.jsx'
import HowItWorksPage from './modules/marketing/pages/HowItWorksPage.jsx'
import PricingPage from './modules/marketing/pages/PricingPage.jsx'
import AuthPage from './modules/auth/AuthPage.jsx'
import OtpPage from './modules/auth/OtpPage.jsx'
import OnboardingPage from './modules/onboarding/OnboardingPage.jsx'
import DashboardPage from './modules/dashboard/DashboardPage.jsx'
import SettingsPage from './modules/settings/SettingsPage.jsx'
import AddTruckPage from './modules/trucks/AddTruckPage.jsx'
import TrucksPage from './modules/trucks/TrucksPage.jsx'
import TruckDetailsPage from './modules/trucks/TruckDetailsPage.jsx'
import EditTruckPage from './modules/trucks/EditTruckPage.jsx'
import TripsPage from './modules/trips/TripsPage.jsx'
import CreateTripPage from './modules/trips/CreateTripPage.jsx'
import TripDetailsPage from './modules/trips/TripDetailsPage.jsx'
import EditTripPage from './modules/trips/EditTripPage.jsx'
import ReportsPage from './modules/reports/ReportsPage.jsx'
import SettlementsPage from './modules/settlements/SettlementsPage.jsx'
import SettlementNewPage from './modules/settlements/SettlementNewPage.jsx'
import SettlementDetailsPage from './modules/settlements/SettlementDetailsPage.jsx'
import { AppGuard, OnboardingGuard, PublicOnly } from './shared/auth/guards.jsx'

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const handleNav = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handleNav)
    window.addEventListener('app:navigate', handleNav)
    return () => {
      window.removeEventListener('popstate', handleNav)
      window.removeEventListener('app:navigate', handleNav)
    }
  }, [])

  if (pathname.startsWith('/auth')) {
    return (
      <PublicOnly>
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F8FAFC] to-[#E0F2FE]">
          <Navbar variant="auth" />
          {pathname.startsWith('/auth/otp') ? <OtpPage /> : <AuthPage />}
        </div>
      </PublicOnly>
    )
  }

  if (pathname.startsWith('/features')) {
    return (
      <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f1ea_45%,_#e6efff_100%)] text-ink">
        <div className="pointer-events-none absolute -top-32 right-12 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

        <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div
          className={`flex-1 overflow-y-auto ${
            isMenuOpen ? 'pointer-events-none blur-sm sm:pointer-events-auto sm:blur-none' : ''
          }`}
        >
          <FeaturesPage />
        </div>
      </div>
    )
  }

  if (pathname.startsWith('/how-it-works')) {
    return (
      <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f1ea_45%,_#e6efff_100%)] text-ink">
        <div className="pointer-events-none absolute -top-32 right-12 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

        <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div
          className={`flex-1 overflow-y-auto ${
            isMenuOpen ? 'pointer-events-none blur-sm sm:pointer-events-auto sm:blur-none' : ''
          }`}
        >
          <HowItWorksPage />
        </div>
      </div>
    )
  }

  if (pathname.startsWith('/pricing')) {
    return (
      <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f1ea_45%,_#e6efff_100%)] text-ink">
        <div className="pointer-events-none absolute -top-32 right-12 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

        <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div
          className={`flex-1 overflow-y-auto ${
            isMenuOpen ? 'pointer-events-none blur-sm sm:pointer-events-auto sm:blur-none' : ''
          }`}
        >
          <PricingPage />
        </div>
      </div>
    )
  }

  if (pathname.startsWith('/onboarding')) {
    return (
      <OnboardingGuard>
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#F8FAFC] to-[#E0F2FE]">
          <Navbar variant="auth" disableHome />
          <OnboardingPage />
        </div>
      </OnboardingGuard>
    )
  }

  if (pathname.startsWith('/dashboard')) {
    return (
      <AppGuard>
        <DashboardPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/dashboard')) {
    return (
      <AppGuard>
        <DashboardPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/settings')) {
    return (
      <AppGuard>
        <SettingsPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/settings')) {
    return (
      <AppGuard>
        <SettingsPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trucks/new') || pathname.startsWith('/trucks/new')) {
    return (
      <AppGuard>
        <AddTruckPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trips/new') || pathname.startsWith('/trips/new')) {
    return (
      <AppGuard>
        <CreateTripPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/settlements/new') || pathname.startsWith('/settlements/new')) {
    return (
      <AppGuard>
        <SettlementNewPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/settlements/') && pathname.length > '/app/settlements/'.length) {
    const settlementId = pathname.replace('/app/settlements/', '')
    return (
      <AppGuard>
        <SettlementDetailsPage settlementId={settlementId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/settlements/') && pathname.length > '/settlements/'.length) {
    const settlementId = pathname.replace('/settlements/', '')
    return (
      <AppGuard>
        <SettlementDetailsPage settlementId={settlementId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/settlements') || pathname.startsWith('/settlements')) {
    return (
      <AppGuard>
        <SettlementsPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/reports') || pathname.startsWith('/reports')) {
    return (
      <AppGuard>
        <ReportsPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trips/') && pathname.endsWith('/edit')) {
    const tripId = pathname.replace('/app/trips/', '').replace('/edit', '')
    return (
      <AppGuard>
        <EditTripPage tripId={tripId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/trips/') && pathname.endsWith('/edit')) {
    const tripId = pathname.replace('/trips/', '').replace('/edit', '')
    return (
      <AppGuard>
        <EditTripPage tripId={tripId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trips/') && pathname.length > '/app/trips/'.length) {
    const tripId = pathname.replace('/app/trips/', '')
    return (
      <AppGuard>
        <TripDetailsPage tripId={tripId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/trips/') && pathname.length > '/trips/'.length) {
    const tripId = pathname.replace('/trips/', '')
    return (
      <AppGuard>
        <TripDetailsPage tripId={tripId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trips') || pathname.startsWith('/trips')) {
    return (
      <AppGuard>
        <TripsPage />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/trucks/') && pathname.endsWith('/edit')) {
    const truckId = pathname.replace('/trucks/', '').replace('/edit', '')
    return (
      <AppGuard>
        <EditTruckPage truckId={truckId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trucks/') && pathname.endsWith('/edit')) {
    const truckId = pathname.replace('/app/trucks/', '').replace('/edit', '')
    return (
      <AppGuard>
        <EditTruckPage truckId={truckId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trucks/')) {
    const truckId = pathname.replace('/app/trucks/', '')
    return (
      <AppGuard>
        <TruckDetailsPage truckId={truckId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/trucks/') && !pathname.endsWith('/edit')) {
    const truckId = pathname.replace('/trucks/', '')
    return (
      <AppGuard>
        <TruckDetailsPage truckId={truckId} />
      </AppGuard>
    )
  }

  if (pathname.startsWith('/app/trucks') || pathname.startsWith('/trucks')) {
    return (
      <AppGuard>
        <TrucksPage />
      </AppGuard>
    )
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f1ea_45%,_#e6efff_100%)] text-ink">
      <div className="pointer-events-none absolute -top-32 right-12 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

      <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
      <div
        className={`flex-1 overflow-y-auto ${
          isMenuOpen ? 'pointer-events-none blur-sm sm:pointer-events-auto sm:blur-none' : ''
        }`}
      >
        <LandingHero />
      </div>
    </div>
  )
}
