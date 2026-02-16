import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeError, truckRepairsApi } from '../api/index.js'

export const useTruckRepairs = (truckId) => {
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
    if (!truckId) {
      setData([])
      return []
    }
    return run(() => truckRepairsApi.listTruckRepairs(truckId))
  }, [run, truckId])

  const create = useCallback(
    async (payload) => {
      if (!truckId) return null
      await truckRepairsApi.createTruckRepair(truckId, payload)
      return refetch()
    },
    [truckId, refetch],
  )

  const update = useCallback(
    async (repairId, payload) => {
      if (!truckId || !repairId) return null
      await truckRepairsApi.updateTruckRepair(truckId, repairId, payload)
      return refetch()
    },
    [truckId, refetch],
  )

  const remove = useCallback(
    async (repairId) => {
      if (!truckId || !repairId) return null
      await truckRepairsApi.deleteTruckRepair(truckId, repairId)
      return refetch()
    },
    [truckId, refetch],
  )

  useEffect(() => {
    if (!truckId) return
    refetch()
  }, [truckId, refetch])

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
