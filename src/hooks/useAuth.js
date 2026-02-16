import { useCallback, useRef, useState } from 'react'
import { authApi, normalizeError } from '../api/index.js'

export const useAuth = () => {
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

  const requestOtp = useCallback(async (phoneE164) => {
    return run(() => authApi.requestOtp(phoneE164))
  }, [run])

  const verifyOtp = useCallback(async (phoneE164, otp) => {
    return run(() => authApi.verifyOtp(phoneE164, otp))
  }, [run])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: async () => data,
    create: requestOtp,
    update: verifyOtp,
    remove: async () => {
      throw new Error('Not supported')
    },
  }
}
