var CACHE_NAME = "vangstregister-v24";
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
      return Promise.all(
        BESTanden.map(function (url) {
          return cache.add(url).catch(function () {});
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (e.request.url.indexOf("unpkg.com") !== -1) return;
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