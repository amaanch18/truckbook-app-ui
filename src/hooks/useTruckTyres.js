import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeError, truckTyresApi } from '../api/index.js'

export const useTruckTyres = (truckId) => {
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
    return run(() => truckTyresApi.listTruckTyres(truckId))
  }, [run, truckId])

  const create = useCallback(
    async (payload) => {
      if (!truckId) return null
      await truckTyresApi.createTruckTyre(truckId, payload)
      return refetch()
    },
    [truckId, refetch],
  )

  const update = useCallback(
    async (tyreId, payload) => {
      if (!truckId || !tyreId) return null
      await truckTyresApi.updateTruckTyre(truckId, tyreId, payload)
      return refetch()
    },
    [truckId, refetch],
  )

  const remove = useCallback(
    async (tyreId) => {
      if (!truckId || !tyreId) return null
      await truckTyresApi.deleteTruckTyre(truckId, tyreId)
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
