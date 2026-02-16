import { useCallback, useRef, useState } from 'react'
import { dashboardApi, normalizeError } from '../api/index.js'

export const useDashboard = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(async () => {
    const isInitial = !hasLoadedRef.current
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const result = await dashboardApi.getDashboard()
      setData(result)
      hasLoadedRef.current = true
      return result
    } catch (err) {
      setError(normalizeError(err))
      throw err
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: run,
    create: async () => {
      throw new Error('Not supported')
    },
    update: async () => {
      throw new Error('Not supported')
    },
    remove: async () => {
      throw new Error('Not supported')
    },
  }
}
