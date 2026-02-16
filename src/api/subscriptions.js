import { completeOnboarding } from './onboarding.js'
import { request } from './http.js'

const getMySubscription = async () => {
  return request('/api/subscription/current')
}

const createTrialOnOnboarding = async (payload) => {
  return completeOnboarding(payload)
}

const adminActivate = async ({ orgId, plan, months = 1 }) => {
  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('ADMIN_KEY') || '' : ''
  return request('/api/admin/subscription/activate', {
    method: 'POST',
    headers: {
      'X-Admin-Key': adminKey,
    },
    body: {
      orgId,
      planCode: plan,
      months,
    },
  })
}

export { getMySubscription, createTrialOnOnboarding, adminActivate }
