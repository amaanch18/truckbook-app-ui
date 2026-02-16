import { formatDates, request } from './http.js'

const createFuelLog = (tripId, payload) =>
  request(`/api/trips/${tripId}/fuel`, {
    method: 'POST',
    body: formatDates(payload, ['filledOn']),
  })

const listFuelLogs = (tripId) => request(`/api/trips/${tripId}/fuel`)

const updateFuelLog = (tripId, fuelId, payload) =>
  request(`/api/trips/${tripId}/fuel/${fuelId}`, {
    method: 'PUT',
    body: formatDates(payload, ['filledOn']),
  })

const deleteFuelLog = (tripId, fuelId) =>
  request(`/api/trips/${tripId}/fuel/${fuelId}`, { method: 'DELETE' })

const createTollLog = (tripId, payload) =>
  request(`/api/trips/${tripId}/tolls`, {
    method: 'POST',
    body: formatDates(payload, ['paidOn']),
  })

const listTollLogs = (tripId) => request(`/api/trips/${tripId}/tolls`)

const updateTollLog = (tripId, tollId, payload) =>
  request(`/api/trips/${tripId}/tolls/${tollId}`, {
    method: 'PUT',
    body: formatDates(payload, ['paidOn']),
  })

const deleteTollLog = (tripId, tollId) =>
  request(`/api/trips/${tripId}/tolls/${tollId}`, { method: 'DELETE' })

const createDriverExpense = (tripId, payload) =>
  request(`/api/trips/${tripId}/driver-expenses`, {
    method: 'POST',
    body: formatDates(payload, ['spentOn']),
  })

const listDriverExpenses = (tripId) => request(`/api/trips/${tripId}/driver-expenses`)

const updateDriverExpense = (tripId, expenseId, payload) =>
  request(`/api/trips/${tripId}/driver-expenses/${expenseId}`, {
    method: 'PUT',
    body: formatDates(payload, ['spentOn']),
  })

const deleteDriverExpense = (tripId, expenseId) =>
  request(`/api/trips/${tripId}/driver-expenses/${expenseId}`, { method: 'DELETE' })

export {
  listFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  listTollLogs,
  createTollLog,
  updateTollLog,
  deleteTollLog,
  listDriverExpenses,
  createDriverExpense,
  updateDriverExpense,
  deleteDriverExpense,
  listFuelLogs as listFuel,
  createFuelLog as createFuel,
  updateFuelLog as updateFuel,
  deleteFuelLog as deleteFuel,
  listTollLogs as listTolls,
  createTollLog as createToll,
  updateTollLog as updateToll,
  deleteTollLog as deleteToll,
  listDriverExpenses as listDriver,
  createDriverExpense as createDriver,
  updateDriverExpense as updateDriver,
  deleteDriverExpense as deleteDriver,
}
