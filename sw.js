// HardwareSikho Service Worker
// Caches the app shell so the site can install as a PWA and
// loads instantly on repeat visits. Images from Supabase are
// always fetched fresh (not cached) so the gallery stays up to date.

const CACHE_NAME = "hardwaresikho-v1";

const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.json",
    "/icon-192.png",
    "/icon-512.png"
];

// Install: cache the app shell

self.addEventListener("install", function (event) {

    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(APP_SHELL);
        })
    );

    self.skipWaiting();

});

// Activate: clean up old caches

self.addEventListener("activate", function (event) {

    event.waitUntil(
        caches.keys().then(function (keys) {

            return Promise.all(
                keys
                    .filter(function (key) {
                        return key !== CACHE_NAME;
                    })
                    .map(function (key) {
                        return caches.delete(key);
                    })
            );

        })
    );

    self.clients.claim();

});

// Fetch: serve app shell from cache first, fall back to network.
// Never intercept Supabase API/storage requests — those must
// always be live so uploads, deletes, and search stay accurate.

self.addEventListener("fetch", function (event) {

    const url = event.request.url;

    if (url.includes("supabase.co")) {
        return;
    }

    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (cached) {

            if (cached) {
                return cached;
            }

            return fetch(event.request).catch(function () {

                // Offline fallback for navigation requests

                if (event.request.mode === "navigate") {
                    return caches.match("/index.html");
                }

            });

        })
    );

});
