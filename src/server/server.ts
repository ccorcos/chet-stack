import injectLiveReload from "connect-livereload"
import express from "express"
import http from "http"
import livereload from "livereload"
import { DayMs } from "../shared/dateHelpers"
import { api } from "./api"
import { JsonDatabase } from "./JsonDatabase"
import { path } from "./path"
import { ServerEnvironment } from "./ServerEnvironment"
import { WebsocketPubsub } from "./WebsocketPubsub"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
process.env.DEBUG = "express:*"

const app = express()
const server = http.createServer(app)

const config = {
	production: true,
	port: 8080,
	domain: "localhost:8080",
}

// Setup the server environment. This thing gets passed around everywhere and defines
// the interface between differnet services so we can swap out things like the
// database or the pubsub service with minimal plumbing.
const environment: ServerEnvironment = {
	db: new JsonDatabase(),
	pubsub: new WebsocketPubsub(server),
}

// Injects into the html file so the browser reloads when files change.
app.use(injectLiveReload())
// Watch for changed to send a message over websocket.
livereload.createServer().watch(path("build"))

// Server statis assets.
app.use(express.static(path("build")))

// Register API endpoints.
app.use(express.json())

app.post("/login", (req, res) => {
	const { username, password } = req.body

	res.cookie("authToken", "", {
		secure: config.production,
		httpOnly: true, // Not visible on the client.
		expires: new Date(Date.now() + 120 * DayMs),
		domain: config.domain,
	})

	res.cookie("userId", "", {
		secure: config.production,
		httpOnly: false, // Visible on the client
		expires: new Date(Date.now() + 120 * DayMs),
		domain: config.domain,
	})
})

for (const [name, { validate, action }] of Object.entries(api)) {
	app.post(`/api/${name}`, async (req, res) => {
		const error = validate(req.body)
		if (error) return res.status(400).json({ message: error })
		const result = await action(environment, req.body)
		res.status(200).json(result)
	})
}

// Fallback to HTML for client-side routing to work.
app.use("*", express.static(path("build/index.html")))

// TODO: configure port, also https?
// https.createServer(options, app).listen(443)

server.listen(config.port, () =>
	console.log("Listening: http://localhost:8080")
)
