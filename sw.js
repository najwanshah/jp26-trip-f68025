/* build eecdf1a8 */
var APP = 'jp26-app-eecdf1a8', LIBS = 'jp26-libs', TILES = 'jp26-tiles', MAX_TILES = 6000;
var CORE = ['./', 'index.html', 'data.json', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
var PRE = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
           'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'];
self.addEventListener('install', function(e){
  e.waitUntil(Promise.all([
    caches.open(APP).then(function(c){ return c.addAll(CORE); }),
    caches.open(LIBS).then(function(c){ return Promise.all(PRE.map(function(u){
      return fetch(u, {mode:'cors'}).then(function(r){ return c.put(u, r); }).catch(function(){}); })); })
  ]).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf('jp26-app-') === 0 && k !== APP; })
                         .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
var putCount = 0;
function trim(){
  caches.open(TILES).then(function(c){ return c.keys().then(function(ks){
    var extra = ks.length - MAX_TILES; for (var i = 0; i < extra; i++) c.delete(ks[i]); }); });
}
function cacheFirst(name, req){
  return caches.open(name).then(function(c){
    return c.match(req).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(r){
        if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()); if (name === TILES && ++putCount % 100 === 0) trim(); }
        return r;
      });
    });
  });
}
self.addEventListener('fetch', function(e){
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function(r){
      if (r.ok) { var cl = r.clone(); caches.open(APP).then(function(c){ c.put(req, cl); }); }
      return r;
    }).catch(function(){
      return caches.match(req, {ignoreSearch:true}).then(function(hit){ return hit || caches.match('index.html'); });
    }));
  } else if (/arcgisonline\.com|cartocdn\.com/.test(u.hostname)) {
    e.respondWith(cacheFirst(TILES, req));
  } else if (/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.hostname)) {
    e.respondWith(cacheFirst(LIBS, req));
  }
});
