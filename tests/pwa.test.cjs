const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

function worker() {
  const listeners = {}, stores = new Map()
  let offline = false, response = () => new Response('fresh')
  const key = r => typeof r === 'string' ? new URL(r, 'https://example.com').href : r.url
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        match: async r => store.get(key(r))?.clone(),
        put: async (r, value) => store.set(key(r), value.clone()),
        keys: async () => [...store.keys()].map(url => new Request(url)),
        delete: async r => store.delete(key(r)),
      }
    },
  }
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://example.com' }, clients: { claim: async () => {} },
      addEventListener: (name, fn) => { listeners[name] = fn } },
    caches, URL, Request, Response, importScripts() {},
    fetch: async () => { if (offline) throw new Error('offline'); return response() },
  })
  return {
    stores, caches, offline: () => { offline = true }, response: fn => { response = fn },
    event: async name => { let task; listeners[name]({ waitUntil: p => { task = p } }); await task },
    fetch: async (path, overrides = {}) => {
      let result; const tasks = []
      const request = { url: new URL(path, 'https://example.com').href, method: 'GET', mode: 'cors',
        headers: new Headers(), cache: 'default', destination: '', ...overrides }
      listeners.fetch({ request, respondWith: p => { result = p }, waitUntil: p => tasks.push(p) })
      const value = await result; await Promise.all(tasks); return value
    },
  }
}

test('private requests, API, RSC, third parties and mutations bypass the worker', async () => {
  const w = worker()
  for (const [url, options] of [
    ['/api/bills', {}], ['/dashboard?_rsc=123', {}], ['https://firestore.googleapis.com/data', {}],
    ['/_next/static/chunks/test.js', { method: 'POST' }],
    ['/_next/static/chunks/test.js', { headers: new Headers({ authorization: 'Bearer secret' }) }],
    ['/_next/static/chunks/test.js?token=secret', {}],
  ]) assert.equal(await w.fetch(url, options), undefined)
  assert.equal(w.stores.size, 0)
})

test('online navigations stay fresh and offline navigation gets only the generic fallback', async () => {
  const w = worker(); await w.event('install')
  w.response(() => new Response('private customer page'))
  assert.equal(await (await w.fetch('/dashboard', { mode: 'navigate' })).text(), 'private customer page')
  w.offline()
  assert.equal(await (await w.fetch('/customers/secret', { mode: 'navigate' })).text(), 'fresh')
  for (const store of w.stores.values()) for (const url of store.keys()) assert.ok(!url.includes('dashboard') && !url.includes('secret'))
})

test('static cache survives offline; private and failed responses never enter it', async () => {
  const w = worker()
  await w.fetch('/_next/static/chunks/public.js')
  w.response(() => new Response('private', { headers: { 'cache-control': 'private' } }))
  await w.fetch('/_next/static/chunks/private.js')
  w.response(() => new Response('error', { status: 500 }))
  await w.fetch('/_next/static/chunks/error.js')
  w.offline()
  assert.equal(await (await w.fetch('/_next/static/chunks/public.js')).text(), 'fresh')
  await assert.rejects(w.fetch('/_next/static/chunks/private.js'))
  await assert.rejects(w.fetch('/_next/static/chunks/error.js'))
})

test('activation deletes legacy sensitive caches but leaves unrelated caches alone', async () => {
  const w = worker()
  for (const name of ['firestore-cache', 'start-url', 'next-data', 'others', 'workbox-precache-v2-old', 'unrelated']) await w.caches.open(name)
  await w.event('activate')
  assert.deepEqual(await w.caches.keys(), ['unrelated'])
})

// Regression: public PWA assets must not redirect to login; business routes must.
test('middleware makes only exact PWA paths public and preserves protected-route redirects', () => {
  const ts = require('typescript')
  const code = ts.transpileModule(fs.readFileSync('src/middleware.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { exports: module.exports, require: () => ({ NextResponse: {
    next: () => ({ kind: 'next' }), redirect: url => ({ kind: 'redirect', url: url.href }),
  } }), URL, Set })
  const run = pathname => module.exports.middleware({ nextUrl: { pathname }, url: `https://example.com${pathname}`, cookies: { get: () => undefined } })
  for (const path of ['/sw.js','/manifest.webmanifest','/manifest.json','/notification-sw.js','/offline.html','/.well-known/assetlinks.json']) assert.equal(run(path).kind,'next')
  for (const path of ['/dashboard','/customers','/api/bills','/sw.js/private','/.well-known/private']) assert.equal(run(path).kind,'redirect')
})

test('static cache stays bounded and rejects redirects, no-store and varying responses', async () => {
  const w = worker()
  for (let i=0;i<151;i++) await w.fetch(`/_next/static/chunks/${i}.js`)
  assert.equal([...w.stores.values()][0].size,150)
  for (const [name,headers] of [['nostore',{'cache-control':'no-store'}],['vary',{'vary':'Cookie'}],['cookie',{'set-cookie':'secret=1'}]]) {
    w.response(()=>new Response('private',{headers}))
    await w.fetch(`/_next/static/chunks/${name}.js`)
  }
  w.response(()=>{const r=new Response('redirect');Object.defineProperty(r,'redirected',{value:true});return r})
  await w.fetch('/_next/static/chunks/redirect.js')
  w.offline()
  for (const name of ['0','nostore','vary','cookie','redirect']) await assert.rejects(w.fetch(`/_next/static/chunks/${name}.js`))
})
