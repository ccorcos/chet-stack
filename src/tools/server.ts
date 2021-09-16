import injectLiveReload from "connect-livereload"
import express from "express"
import livereload from "livereload"
import { path } from "./path"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
process.env.DEBUG = "express:*"

const app = express()

// Injects into the html file so the browser reloads when files change.
app.use(injectLiveReload())
// Watch for changed to send a message over websocket.
livereload.createServer().watch(path("build/static"))

// Fallback to HTML for client-side routing to work.
app.use(express.static(path("build/static")))
app.use("*", express.static(path("build/static/index.html")))

app.listen(8080, () => console.log("Listening: http://localhost:8080"))
