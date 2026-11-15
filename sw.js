// Lets the game work with no internet once it has been opened (a "service worker": the browser keeps it for
// this website). js/game.js (setupApp) switches it on, only on the public web page.
// - The first visit keeps a copy of every file the game needs (index.html, css/, js/, fonts, icons).
// - Online, every file still comes fresh from the website, so updates show up straight away,
//   and the copy is refreshed at the same time.
// - Offline (airplane mode, no signal), the game is played from the copy.
// It never contacts any other website.
const CACHE = 'zombie-survival';

// The files to keep, read from index.html and css/style.css, so new js files are kept without changing this.
async function gameFiles() {
  const get = async path => (await fetch(path, { cache: 'no-cache' })).text();
  const page = await get('index.html'), css = await get('css/style.css');
  const files = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
    'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/icon-32.png'];
  for (const m of page.matchAll(/(?:src|href)="((?:css|js)\/[^"]+)"/g)) files.push(m[1]);
  for (const m of css.matchAll(/url\(["']?(fonts\/[^"')]+)["']?\)/g)) files.push('css/' + m[1]);
  return [...new Set(files)];
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll((await gameFiles()).map(f => new Request(f, { cache: 'no-cache' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // 'no-cache' asks the website whether the file changed, so new and old files never get mixed
      const res = await fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' });
      if (res.ok) await cache.put(req, res.clone());
      return res;
    } catch (err) {   // no internet: use the copy
      const copy = await cache.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
      return copy || Response.error();
    }
  })());
});
