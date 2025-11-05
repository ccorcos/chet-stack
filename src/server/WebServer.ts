import express, { Express } from "express"
import * as vite from "vite"
import { ClientConfig } from "../client/services/ClientConfig"
import { path } from "../tools/path"
import { ServerConfig } from "./services/ServerConfig"

export async function WebServer(environment: { config: ServerConfig }, app: Express) {
	const { config } = environment
	const clientConfig: ClientConfig = { host: config.host, production: false }

	if (!config.production) {
		const viteServer = await vite.createServer({
			root: path("src/client"),
			server: { middlewareMode: true, hmr: true },
			define: {
				__CLIENT_CONFIG__: JSON.stringify(clientConfig),
			},
		})
		app.use(viteServer.middlewares)
	} else {
		await vite.build({
			root: path("src/client"),
			define: {
				__CLIENT_CONFIG__: JSON.stringify(clientConfig),
			},
		})

		// Serve static assets.
		app.use(express.static(path("build/client")))
	}

	// Fallback to HTML for client-side routing to work.
	app.use("*", (req, res, next) => {
		if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next()
		// This will delegate to vite.middlewares or express.static.
		res.sendFile(path.resolve("/index.html"))
	})
}
