import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeError, subscriptionsApi } from '../api/index.js'

const getEndAt = (subscription) => {
  if (!subscription) return null
  return subscription.currentPeriodEnd || subscription.trialEndsAt || null
}

const getDaysLeft = (subscription) => {
  const endAt = getEndAt(subscription)
  if (!endAt) return null
  const diffMs = new Date(endAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export const useSubscription = (options = {}) => {
  const { auto = true } = options
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(auto)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(async (fn, { updateState = true } = {}) => {
    const isInitial = !hasLoadedRef.current
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const result = await fn()
      if (updateState) setData(result || null)
      hasLoadedRef.current = true
      return result || null
    } catch (err) {
      setError(normalizeError(err))
      throw err
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    return run(() => subscriptionsApi.getMySubscription())
  }, [run])

  const create = useCallback(async () => null, [])

  const update = useCallback(async () => {
    return refetch()
  }, [refetch])

  const remove = useCallback(async () => null, [])

  useEffect(() => {
    if (!auto) return
    refetch().catch(() => {})
  }, [auto, refetch])

  const status = String(data?.status || '').toUpperCase()
  const isTrial = status === 'TRIAL'
  const isActive = status === 'ACTIVE'
  const daysLeft = getDaysLeft(data)
  const isExpired = useMemo(() => {
    if (!data) return true
    if (isActive) {
      if (!data.currentPeriodEnd) return false
      return new Date(data.currentPeriodEnd).getTime() < Date.now()
    }
    if (isTrial) {
      if (!data.trialEndsAt) return true
      return new Date(data.trialEndsAt).getTime() < Date.now()
    }
    const endAt = getEndAt(data)
    if (!endAt) return true
    return new Date(endAt).getTime() < Date.now()
  }, [data, isActive, isTrial])

  const statusLabel = useMemo(() => {
    if (!data) return 'No plan'
    if (isExpired) return 'Expired'
    if (isTrial) return `Trial${daysLeft != null ? ` (${daysLeft} days left)` : ''}`
    const plan = String(data?.planCode || '').toUpperCase()
    return plan || status || 'Active'
  }, [data, isExpired, isTrial, daysLeft, status])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    create,
    update,
    remove,
    isTrial,
    isActive,
    isExpired,
    daysLeft,
    statusLabel,
  }
}
