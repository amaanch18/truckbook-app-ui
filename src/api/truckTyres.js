import { request } from './http.js'

export const listTruckTyres = async (truckId) => {
  return request(`/api/trucks/${truckId}/tyres`)
}

export const createTruckTyre = async (truckId, body) => {
  return request(`/api/trucks/${truckId}/tyres`, {
    method: 'POST',
    body,
  })
}

export const updateTruckTyre = async (truckId, tyreId, body) => {
  return request(`/api/trucks/${truckId}/tyres/${tyreId}`, {
    method: 'PUT',
    body,
  })
}

export const deleteTruckTyre = async (truckId, tyreId) => {
  return request(`/api/trucks/${truckId}/tyres/${tyreId}`, {
    method: 'DELETE',
  })
}
