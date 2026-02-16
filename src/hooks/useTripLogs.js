import { useCallback, useState } from 'react'
import { normalizeError, tripLogsApi } from '../api/index.js'

export const useTripLogs = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (fn) => {
    const isInitial = !isFetching && !isLoading && !data
    setIsLoading(isInitial)
    setIsFetching(!isInitial)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      setError(normalizeError(err))
      throw err
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [data, isFetching, isLoading])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: async (tripId) => {
      const [fuel, tolls, driver] = await Promise.all([
        tripLogsApi.listFuelLogs(tripId),
        tripLogsApi.listTollLogs(tripId),
        tripLogsApi.listDriverExpenses(tripId),
      ])
      const next = { fuel, tolls, driver }
      setData(next)
      return next
    },
    listFuel: (tripId) => run(() => tripLogsApi.listFuelLogs(tripId)),
    createFuel: (tripId, payload) => run(() => tripLogsApi.createFuelLog(tripId, payload)),
    updateFuel: (tripId, fuelId, payload) =>
      run(() => tripLogsApi.updateFuelLog(tripId, fuelId, payload)),
    deleteFuel: (tripId, fuelId) => run(() => tripLogsApi.deleteFuelLog(tripId, fuelId)),
    listTolls: (tripId) => run(() => tripLogsApi.listTollLogs(tripId)),
    createToll: (tripId, payload) => run(() => tripLogsApi.createTollLog(tripId, payload)),
    updateToll: (tripId, tollId, payload) =>
      run(() => tripLogsApi.updateTollLog(tripId, tollId, payload)),
    deleteToll: (tripId, tollId) => run(() => tripLogsApi.deleteTollLog(tripId, tollId)),
    listDriverExpenses: (tripId) => run(() => tripLogsApi.listDriverExpenses(tripId)),
    createDriverExpense: (tripId, payload) =>
      run(() => tripLogsApi.createDriverExpense(tripId, payload)),
    updateDriverExpense: (tripId, expenseId, payload) =>
      run(() => tripLogsApi.updateDriverExpense(tripId, expenseId, payload)),
    deleteDriverExpense: (tripId, expenseId) =>
      run(() => tripLogsApi.deleteDriverExpense(tripId, expenseId)),
  }
}
