import { request } from './http.js'

const getMe = async () => {
  return request('/api/me')
}

export { getMe }
