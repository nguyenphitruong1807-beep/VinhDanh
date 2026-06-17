const STATIC_CACHE = "unite-poster-static-v7-github-pages-1";
const ASSET_CACHE = "unite-poster-assets-v7-github-pages-1";
const BASE_URL = new URL("./", self.location.href);
const STATIC_ASSETS = [
  "./",
  "index.html",
  "gold/",
  "red/",
  "blue/",
  "green/",
  "purple/",
  "css/styles.css",
  "js/app.js",
  "js/supabase-config.js",
  "js/supabase-templates.js",
  "js/backend-config.js",
  "assets/unite-bg-clean.png",
  "assets/unite-foreground.png",
  "assets/unite-group-logo.png",
  "templates/best-seller.json"
].map(path => new URL(path, BASE_URL).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(error => console.warn("Không cache đủ static assets", error))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => ![STATIC_CACHE, ASSET_CACHE].includes(key)).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  const insideSite = url.href.startsWith(BASE_URL.href);
  const isImage = request.destination === "image" || /\.(png|jpe?g|webp|svg)$/i.test(url.pathname);

  if(isImage){
    event.respondWith(
      caches.open(ASSET_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const network = fetch(request).then(response => {
          if(response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  if(insideSite && url.origin === self.location.origin){
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if(response.ok) caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()));
        return response;
      }))
    );
  }
});
