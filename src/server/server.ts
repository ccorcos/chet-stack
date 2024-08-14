import injectLiveReload from "connect-livereload"
import express from "express"
import helmet from "helmet"
import http from "http"
import livereload from "livereload"
import morgan from "morgan"
import { ApiServer } from "./ApiServer"
import { FileServer } from "./FileServer"
import { PubsubServer } from "./PubsubServer"
import { QueueServer } from "./QueueServer"
import { path } from "./helpers/path"
import { Database } from "./services/Database"
import { QueueDatabase } from "./services/QueueDatabase"
import { config } from "./services/ServerConfig"
import { ServerEnvironment } from "./services/ServerEnvironment"

const app = express()

if (config.production) {
	// Basic server hardening settings including CORS
	app.use(helmet())
}

// Request logging.
// app.use(morgan("dev"))
app.use(morgan((...args) => "express: " + morgan.dev(...args)))

if (!config.production) {
	app.use(
		helmet.contentSecurityPolicy({
			directives: {
				scriptSrc: ["'self'", "localhost:35729"],
				connectSrc: ["'self'", "ws://localhost:35729"],
			},
		})
	)

	// Injects into the html file so the browser reloads when files change.
	app.use(injectLiveReload())

	// Watch for changed to send a message over websocket.
	livereload.createServer().watch(path("build"))
}

// Databases currently use the local filesystem, but eventually they'll be their own postgres/redis.
const db = new Database(config.dbPath)
const queue = new QueueDatabase(config.queuePath)

const server = http.createServer(app)
const pubsub = PubsubServer({ config, db }, server)

// Setup the server environment. This thing gets passed around everywhere and defines
// the interface between differnet services so we can swap out things like the
// database or the pubsub service with minimal plumbing.
const environment: ServerEnvironment = { config, db, queue, pubsub }

FileServer(environment, app)
QueueServer(environment)
ApiServer(environment, app)

// TODO: configure port, also https?
// https.createServer(options, app).listen(443)

server.listen(config.port, () => console.log("Listening: http://localhost:8080"))
