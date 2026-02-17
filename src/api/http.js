const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const API_LOADING_EVENT = 'truckbook:api-loading'
let inFlightRequests = 0

const emitApiLoading = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(API_LOADING_EVENT, {
      detail: { isLoading: inFlightRequests > 0, inFlightRequests },
    }),
  )
}

const beginApiRequest = () => {
  inFlightRequests += 1
  emitApiLoading()
}

const endApiRequest = () => {
  inFlightRequests = Math.max(0, inFlightRequests - 1)
  emitApiLoading()
}

const getToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('truckbook.jwt') || ''
}

const buildHeaders = (isJson = true, withAuth = true) => {
  const headers = {}
  if (isJson) {
    headers['Content-Type'] = 'application/json'
    headers['Accept'] = 'application/json'
  }
  if (withAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const normalizeError = (error) => {
  if (!error) return { message: 'Request failed', status: null, fields: null, raw: error }
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      fields: error.payload?.fields || null,
      raw: error,
    }
  }
  return {
    message: error.message || 'Request failed',
    status: error.status || null,
    fields: null,
    raw: error,
  }
}

const parseError = async (response) => {
  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    payload = null
  }
  const message = payload?.error || response.statusText || 'Request failed'
  return new ApiError(message, response.status, payload)
}

const request = async (path, { method = 'GET', body, auth = true, headers = {} } = {}) => {
  beginApiRequest()
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...buildHeaders(true, auth), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      throw await parseError(response)
    }
    if (response.status === 204) return null
    return response.json()
  } finally {
    endApiRequest()
  }
}

const toDdMmYyyy = (value) => {
  if (!value) return value
  if (typeof value !== 'string') return value
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}-${month}-${year}`
  }
  return value
}

const formatDates = (payload, fields) => {
  if (!payload || typeof payload !== 'object') return payload
  const next = { ...payload }
  fields.forEach((field) => {
    if (next[field]) next[field] = toDdMmYyyy(next[field])
  })
  return next
}

const subscribeApiLoading = (callback) => {
  if (typeof window === 'undefined') return () => {}
  const handler = (event) => {
    callback(Boolean(event?.detail?.isLoading), Number(event?.detail?.inFlightRequests || 0))
  }
  window.addEventListener(API_LOADING_EVENT, handler)
  callback(inFlightRequests > 0, inFlightRequests)
  return () => window.removeEventListener(API_LOADING_EVENT, handler)
}

export { BASE_URL, ApiError, request, toDdMmYyyy, formatDates, normalizeError, subscribeApiLoading }
