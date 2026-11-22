// Service worker panel admin: hanya menyimpan cangkang halaman admin.
// Data (Supabase) dan halaman publik TIDAK disentuh, jadi tidak ada data basi.
const CACHE = 'admin-azzaam-v2';
const SHELL = ['/admin', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (r.mode === 'navigate' && (u.pathname === '/admin' || u.pathname === '/admin.html')) {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('/admin', c)); return res; }).catch(() => caches.match('/admin')));
  }
});
