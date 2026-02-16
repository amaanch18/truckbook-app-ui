import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeError, tripsApi } from '../api/index.js'

export const useTrips = (params = {}, options = {}) => {
  const { auto = true } = options
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params])
  const stableParams = useMemo(() => params || {}, [paramsKey])
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(async (fn, { preserveData = false } = {}) => {
    const isInitial = !hasLoadedRef.current
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const result = await fn()
      if (!preserveData) {
        setData(Array.isArray(result) ? result : result ? [result] : [])
      }
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

  const refetch = useCallback(async () => {
    const response = await run(() => tripsApi.listTrips(stableParams))
    const list = Array.isArray(response) ? response : []
    setData(list)
    return list
  }, [run, stableParams])

  const create = useCallback(
    async (payload) => {
      const created = await run(() => tripsApi.createTrip(payload), { preserveData: true })
      setData((prev) => [created, ...prev])
      return created
    },
    [run],
  )

  const update = useCallback(
    async (id, payload) => {
      const updated = await run(() => tripsApi.updateTrip(id, payload), {
        preserveData: true,
      })
      setData((prev) => prev.map((item) => (item.id === id ? updated : item)))
      return updated
    },
    [run],
  )

  const complete = useCallback(
    async (id) => {
      const updated = await run(() => tripsApi.completeTrip(id), { preserveData: true })
      setData((prev) => prev.map((item) => (item.id === id ? updated : item)))
      return updated
    },
    [run],
  )

  const getById = useCallback(
    async (id) => {
      return run(() => tripsApi.getTrip(id), { preserveData: true })
    },
    [run],
  )

  const remove = useCallback(
    async (id) => {
      await run(() => tripsApi.deleteTrip(id), { preserveData: true })
      setData((prev) => prev.filter((item) => item.id !== id))
      return true
    },
    [run],
  )

  useEffect(() => {
    if (!auto) return
    refetch()
  }, [auto, refetch])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    create,
    update,
    remove,
    complete,
    getById,
  }
}
