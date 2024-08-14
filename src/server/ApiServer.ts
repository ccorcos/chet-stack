import cookieParser from "cookie-parser"
import express, { Express } from "express"
import * as t from "../shared/dataTypes"
import { api } from "./api"
import { path } from "./helpers/path"
import { config } from "./services/ServerConfig"
import { ServerEnvironment } from "./services/ServerEnvironment"

export function ApiServer(environment: ServerEnvironment, app: Express) {
	// Serve static assets.
	app.use(express.static(path("build")))

	// Register API endpoints.
	for (const [name, { input, handler }] of Object.entries(api)) {
		app.post(`/api/${name}`, cookieParser(), express.json({ limit: "4mb" }), async (req, res) => {
			const error = input.validate(req.body)
			if (error) return res.status(400).json({ message: t.formatError(error) })
			try {
				const result = await handler(environment, req.body, req, res)
				res.status(200).json(result)
			} catch (error) {
				console.error(error)
				if (error.statusCode) {
					// Custom errors have a status and do not leak sensitive information in the message.
					res.status(error.statusCode).json({ message: error.message })
				} else {
					// Be careful not to leak sensitive information.
					res.status(500).json({ message: config.production ? "Unknown error." : error.message })
				}
			}
		})
	}

	// Fallback to HTML for client-side routing to work.
	app.use("*", express.static(path("build/index.html")))
}
