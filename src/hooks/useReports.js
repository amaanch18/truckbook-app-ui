import { useCallback, useRef, useState } from 'react'
import { normalizeError, reportsApi } from '../api/index.js'

const withDefaults = (params = {}) => ({
  groupBy: params.groupBy || 'month',
  ...params,
})

export const useReports = () => {
  const [data, setData] = useState({
    overview: null,
    profit: null,
    operatingVsRevenue: null,
    lastParams: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasLoadedRef = useRef(false)

  const run = useCallback(async (fn, params) => {
    const isInitial = !hasLoadedRef.current
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const response = await fn(params)
      hasLoadedRef.current = true
      return response
    } catch (err) {
      setError(normalizeError(err))
      throw err
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [])

  const fetchOverview = useCallback(
    async (params = {}) => {
      const query = withDefaults(params)
      const overview = await run(reportsApi.getReportsOverview, query)
      setData((prev) => ({ ...prev, overview, lastParams: query }))
      return overview
    },
    [run],
  )

  const fetchProfit = useCallback(
    async (params = {}) => {
      const query = withDefaults(params)
      const profit = await run(reportsApi.getReportsProfit, query)
      setData((prev) => ({ ...prev, profit, lastParams: query }))
      return profit
    },
    [run],
  )

  const fetchOperatingVsRevenue = useCallback(
    async (params = {}) => {
      const query = withDefaults(params)
      const operatingVsRevenue = await run(reportsApi.getReportsOperatingVsRevenue, query)
      setData((prev) => ({ ...prev, operatingVsRevenue, lastParams: query }))
      return operatingVsRevenue
    },
    [run],
  )

  const refetch = useCallback(async () => {
    if (!data.lastParams) return null
    const params = data.lastParams
    const [overview, profit, operatingVsRevenue] = await Promise.all([
      reportsApi.getReportsOverview(params),
      reportsApi.getReportsProfit(params),
      reportsApi.getReportsOperatingVsRevenue(params),
    ])
    setData({ overview, profit, operatingVsRevenue, lastParams: params })
    return { overview, profit, operatingVsRevenue }
  }, [data.lastParams])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    fetchOverview,
    fetchProfit,
    fetchOperatingVsRevenue,
    create: null,
    update: null,
    remove: null,
  }
}
