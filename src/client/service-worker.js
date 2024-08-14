const ASSETS_CACHE = "app-assets-v1"
const IMAGES_CACHE = "static-simages-v1" // TODO
const cacheWhitelist = [ASSETS_CACHE, IMAGES_CACHE]

// Perform install steps
self.addEventListener("install", function (event) {
	event.waitUntil(
		caches.open(ASSETS_CACHE).then(function (cache) {
			// Fetch and cache these assets on the first install.
			return cache.addAll(["/", "/index.css", "/index.js"])
		})
	)
})

// Delete any old caches.
self.addEventListener("activate", function (event) {
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

// TODO: add a request timeout.

// Always fetch when online, only use the cache as an offline fallback.
self.addEventListener("fetch", function (event) {
	event.respondWith(
		// Fetch from the network in case we're online.
		fetch(event.request)
			.then((response) => {
				// Don't cache bad responses.
				if (!response) return response
				if (response.status !== 200) return response
				if (response.type !== "basic") return response

				// Only cache GET requests.
				if (event.request.method !== "GET") return response

				// Only cache responses from the origin.
				// if (!event.request.url.startsWith(self.origin)) return response

				// Only cache the basic website assets.
				// TODO: favicon? fonts?
				const validMimeTypes = ["text/html", "application/javascript", "text/css"]
				const contentType = response.headers.get("Content-Type")
				if (!contentType) return response
				if (!validMimeTypes.some((mimeType) => contentType.includes(mimeType))) return response

				// IMPORTANT: Clone the response. A response is a stream
				// and because we want the browser to consume the response
				// as well as the cache consuming the response, we need
				// to clone it so we have two streams.
				var responseToCache = response.clone()

				// Cache the response for offline.
				caches.open(ASSETS_CACHE).then(function (cache) {
					cache.put(event.request, responseToCache)
				})
				return response
			})
			.catch(function (error) {
				// If we're offline return the cached response.
				return caches.match(event.request).then((cachedResponse) => {
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
