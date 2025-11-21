import express, { Express } from "express"
import { path } from "tools/path"
import * as vite from "vite"

export async function WebServer(environment: { config: { production: boolean } }, app: Express) {
	const { config } = environment

	if (!config.production) {
		// Development server for building the client and hot reloading.
		const viteServer = await vite.createServer({
			root: path("src/client"),
			server: { middlewareMode: true, hmr: true },
		})
		app.use(viteServer.middlewares)
	} else {
		// Lets assume the client is already built.
		// await vite.build({ root: path("src/client") })

		// Serve static assets.
		app.use(express.static(path("build/client")))
	}

	// Fallback to HTML for client-side routing to work.
	app.use((req, res, next) => {
		if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next()
		// This will delegate to vite.middlewares or express.static.
		res.sendFile(path.resolve("/index.html"))
	})
}
