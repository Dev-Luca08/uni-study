/* Uni Study — offline support (made by Luca Cicarelli) */
const VERSION = 'uni-study-v9';
const LOCAL = ['./', './index.html', './flashcards.html', './planner.html', './planner.css', './theme.js', './icons.js', './planner-core.js', './planner-plan.js', './planner-ui.js', './planner-extra.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const REMOTE = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js',
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Always fetch fresh copies (skip the browser's HTTP cache) so updates arrive right away
    await cache.addAll(LOCAL.map(u => new Request(u, { cache: 'reload' })));
    // Libraries for Excel, Word and PDF, so importing also works offline
    await Promise.all(REMOTE.map(async url => {
      try { const res = await fetch(url, { mode: 'cors' }); if (res.ok) await cache.put(url, res); } catch (e) { /* try again later */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // Never cache the online database (accounts, chat, friends): those requests go straight to Supabase
  if (url.hostname.endsWith('.supabase.co')) return;
  const isCdn = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net';
  const isFontCss = url.hostname === 'fonts.googleapis.com';

  if (isCdn) {
    // Versioned files never change: cache first
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req.url, res.clone());
      return res;
    })());
    return;
  }
  if (sameOrigin || isFontCss) {
    // Show the saved version at once, fetch a fresh one in the background
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const key = req.mode === 'navigate' ? (/planner\.html$/.test(url.pathname) ? './planner.html' : /flashcards\.html$/.test(url.pathname) ? './flashcards.html' : './index.html') : req;
      const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
      if (hit) { event.waitUntil(fresh); return hit; }
      const res = await fresh;
      return res || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })());
  }
});
