import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeError, outstandingApi } from '../api/index.js'

export const useOutstanding = (mode = 'party', options = {}) => {
  const { auto = true } = options
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
    const response = await run(() => outstandingApi.getOutstandingSummary(mode))
    const list = Array.isArray(response) ? response : []
    setData(list)
    return list
  }, [run, mode])

  const getPartyTrips = useCallback(
    async (partyId) => run(() => outstandingApi.getPartyTrips(partyId), { preserveData: true }),
    [run],
  )

  const getPartyTrucks = useCallback(
    async (partyId) => run(() => outstandingApi.getPartyTrucks(partyId), { preserveData: true }),
    [run],
  )

  const getTruckTrips = useCallback(
    async (truckId) => run(() => outstandingApi.getTruckTrips(truckId), { preserveData: true }),
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
    create: null,
    update: null,
    remove: null,
    getPartyTrips,
    getPartyTrucks,
    getTruckTrips,
  }
}
