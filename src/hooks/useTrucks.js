import { useCallback, useEffect, useRef, useState } from 'react'
import { trucksApi, normalizeError } from '../api/index.js'

export const useTrucks = (options = {}) => {
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
    const response = await run(() => trucksApi.listTrucks())
    const list = Array.isArray(response) ? response : []
    setData(list)
    return list
  }, [run])

  const create = useCallback(
    async (payload) => {
      const created = await run(() => trucksApi.createTruck(payload), { preserveData: true })
      setData((prev) => [created, ...prev])
      return created
    },
    [run],
  )

  const update = useCallback(
    async (id, payload) => {
      const updated = await run(() => trucksApi.updateTruck(id, payload), {
        preserveData: true,
      })
      setData((prev) => prev.map((item) => (item.id === id ? updated : item)))
      return updated
    },
    [run],
  )

  const remove = useCallback(
    async (id) => {
      await run(() => trucksApi.deleteTruck(id), { preserveData: true })
      setData((prev) => prev.filter((item) => item.id !== id))
      return true
    },
    [run],
  )

  const getById = useCallback(
    async (id) => {
      return run(() => trucksApi.getTruck(id), { preserveData: true })
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
    getById,
  }
}
