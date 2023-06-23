const CACHE_NAME = "app-assets-v1"
const urlsToCache = ["/", "/index.css", "/index.js"]

// Perform install steps
self.addEventListener("install", function (event) {
	event.waitUntil(
		caches.open(CACHE_NAME).then(function (cache) {
			return cache.addAll(urlsToCache)
		})
	)
})

// Always fetch when online, only use the cache as an offline fallback.
self.addEventListener("fetch", function (event) {
	event.respondWith(
		// Check if this response should be cached at all.
		caches.match(event.request).then((cachedResponse) => {
			// Fetch from the network regardless.
			return fetch(event.request)
				.then((response) => {
					// If we received a bad response, then return without caching.
					if (!response || response.status !== 200 || response.type !== "basic") {
						return response
					}

					// Only cache GET requests.
					if (event.request.method !== "GET") {
						return response
					}

					// IMPORTANT: Clone the response. A response is a stream
					// and because we want the browser to consume the response
					// as well as the cache consuming the response, we need
					// to clone it so we have two streams.
					var responseToCache = response.clone()

					// // Check the MIME type of the response
					// const contentType = response.headers.get("Content-Type")

					// if (event.request.url.startsWith(self.origin)) {
					//
					// // Cache the response only if it is HTML, JS, or CSS
					// if (
					// 	contentType &&
					// 	(contentType.includes("text/html") ||
					// 		contentType.includes("application/javascript") ||
					// 		contentType.includes("text/css"))
					// ) {
					// 	caches.open("your-cache-name").then((cache) => {
					// 		cache.put(event.request, clonedResponse)
					// 	})
					// }

					// Cache the response for offline.
					caches.open(CACHE_NAME).then(function (cache) {
						cache.put(event.request, responseToCache)
					})
					return response
				})
				.catch(function (error) {
					// If we're offline return the cached response.
					if (cachedResponse) return cachedResponse

					// Check if request is for an HTML document (or navigation request)
					// appropriate for HTML5 routing used by single page applications.
					if (
						event.request.mode === "navigate" ||
						(event.request.method === "GET" &&
							event.request.headers.get("accept").includes("text/html"))
					) {
						return caches.match("/")
					}

					return Promise.reject(error)
				})
		})
	)
})

// Update a service worker and delete the old caches.
self.addEventListener("activate", function (event) {
	// TODO: at some point we'll have a cache for immutable static files like images
	// which we'll want to preserve when we update the service worker.
	const cacheWhitelist = ["static-images-v1"]
	event.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.map(function (cacheName) {
					if (cacheWhitelist.indexOf(cacheName) === -1) {
						return caches.delete(cacheName)
					}
				})
			)
		})
	)
})
