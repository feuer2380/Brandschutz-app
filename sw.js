// Service Worker für Brandschutzverwaltung - ermöglicht Öffnen der App ohne Internetverbindung
var CACHE_NAME = 'brandschutz-app-v1';
var APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(namen){
      return Promise.all(
        namen.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;

  // Nur eigene Seite (index.html) cachen/aus Cache bedienen - externe Bibliotheken (Firebase etc.)
  // und die Firestore-Datenverbindung selbst laufen normal übers Netz weiter.
  if(req.method !== 'GET' || req.url.indexOf(self.location.origin) !== 0){
    return;
  }

  event.respondWith(
    fetch(req).then(function(antwort){
      // Beim Erfolg: aktuelle Version im Cache aktualisieren, für's nächste Mal offline
      var kopie = antwort.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, kopie); });
      return antwort;
    }).catch(function(){
      // Kein Netz: aus dem Cache bedienen, sonst notfalls die gecachte index.html zeigen
      return caches.match(req).then(function(treffer){
        return treffer || caches.match('./index.html');
      });
    })
  );
});
