var CACHE_NAME = 'bsv-cache-v1';

var APP_SHELL = [
  './',
  './index.html'
];

var EXTERN_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      var appShellDone = cache.addAll(APP_SHELL).catch(function(err){
        console.warn('App-Shell Cache Fehler', err);
      });
      var externDone = Promise.all(EXTERN_SCRIPTS.map(function(url){
        return fetch(url, { mode: 'no-cors' }).then(function(resp){
          return cache.put(url, resp);
        }).catch(function(err){
          console.warn('Extern-Cache Fehler', url, err);
        });
      }));
      return Promise.all([appShellDone, externDone]);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  var url = event.request.url;
  // Firestore-Anfragen selbst (Datenbank-Verkehr) nicht abfangen, nur die App-Datei
  // und die statischen Bausteine (Firebase-SDK, QR-Bibliotheken).
  if(url.indexOf('firestore.googleapis.com') !== -1 || url.indexOf('firestore.google.com') !== -1) return;

  event.respondWith(
    fetch(event.request).then(function(networkResp){
      var copy = networkResp.clone();
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(event.request, copy).catch(function(){});
      });
      return networkResp;
    }).catch(function(){
      return caches.match(event.request).then(function(cacheResp){
        return cacheResp || caches.match('./index.html');
      });
    })
  );
});
