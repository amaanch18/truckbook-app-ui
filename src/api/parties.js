import { request } from './http.js'

const createParty = (payload) => request('/api/parties', { method: 'POST', body: payload })

const listParties = (params = {}) => {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request(`/api/parties${suffix}`)
}

const getParty = (id) => request(`/api/parties/${id}`)
const getPartyCredit = (id) => request(`/api/parties/${id}/credit`)

const updateParty = (id, payload) => request(`/api/parties/${id}`, { method: 'PUT', body: payload })

const deleteParty = (id) => request(`/api/parties/${id}`, { method: 'DELETE' })

export { createParty, listParties, getParty, getPartyCredit, updateParty, deleteParty }
