// Offline-Speicher fuer die Brandschutzverwaltung
// - Seiten (index.html, stempeln.html ...): zuerst aus dem Internet (immer neueste Version),
//   ohne Netz aus dem Speicher -> App startet auch im Keller.
// - Programm-Bibliotheken (CDN): aus dem Speicher, sonst aus dem Internet.
// - Datenbank-Verbindungen (Firebase) laufen NICHT ueber diesen Speicher.
var CACHE = 'bsv-offline-v1';
var VORLADEN = [
  './', './index.html', './stempeln.html', './kunde.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(VORLADEN.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
function istSeite(req, url){
  return req.mode === 'navigate' || (url.origin === self.location.origin && /\.html$|\/$/.test(url.pathname));
}
function ohneSuche(url){ return url.origin + url.pathname; }
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.search.indexOf('check=') > -1) return; // Versionspruefung immer direkt
  if(/googleapis\.com|firebaseio|firebaseapp|identitytoolkit|securetoken|tessdata|projectnaptha/.test(url.host)) return;
  if(istSeite(req, url)){
    e.respondWith(new Promise(function(resolve){
      var fertig = false;
      var ausSpeicher = function(){
        caches.open(CACHE).then(function(c){ return c.match(ohneSuche(url)).then(function(r){ return r || c.match('./index.html'); }); })
          .then(function(r){ if(!fertig){ fertig = true; resolve(r || new Response('Offline – bitte einmal mit Internet öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); } });
      };
      var timer = setTimeout(ausSpeicher, 6000);
      fetch(req, { cache: 'no-store' }).then(function(r){
        clearTimeout(timer);
        if(r && r.ok){ var kopie = r.clone(); caches.open(CACHE).then(function(c){ c.put(ohneSuche(url), kopie); }); }
        if(!fertig){ fertig = true; resolve(r); }
      }).catch(function(){ clearTimeout(timer); ausSpeicher(); });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req).then(function(treffer){
      if(treffer) return treffer;
      return fetch(req).then(function(r){ if(r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; });
    });
  }));
});
