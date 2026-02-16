const TOKEN_KEY = 'truckbook.jwt'
const USER_KEY = 'truckbook.auth.user'
const ORG_KEY = 'truckbook.auth.org'
const ME_KEY = 'truckbook.auth.me'
const EVENT_NAME = 'auth:change'

const emitChange = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_NAME))
}

const getToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) || ''
}

const setToken = (token) => {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  emitChange()
}

const clearToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  emitChange()
}

const getAuthUser = () => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

const setAuthUser = (user) => {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
  emitChange()
}

const getOrg = () => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(ORG_KEY)
  return raw ? JSON.parse(raw) : null
}

const setOrg = (org) => {
  if (typeof window === 'undefined') return
  if (org) {
    localStorage.setItem(ORG_KEY, JSON.stringify(org))
  } else {
    localStorage.removeItem(ORG_KEY)
  }
  emitChange()
}

const getMe = () => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(ME_KEY)
  return raw ? JSON.parse(raw) : null
}

const setMe = (me) => {
  if (typeof window === 'undefined') return
  if (me) {
    localStorage.setItem(ME_KEY, JSON.stringify(me))
  } else {
    localStorage.removeItem(ME_KEY)
  }
  emitChange()
}

const clearAll = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ORG_KEY)
  localStorage.removeItem(ME_KEY)
  emitChange()
}

export {
  EVENT_NAME,
  getToken,
  setToken,
  clearToken,
  getAuthUser,
  setAuthUser,
  getOrg,
  setOrg,
  getMe,
  setMe,
  clearAll,
}
