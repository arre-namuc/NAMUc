const CACHE = 'cutflow-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // http/https 요청만 처리 (chrome-extension 등 제외)
  if (!url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com')) return;
  if (url.includes('firebase')) return;
  if (url.includes('googleapis.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
