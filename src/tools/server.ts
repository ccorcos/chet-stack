import injectLiveReload from "connect-livereload"
import express from "express"
import livereload from "livereload"
import { api } from "./api"
import { JsonDatabase } from "./JsonDatabase"
import { path } from "./path"
import { ServerEnvironment } from "./ServerEnvironment"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
process.env.DEBUG = "express:*"

// Setup the server environment. This thing gets passed around everywhere.
const environment: ServerEnvironment = {
	db: new JsonDatabase(),
}

const app = express()

// Injects into the html file so the browser reloads when files change.
app.use(injectLiveReload())
// Watch for changed to send a message over websocket.
livereload.createServer().watch(path("build"))

// Server statis assets.
app.use(express.static(path("build")))

// Register API endpoints.
app.use(express.json())
for (const [name, { validate, action }] of Object.entries(api)) {
	app.post(`/api/${name}`, async (req, res) => {
		const error = validate(req.body)
		if (error) return res.status(400).send(error)
		const result = await action(environment, req.body)
		res.status(200).json(result)
	})
}

// Fallback to HTML for client-side routing to work.
app.use("*", express.static(path("build/index.html")))
app.listen(8080, () => console.log("Listening: http://localhost:8080"))
