import cookieParser from "cookie-parser"
import express, { Express } from "express"
import * as t from "shared/DataType"
import { api } from "./api"
import { ServerEnvironment } from "./services/ServerEnvironment"

export function ApiServer(environment: ServerEnvironment, app: Express) {
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
}
