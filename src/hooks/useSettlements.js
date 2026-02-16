import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeError, settlementsApi } from '../api/index.js'

export const useSettlements = (params = {}, options = {}) => {
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
    const response = await run(() => settlementsApi.listSettlements(stableParams))
    const list = Array.isArray(response) ? response : []
    setData(list)
    return list
  }, [run, stableParams])

  const create = useCallback(
    async (payload) => {
      const created = await run(() => settlementsApi.createSettlement(payload), {
        preserveData: true,
      })
      setData((prev) => [created, ...prev])
      return created
    },
    [run],
  )

  const getById = useCallback(
    async (id) => run(() => settlementsApi.getSettlement(id), { preserveData: true }),
    [run],
  )

  const allocate = useCallback(
    async (id, payload) =>
      run(() => settlementsApi.postAllocations(id, payload), { preserveData: true }),
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
    update: null,
    remove: null,
    getById,
    allocate,
  }
}
