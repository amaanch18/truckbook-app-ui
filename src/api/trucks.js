import { formatDates, request } from './http.js'

const mapTruckPayload = (payload = {}) => ({
  truckNumber: payload.truckNumber,
  status: payload.status,
  notes: payload.notes,
  truckType: payload.truckType,
  compliance: payload.compliance,
})

const createTruck = (payload) =>
  request('/api/trucks', { method: 'POST', body: mapTruckPayload(payload) })

const listTrucks = () => request('/api/trucks')

const getTruck = (id) => request(`/api/trucks/${id}`)

const updateTruck = (id, payload) =>
  request(`/api/trucks/${id}`, { method: 'PUT', body: mapTruckPayload(payload) })

const deleteTruck = (id) => request(`/api/trucks/${id}`, { method: 'DELETE' })

const listRepairs = (truckId, params = {}) => {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/trucks/${truckId}/repairs${suffix}`)
}

const createRepair = (truckId, payload) =>
  request(`/api/trucks/${truckId}/repairs`, {
    method: 'POST',
    body: formatDates(payload, ['repairedOn']),
  })

const updateRepair = (truckId, repairId, payload) =>
  request(`/api/trucks/${truckId}/repairs/${repairId}`, {
    method: 'PUT',
    body: formatDates(payload, ['repairedOn']),
  })

const deleteRepair = (truckId, repairId) =>
  request(`/api/trucks/${truckId}/repairs/${repairId}`, { method: 'DELETE' })

const listTyres = (truckId, params = {}) => {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/trucks/${truckId}/tyres${suffix}`)
}

const createTyre = (truckId, payload) =>
  request(`/api/trucks/${truckId}/tyres`, {
    method: 'POST',
    body: formatDates(payload, ['purchasedOn']),
  })

const updateTyre = (truckId, tyreId, payload) =>
  request(`/api/trucks/${truckId}/tyres/${tyreId}`, {
    method: 'PUT',
    body: formatDates(payload, ['purchasedOn']),
  })

const deleteTyre = (truckId, tyreId) =>
  request(`/api/trucks/${truckId}/tyres/${tyreId}`, { method: 'DELETE' })

const getTruckCostsSummary = (truckId, params) => {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  return request(`/api/trucks/${truckId}/costs/summary?${search.toString()}`)
}

export {
  createTruck,
  listTrucks,
  getTruck,
  updateTruck,
  deleteTruck,
  listRepairs,
  createRepair,
  updateRepair,
  deleteRepair,
  listTyres,
  createTyre,
  updateTyre,
  deleteTyre,
  getTruckCostsSummary,
}
