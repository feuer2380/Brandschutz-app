// Service Worker Brandschutzverwaltung – immer zuerst die neueste Version laden
var CACHE = 'bsv-cache-v20261006';

self.addEventListener('install', function(e){
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  // Firebase/Firestore und fremde Server nicht anfassen
  if(url.origin !== self.location.origin) return;
  // Netzwerk zuerst, Zwischenspeicher nur als Notlösung ohne Internet
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function(res){
      var kopie = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, kopie); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){ return r || caches.match('index.html'); });
    })
  );
});
