// Increment when changing the offline document or cache policy.
const VERSION = 'n-bills-pwa-v1'
const OFFLINE_CACHE = `${VERSION}-offline`
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = '/offline.html'
const MAX_STATIC_ENTRIES = 150

importScripts('/notification-sw.js')

self.addEventListener('install', event => {
  // Do not force activation over a running app: updates take over after its tabs close.
  event.waitUntil((async () => {
    const response = await fetch(OFFLINE_URL, { cache: 'reload', credentials: 'omit' })
    if (!response.ok || response.redirected) throw new Error('Offline page unavailable')
    await (await caches.open(OFFLINE_CACHE)).put(OFFLINE_URL, response)
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const legacy = new Set(['firestore-cache', 'start-url', 'next-data', 'others', 'next-static', 'google-fonts'])
    const names = await caches.keys()
    await Promise.all(names.filter(name =>
      legacy.has(name) || name.startsWith('workbox-precache-') ||
      (name.startsWith('n-bills-pwa-') && ![OFFLINE_CACHE, STATIC_CACHE].includes(name))
    ).map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

async function navigate(request) {
  try {
    // HTML is never stored, including authenticated pages and error responses.
    return await fetch(request)
  } catch {
    return await (await caches.open(OFFLINE_CACHE)).match(OFFLINE_URL) ||
      new Response('You are offline. Reconnect and reload to continue.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
  }
}

async function staticAsset(request) {
  let cache
  try {
    cache = await caches.open(STATIC_CACHE)
    const cached = await cache.match(request)
    if (cached) return cached
  } catch { /* Storage restrictions must not prevent online access. */ }
  // Only immutable Next.js build assets qualify; omit cookies on these public files.
  const response = await fetch(request, { credentials: 'omit' })
  const policy = response.headers.get('cache-control') || ''
  if (cache && response.status === 200 && !response.redirected && response.type !== 'opaque' &&
      !/private|no-store|no-cache/i.test(policy) && !response.headers.has('set-cookie') &&
      !response.headers.has('vary')) {
    try {
      await cache.put(request, response.clone())
      const keys = await cache.keys()
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map(key => cache.delete(key)))
    } catch { /* Quota errors do not break the response. */ }
  }
  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.headers.has('authorization') || request.headers.has('range') ||
      request.headers.has('rsc') || request.cache === 'no-store') return
  if (request.mode === 'navigate' && !url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/.well-known/')) {
    event.respondWith(navigate(request))
    return
  }
  // No runtime caching of API, Firebase, RSC, HTML, images, manifests or user data.
  if (!url.search && url.pathname.startsWith('/_next/static/') &&
      /\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname)) {
    event.respondWith(staticAsset(request))
  }
})
