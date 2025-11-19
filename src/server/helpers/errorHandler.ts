import { Express, NextFunction, Request, Response } from "express"
import { ServerConfig } from "server/services/ServerConfig"
import { randomId } from "shared/randomId"

type HttpError = { statusCode?: number; status?: number; message: string }

// Error handling.
// https://expressjs.com/en/guide/error-handling.html
export function errorHandler(environment: { config: ServerConfig }, app: Express) {
	app.use((error: HttpError, req: Request, res: Response, next: NextFunction) => {
		if (res.headersSent) return next(error) // Streaming error.

		const errorId = randomId()
		const statusCode = error.statusCode || error.status || 500

		if (statusCode === 500) {
			console.error(`HttpError 500 [${errorId}]:`, error)
			const message = environment.config.production
				? `Internal server error [${errorId}]`
				: error.message
			res.status(500).json({ message })
		} else {
			res.status(statusCode).json({ message: error.message })
		}
	})
}
