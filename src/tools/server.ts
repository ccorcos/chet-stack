import livereload from "connect-livereload"
import express from "express"
import { path } from "./path"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
process.env.DEBUG = "express:*"

const app = express()

// Injects into the html file so the browser reloads when files change.
app.use(livereload())

app.use(express.static(path("build/static")))

// Do this for HTML5 routing.
app.use("*", express.static(path("build/static/index.html")))

app.listen(8080, () => console.log("Listening: http://localhost:8080"))
