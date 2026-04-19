import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { requestFCMToken, onForegroundMessage } from '../lib/fcm'

export function useFCM() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    requestFCMToken(user.uid)
    onForegroundMessage()
  }, [user])
}
