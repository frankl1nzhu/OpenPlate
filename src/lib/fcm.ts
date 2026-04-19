import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { messagingPromise, db } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

/** Request FCM token and save it to userProfiles/{userId}.fcmToken */
export async function requestFCMToken(userId: string): Promise<string | null> {
  const messaging = await messagingPromise
  if (!messaging) return null

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (token) {
      await setDoc(doc(db, 'userProfiles', userId), { fcmToken: token }, { merge: true })
    }
    return token
  } catch (err) {
    console.warn('FCM token request failed:', err)
    return null
  }
}

/** Listen for foreground push messages and show a Notification */
export function onForegroundMessage(callback?: (title: string, body: string) => void) {
  messagingPromise.then((messaging) => {
    if (!messaging) return
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'OpenPlate'
      const body = payload.notification?.body || ''
      if (callback) {
        callback(title, body)
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/pwa-192x192.png' })
      }
    })
  })
}
