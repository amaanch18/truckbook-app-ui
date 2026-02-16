import { useEffect, useState } from 'react'
import {
  EVENT_NAME,
  getAuthUser,
  getOrg,
  getMe,
  getToken,
} from './authStorage.js'

export const useSession = () => {
  const [session, setSession] = useState(() => ({
    token: getToken(),
    user: getAuthUser(),
    org: getOrg(),
    me: getMe(),
  }))

  useEffect(() => {
    const update = () => {
      setSession({
        token: getToken(),
        user: getAuthUser(),
        org: getOrg(),
        me: getMe(),
      })
    }
    window.addEventListener('storage', update)
    window.addEventListener(EVENT_NAME, update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener(EVENT_NAME, update)
    }
  }, [])

  return session
}
