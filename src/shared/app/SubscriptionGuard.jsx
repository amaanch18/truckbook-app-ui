import { useEffect } from 'react'
import { useSubscription } from '../../hooks/useSubscription.js'

const isDashboardPath = (pathname) =>
  pathname.startsWith('/dashboard') || pathname.startsWith('/app/dashboard')

const redirectToDashboardPaywall = () => {
  const next = `${window.location.pathname}${window.location.search}`
  const url = new URL(window.location.href)
  url.pathname = window.location.pathname.startsWith('/app') ? '/app/dashboard' : '/dashboard'
  url.search = `?paywall=1&next=${encodeURIComponent(next)}`
  sessionStorage.setItem('truckbook.toast', 'Your trial has ended. Please choose a plan.')
  window.history.replaceState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

export default function SubscriptionGuard({ children }) {
  const { data, isLoading, isFetching, error, isActive, isTrial, isExpired } =
    useSubscription()
  const blocked = !data || isExpired || (!isActive && !isTrial)
  const onDashboard = isDashboardPath(window.location.pathname)

  useEffect(() => {
    if (error?.status === 401) return
    if (isLoading || isFetching) return
    if (blocked && !onDashboard) {
      redirectToDashboardPaywall()
    }
  }, [blocked, error, isLoading, isFetching, onDashboard])

  if (error?.status === 401) return null
  if (isLoading || isFetching) return null
  if (blocked && !onDashboard) return null

  return children
}

export { redirectToDashboardPaywall }
