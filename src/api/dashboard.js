import { request } from './http.js'

const getDashboard = async () => {
  return request('/api/dashboard')
}

export { getDashboard }
