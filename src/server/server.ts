import express from "express"
import helmet from "helmet"
import http from "node:http"
import morgan from "morgan"
import { recordDb } from "../shared/database/RecordDb"
import { tupleDb, tupleOkv } from "../shared/database/TupleDb"
import { initEmailModel } from "../shared/EmailModel"
import { ApiServer } from "./ApiServer"
import { FileServer } from "./FileServer"
import { PubsubServer } from "./PubsubServer"
import { QueueServer } from "./QueueServer"
import { Database } from "./services/Database"
import { QueueDatabase } from "./services/QueueDatabase"
import { config } from "./services/ServerConfig"
import { ServerEnvironment } from "./services/ServerEnvironment"
import { WebServer } from "./WebServer"

const app = express()

if (config.production) {
	// Basic server hardening settings including CORS
	app.use(helmet())
}

// Request logging.
// app.use(morgan("dev"))
app.use(morgan((...args) => "express: " + morgan.dev(...args)))

// Databases currently use the local filesystem, but eventually they'll be their own postgres/redis.
const base = new Database(config.dbPath)
const db = tupleOkv(base)

INIT: {
	initEmailModel(recordDb(tupleDb(db).subspace(["EmailDemo"])))
}

const queue = new QueueDatabase(config.queuePath)

const server = http.createServer(app)
const pubsub = PubsubServer({ config, db }, server)

// Setup the server environment. This thing gets passed around everywhere and defines
// the interface between differnet services so we can swap out things like the
// database or the pubsub service with minimal plumbing.
const environment: ServerEnvironment = { config, db, queue, pubsub }

await FileServer(environment, app)
QueueServer(environment)
ApiServer(environment, app)
await WebServer(environment, app)

// TODO: configure port, also https?
// https.createServer(options, app).listen(443)

server.listen(config.port, () => console.log("Listening: http://localhost:8080"))
