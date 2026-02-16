import { formatDates, request } from './http.js'

const createSettlement = (payload) =>
  request('/api/settlements', {
    method: 'POST',
    body: formatDates(payload, ['settlementDate']),
  })

const listSettlements = (params = {}) => {
  const search = new URLSearchParams()
  if (params.partyId) search.set('partyId', params.partyId)
  if (params.truckId) search.set('truckId', params.truckId)
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/settlements${suffix}`)
}

const getSettlement = (id) => request(`/api/settlements/${id}`)

const createAllocations = (id, allocations) =>
  request(`/api/settlements/${id}/allocations`, {
    method: 'POST',
    body: { allocations },
  })

const postAllocations = (id, payload) =>
  request(`/api/settlements/${id}/allocations`, {
    method: 'POST',
    body: payload,
  })

export { createSettlement, listSettlements, getSettlement, createAllocations, postAllocations }
