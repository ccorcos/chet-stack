import React from "react"
import { createRoot } from "react-dom/client"
// import ReactDOM from "react-dom/profiling"
import { Root } from "./components/Root"
import { clientConfig } from "./services/ClientConfig"
import { ClientEnvironment } from "./services/ClientEnvironment"
import { Router } from "./services/Router"
import { WebsocketPubsubClient } from "./services/WebsocketPubsubClient"
import { createApi } from "./services/api"

const router = new Router()
const api = createApi()

const pubsub = new WebsocketPubsubClient({
	config: clientConfig,
	onStart() {},
	onChange(key, value) {},
})

const environment: ClientEnvironment = {
	config: clientConfig,
	router,
	api,
	pubsub,
}

// Render the app.
const div = document.createElement("div")
document.body.appendChild(div)
const root = createRoot(div)
root.render(<Root environment={environment} />)

// For debugging from the Console.(window as any)["environment"] = environment
Object.assign(window as any, environment)

if (environment.config.production) {
	// Register service worker for offline caching.
	window.addEventListener("load", function () {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/service-worker.js")
				.then(function (registration) {
					console.log("Service Worker registered with scope:", registration.scope)
				})
				.catch(function (err) {
					console.log("Service Worker registration failed:", err)
				})
		}
	})
} else {
	// Register service worker for offline caching.
	window.addEventListener("load", function () {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.getRegistrations()
				.then((registrations) => {
					registrations.forEach((registration) => {
						registration.unregister().then((success) => {
							if (success) {
								console.log("Service worker unregistered successfully")
							} else {
								console.log("Failed to unregister service worker")
							}
						})
					})
				})
				.catch((error) => {
					console.error("Error while getting service worker registrations:", error)
				})
		}
	})
}
