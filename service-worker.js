const CACHE="rhs-gauge-v3";
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./assets/icon.png"]))));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url); if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));} else e.respondWith(fetch(e.request));});
