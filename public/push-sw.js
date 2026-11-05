// Imported into the generated service worker (see vite.config.ts)
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'Brownie Brothers', body: event.data && event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Brownie Brothers', {
      body: d.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: d.tag,
      data: { url: d.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
      return self.clients.openWindow(url)
    }),
  )
})
