import { useCallback, useRef, useState } from 'react'
import { normalizeError, onboardingApi } from '../api/index.js'

export const useOnboarding = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(async (fn) => {
    const isInitial = !hasLoadedRef.current
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const result = await fn()
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

  const create = useCallback(
    async (payload) => run(() => onboardingApi.completeOnboarding(payload)),
    [run],
  )

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: async () => data,
    create,
    update: async () => {
      throw new Error('Not supported')
    },
    remove: async () => {
      throw new Error('Not supported')
    },
  }
}
