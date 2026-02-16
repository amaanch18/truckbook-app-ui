import { request } from './http.js'

export const listTruckRepairs = async (truckId) => {
  return request(`/api/trucks/${truckId}/repairs`)
}

export const createTruckRepair = async (truckId, body) => {
  return request(`/api/trucks/${truckId}/repairs`, {
    method: 'POST',
    body,
  })
}

export const updateTruckRepair = async (truckId, repairId, body) => {
  return request(`/api/trucks/${truckId}/repairs/${repairId}`, {
    method: 'PUT',
    body,
  })
}

export const deleteTruckRepair = async (truckId, repairId) => {
  return request(`/api/trucks/${truckId}/repairs/${repairId}`, {
    method: 'DELETE',
  })
}
