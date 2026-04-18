/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Precache all assets built by Vite (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Runtime cache for Firebase Storage images
registerRoute(
  ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'firebase-storage',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Handle push notifications from FCM
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { notification?: { title?: string; body?: string; icon?: string } }
  try {
    payload = event.data.json()
  } catch {
    // Plain text fallback
    const text = event.data.text()
    event.waitUntil(
      self.registration.showNotification('OpenPlate', { body: text, icon: '/pwa-192x192.png' }),
    )
    return
  }

  const notification = payload.notification || {}
  const title = notification.title || 'OpenPlate'
  const body = notification.body || ''
  const icon = notification.icon || '/pwa-192x192.png'

  event.waitUntil(
    self.registration.showNotification(title, { body, icon }),
  )
})

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/')
    }),
  )
})
