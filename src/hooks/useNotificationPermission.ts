import { useEffect } from 'react'

const STORAGE_KEY = 'openplate_notification_asked'

export function useNotificationPermission() {
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(STORAGE_KEY)) return

    // Only request in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    if (!isStandalone) return

    localStorage.setItem(STORAGE_KEY, '1')
    // Small delay so the app feels settled before the system prompt appears
    const timer = setTimeout(() => {
      Notification.requestPermission()
    }, 2000)
    return () => clearTimeout(timer)
  }, [])
}
