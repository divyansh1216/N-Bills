'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !window.isSecureContext ||
        !('serviceWorker' in navigator)) return

    // updateViaCache also keeps the imported notification handler current.
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(error => console.error('PWA service worker registration failed:', error))
  }, [])

  return null
}
