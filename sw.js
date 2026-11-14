/* Сеть в приоритете, кэш как запасной вариант: приложение открывается без интернета, но обновления приходят сразу */
const V='oblachko-v50',SHELL=['./', 'index.html', 'manifest.webmanifest', 'lock-hero.jpg', 'icon-v4-192.png', 'icon-v4-512.png', 'icon-v4-maskable-512.png', 'apple-touch-icon-v4.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});
