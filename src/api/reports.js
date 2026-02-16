import { request } from './http.js'

const buildReportQuery = (params) => {
  const search = new URLSearchParams()
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.groupBy) search.set('groupBy', params.groupBy)
  if (params.truckId) search.set('truckId', params.truckId)
  if (params.partyId) search.set('partyId', params.partyId)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return suffix
}

const getReportsOverview = (params) =>
  request(`/api/reports/overview${buildReportQuery(params)}`)

const getReportsProfit = (params) => request(`/api/reports/profit${buildReportQuery(params)}`)

const getReportsOperatingVsRevenue = (params) =>
  request(`/api/reports/operating-vs-revenue${buildReportQuery(params)}`)

export {
  getReportsOverview,
  getReportsProfit,
  getReportsOperatingVsRevenue,
  // Backwards compatibility (if any old imports remain)
  getReportsOverview as getOverviewReport,
  getReportsProfit as getProfitReport,
  getReportsOperatingVsRevenue as getOperatingVsRevenueReport,
}
