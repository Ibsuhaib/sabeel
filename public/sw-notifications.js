/* Imported into the generated service worker (see vite.config.js workbox.importScripts).
   Handles what happens when someone taps a prayer notification. */

self.addEventListener('notificationclick', event => {
  const notification = event.notification
  const action = event.action
  notification.close()

  if (action === 'dismiss') return

  const target = (notification.data && notification.data.url) || '/'

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Prefer a tab that is already open — reusing it keeps any recitation going
    // and avoids stacking duplicate copies of the app.
    for (const client of clientList) {
      if ('focus' in client) {
        try {
          await client.focus()
          if ('navigate' in client && target) await client.navigate(target)
          client.postMessage({ type: 'notification-opened', data: notification.data || {} })
          return
        } catch (e) { /* fall through to opening a new window */ }
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target)
  })())
})

self.addEventListener('notificationclose', event => {
  // Tell the page so it can stop an adhan that is still playing — the point of
  // the sound is to call you, not to keep going once you have answered.
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientList) {
      client.postMessage({ type: 'notification-closed', data: event.notification.data || {} })
    }
  })())
})
