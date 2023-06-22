import injectLiveReload from "connect-livereload"
import cookieParser from "cookie-parser"
import express from "express"
import http from "http"
import livereload from "livereload"
import { op } from "../shared/transaction"
import { api } from "./api"
import { write } from "./apis/write"
import { config } from "./config"
import { JsonDatabase } from "./JsonDatabase"
import { path } from "./path"
import { ServerEnvironment } from "./ServerEnvironment"
import { WebsocketPubsubServer } from "./WebsocketPubsubServer"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
process.env.DEBUG = "express:*"

const app = express()
const server = http.createServer(app)

// Setup the server environment. This thing gets passed around everywhere and defines
// the interface between differnet services so we can swap out things like the
// database or the pubsub service with minimal plumbing.
const environment: ServerEnvironment = {
	config: config,
	db: new JsonDatabase(),
	pubsub: new WebsocketPubsubServer(server),
}

// Injects into the html file so the browser reloads when files change.
app.use(injectLiveReload())
// Watch for changed to send a message over websocket.
livereload.createServer().watch(path("build"))

// Server statis assets.
app.use(express.static(path("build")))

app.use(cookieParser())
app.get("/logout", async (req, res) => {
	const authTokenId = req.cookies.authToken
	if (!authTokenId) return res.redirect("/")

	try {
		await write(environment, {
			authorId: environment.config.adminUserId,
			operations: [
				op.update<"auth_token", "deleted">(
					{ table: "auth_token", id: authTokenId },
					"deleted",
					true
				),
			],
		})
	} catch (error) {
		console.error("Invalid auth token.")
	}

	res.clearCookie("authToken")
	res.clearCookie("userId")
	return res.redirect("/")
})

// Register API endpoints.
app.use(express.json())
for (const [name, { validate, action }] of Object.entries(api)) {
	app.post(`/api/${name}`, async (req, res) => {
		const error = validate(req.body)
		if (error) return res.status(400).json({ message: error })
		try {
			const result = await action(environment, req.body, req, res)
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

// TODO: configure port, also https?
// https.createServer(options, app).listen(443)

server.listen(config.port, () => console.log("Listening: http://localhost:8080"))
