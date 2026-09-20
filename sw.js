// Minimal offline shell cache. The calculator needs nothing from the network
// once it's loaded, so this is what makes it usable on a phone with no signal.
const CACHE = "shipeta-v1.8";
const ASSETS = [
  "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./vendor/leaflet.js", "./vendor/leaflet.css"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Map tiles are somebody else's server and are expected to fail offline.
  // Leave them to the browser so Leaflet sees a normal tile error.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
