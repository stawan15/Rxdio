// Rxdio service worker: makes the app shell load offline. Streams and API calls are never touched.
// Build: __BUILD_ID__ (stamped at build time so every deploy installs a new worker)
const CACHE = 'rxdio-v1'
const STATIC = /^\/(assets|icons)\//
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Precache the shell plus every built asset listed in precache.json, and drop files from older builds
async function precache() {
  const cache = await caches.open(CACHE)
  const built = await fetch('/precache.json', { cache: 'no-store' }).then(r => r.json()).catch(() => [])
  const wanted = new Set([...SHELL, ...built])
  await cache.addAll([...wanted])
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url)
    if (!wanted.has(pathname) && STATIC.test(pathname) && pathname.startsWith('/assets/')) await cache.delete(request)
  }
}

self.addEventListener('install', event => event.waitUntil(precache().then(() => self.skipWaiting())))

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Page loads: network first so deploys show up immediately, cached copy when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return res })
        .catch(() => caches.match('/', { ignoreVary: true })),
    )
    return
  }

  // Hashed bundles and icons: cache first
  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(request, { ignoreVary: true }).then(hit => hit ?? fetch(request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(request, copy)) }
        return res
      })),
    )
  }
})
