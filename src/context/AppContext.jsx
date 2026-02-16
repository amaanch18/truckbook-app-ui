import { createContext, useContext, useMemo, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installState, setInstallState] = useState('idle')

  const value = useMemo(
    () => ({
      installPrompt,
      setInstallPrompt,
      installState,
      setInstallState,
    }),
    [installPrompt, installState],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
