import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe as fetchMe } from '../../api/me.js'
import {
  EVENT_NAME,
  clearAll,
  getMe,
  getToken,
  setMe,
} from './authStorage.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => getToken())
  const [me, setMeState] = useState(() => getMe())
  const [isBootstrapping, setIsBootstrapping] = useState(false)

  useEffect(() => {
    const handleSync = () => {
      setTokenState(getToken())
      setMeState(getMe())
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener(EVENT_NAME, handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener(EVENT_NAME, handleSync)
    }
  }, [])

  const refreshMe = useCallback(async () => {
    if (!getToken()) return null
    setIsBootstrapping(true)
    try {
      const nextMe = await fetchMe()
      setMe(nextMe)
      setMeState(nextMe)
      return nextMe
    } finally {
      setIsBootstrapping(false)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    if (!me) {
      refreshMe().catch(() => {
        clearAll()
        setTokenState('')
        setMeState(null)
      })
    }
  }, [token, me, refreshMe])

  const logout = useCallback(() => {
    clearAll()
    setTokenState('')
    setMeState(null)
  }, [])

  const value = {
    token,
    me,
    setMe: (value) => {
      setMe(value)
      setMeState(value)
    },
    refreshMe,
    logout,
    isBootstrapping,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthSession = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthSession must be used within AuthProvider')
  }
  return context
}
