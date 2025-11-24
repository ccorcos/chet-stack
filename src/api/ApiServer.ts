import cookieParser from "cookie-parser"
import express, { Express } from "express"
import * as t from "shared/DataType"
import { ApiHandlers } from "./types"

export function ApiServer<E>(environment: E, app: Express, api: ApiHandlers<E>) {
	// Register API endpoints.
	for (const [name, { input, handler }] of Object.entries(api)) {
		app.post(
			`/api/${name}`,
			cookieParser(),
			express.json({ limit: "4mb" }),
			express.text(),
			async (req, res) => {
				const error = t.validate(input, req.body)
				if (error) return res.status(400).json({ message: t.formatError(error) })
				const result = await handler(environment, req.body, req, res)
				res.status(200).json(result)
			}
		)
	}

	// 404 so we don't fall back to sending the index.html file.
	app.post("/api/*name", (req, res) => {
		res.status(404).json({ message: "API not found." })
	})
}
