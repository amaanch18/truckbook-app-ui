import { useEffect } from 'react'
import { useAuthSession } from './AuthContext.jsx'

const redirectTo = (path) => {
  const url = new URL(window.location.href)
  url.pathname = path
  url.search = ''
  window.history.replaceState({}, '', url)
  window.dispatchEvent(new Event('app:navigate'))
}

export function AuthGuard({ children }) {
  const { token, isBootstrapping } = useAuthSession()

  useEffect(() => {
    if (!token) redirectTo('/auth')
  }, [token])

  if (!token || isBootstrapping) return null
  return children
}

export function AppGuard({ children }) {
  const { token, me, isBootstrapping } = useAuthSession()

  useEffect(() => {
    if (token && me && !me.onboardingCompleted) redirectTo('/onboarding')
  }, [token, me])

  if (!token || isBootstrapping) return null
  if (me && !me.onboardingCompleted) return null
  return children
}

export function OnboardingGuard({ children }) {
  const { token, me, isBootstrapping } = useAuthSession()

  useEffect(() => {
    if (!token) redirectTo('/auth')
    if (token && me && me.onboardingCompleted) redirectTo('/dashboard')
  }, [token, me])

  if (!token || isBootstrapping) return null
  if (me && me.onboardingCompleted) return null
  return children
}

export function PublicOnly({ children }) {
  const { token, me, isBootstrapping } = useAuthSession()

  useEffect(() => {
    if (!token) return
    if (me && !me.onboardingCompleted) {
      redirectTo('/onboarding')
    } else if (me && me.onboardingCompleted) {
      redirectTo('/dashboard')
    }
  }, [token, me])

  if (token && isBootstrapping) return null
  if (token && me && !me.onboardingCompleted) return null
  if (token && me && me.onboardingCompleted) return null
  return children
}
