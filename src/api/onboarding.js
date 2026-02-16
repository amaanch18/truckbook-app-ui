import { request } from './http.js'

const completeOnboarding = async (payload) => {
  return request('/api/onboarding/complete', { method: 'POST', body: payload })
}

export { completeOnboarding }
