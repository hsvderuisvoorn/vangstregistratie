var CACHE_NAME = "vangstregister-v3";
var BESTanden = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./vijverkaart.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(BESTanden);
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (antwoord) {
      if (antwoord) return antwoord;
      return fetch(e.request).then(function (net) {
        if (net && net.ok) {
          var clone = net.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        }
        return net;
      }).catch(function () {
        if (e.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});