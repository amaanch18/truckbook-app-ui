import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeError, tripLogsApi } from '../api/index.js'

export const useTripTolls = (tripId) => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(
    async (fn) => {
      const isInitial = !hasLoadedRef.current
      setIsLoading(isInitial)
      setIsFetching(!isInitial)
      setError(null)
      try {
        const result = await fn()
        setData(Array.isArray(result) ? result : [])
        hasLoadedRef.current = true
        return result
      } catch (err) {
        setError(normalizeError(err))
        throw err
      } finally {
        setIsLoading(false)
        setIsFetching(false)
      }
    },
    [],
  )

  const refetch = useCallback(async () => {
    if (!tripId) {
      setData([])
      return []
    }
    return run(() => tripLogsApi.listTollLogs(tripId))
  }, [run, tripId])

  const create = useCallback(
    async (payload) => {
      if (!tripId) return null
      await tripLogsApi.createTollLog(tripId, payload)
      return refetch()
    },
    [tripId, refetch],
  )

  const update = useCallback(
    async (tollId, payload) => {
      if (!tripId || !tollId) return null
      await tripLogsApi.updateTollLog(tripId, tollId, payload)
      return refetch()
    },
    [tripId, refetch],
  )

  const remove = useCallback(
    async (tollId) => {
      if (!tripId || !tollId) return null
      await tripLogsApi.deleteTollLog(tripId, tollId)
      return refetch()
    },
    [tripId, refetch],
  )

  useEffect(() => {
    if (!tripId) return
    refetch()
  }, [tripId, refetch])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    create,
    update,
    remove,
  }
}
