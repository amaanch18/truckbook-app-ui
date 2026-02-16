import { request } from './http.js'

const createTrip = (payload) =>
  request('/api/trips', {
    method: 'POST',
    body: payload,
  })

const listTrips = (params = {}) => {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.truckId) search.set('truckId', params.truckId)
  if (params.partyId) search.set('partyId', params.partyId)
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/trips${suffix}`)
}

const getTrip = (id) => request(`/api/trips/${id}`)

const updateTrip = (id, payload) =>
  request(`/api/trips/${id}`, {
    method: 'PUT',
    body: payload,
  })

const completeTrip = (id) => request(`/api/trips/${id}/complete`, { method: 'PATCH' })

const deleteTrip = (id) => request(`/api/trips/${id}`, { method: 'DELETE' })

export { createTrip, listTrips, getTrip, updateTrip, completeTrip, deleteTrip }
