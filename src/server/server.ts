import { ApiServer } from "api/ApiServer"
import compression from "compression"
import { Database } from "database/Database"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"
import http from "node:http"
import { WebsocketPubsubServer } from "pubsub/WebsocketPubsubServer"
import { enqueueApi } from "queue/enqueue"
import { QueueDatabase } from "queue/QueueDatabase"
import { QueueServer } from "queue/QueueServer"
import { initEmailModel } from "shared/EmailModel"
import { recordDb } from "tupledb/RecordDb"
import { tupleDb, tupleOkv } from "tupledb/TupleDb"
import { UploadServer } from "upload/UploadServer"
import { api } from "./api"
import { errorHandler } from "./helpers/errorHandler"
import { ServerEnvironment } from "./ServerEnvironment"
import { config } from "./services/ServerConfig"
import { tasks } from "./tasks"
import { WebServer } from "./WebServer"

const app = express()

if (config.production) {
	// Basic server hardening settings including CORS
	app.use(helmet())
}

// Request logging.
// app.use(morgan("dev"))
app.use(morgan((...args) => "express: " + morgan.dev(...args)))

const base = new Database(config.dbPath)
const db = tupleDb(tupleOkv(base))

INIT: {
	initEmailModel(recordDb(tupleDb(db).subspace(["EmailDemo"])))
}

const queueDb = new QueueDatabase(config.queuePath)
const enqueue = enqueueApi(queueDb)

const server = http.createServer(app)
const pubsub = new WebsocketPubsubServer(server)

// Setup the server environment. This thing gets passed around everywhere and defines
// the interface between differnet services so we can swap out things like the
// database or the pubsub service with minimal plumbing.
const environment: ServerEnvironment = { config, db, enqueue, pubsub }

app.use(compression())

await UploadServer(environment, app)
QueueServer(queueDb, environment, tasks)
ApiServer(environment, app, api)

await WebServer(environment, app)

errorHandler(environment, app)

// TODO: configure port, also https?
// https.createServer(options, app).listen(443)
server.listen(config.port, () => console.log("Listening: http://localhost:8080"))
