self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/customers'

  event.waitUntil((async () => {
    const url = new URL(targetUrl, self.location.origin).href
    const clientsList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client) {
          await client.navigate(url)
        }
        return
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(url)
    }
  })())
})
