import { request } from './http.js'

const requestOtp = (phoneE164) =>
  request('/api/auth/otp/request', {
    method: 'POST',
    body: { phoneE164 },
    auth: false,
  })

const verifyOtp = (phoneE164, otp) =>
  request('/api/auth/otp/verify', {
    method: 'POST',
    body: { phoneE164, otp },
    auth: false,
  })

export { requestOtp, verifyOtp }
