import { request } from './http.js'

const getOutstanding = (mode) => request(`/api/settlements/outstanding?mode=${mode}`)

const getOutstandingByParty = (partyId) => request(`/api/settlements/outstanding/party/${partyId}`)

const getOutstandingPartyTrucks = (partyId) =>
  request(`/api/settlements/outstanding/party/${partyId}/trucks`)

const getOutstandingByTruck = (truckId) => request(`/api/settlements/outstanding/truck/${truckId}`)

const getOutstandingSummary = (mode) => getOutstanding(mode)
const getPartyTrips = (partyId) => getOutstandingByParty(partyId)
const getPartyTrucks = (partyId) => getOutstandingPartyTrucks(partyId)
const getTruckTrips = (truckId) => getOutstandingByTruck(truckId)

export {
  getOutstanding,
  getOutstandingByParty,
  getOutstandingPartyTrucks,
  getOutstandingByTruck,
  getOutstandingSummary,
  getPartyTrips,
  getPartyTrucks,
  getTruckTrips,
}
