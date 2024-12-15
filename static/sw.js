const STATIC_CACHE_NAME = "static-v1";
const DYNAMIC_CACHE_NAME = `dynamic-${new Date().getTime()}`;
const STATIC_FILES = [
    //admin
    "/static/admin/192.png",
    "/static/admin/144.png",
    "/static/admin/465.png",
    "/static/admin/main.css",
    "/static/admin/components/jodit_editor.min.css",
    "/static/admin/components/jodit_editor.min.js",
    "/static/admin/css/pages/logs.css",
    "/static/admin/css/pages/login.css",
    "/static/admin/css/pages/tables.css",
    "/static/admin/css/pages/single-table.css",

    //pwa
    "/sw.js",
    "/manifest.webmanifest",
    "/offline"
    // Your extras static files
];


self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_FILES);
        })
    );
});


// Clear duplicated cache on activate
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(keycache => {
                    if(keycache !== STATIC_CACHE_NAME && keycache !== DYNAMIC_CACHE_NAME) {
                        return caches.delete(keycache);
                    }
                })
            );
        })
    );
});




function isInArray(string, array) {
    let domain = self.location.origin;
    for (var i=0; i<array.length; i++) {
        if(domain+array[i] === string ) {
            return true;
        }
    }
    return false;
}



self.addEventListener("fetch", e => {
    if(!(e.request.url.indexOf('http') === 0)) return; //ignore chrome flags
    if(e.request.method != "GET") return; // accept only get methods

    // Skip caching for API routes and dynamic content
    if (e.request.url.includes('/availabilities') || 
        e.request.url.includes('/scheduler')) {
        e.respondWith(fetch(e.request));
        return;
    }

    if (isInArray(e.request.url, STATIC_FILES)) {
        e.respondWith(
            caches.match(e.request)
        );
    } else {
        e.respondWith(
            fetch(e.request)
            .then((res) => {
                let clone = res.clone()
                caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                    cache.put(e.request.url, clone).catch(err => _=err);
                })
                return res;
            }).catch(() => {
                const res = caches.match(e.request);
                if (res) {
                    return res;
                } else {
                    return caches.match("/offline");
                }
            })
        );
    }
});


