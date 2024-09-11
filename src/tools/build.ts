import cpx from "cpx"
import { build } from "estrella"
import type { ClientConfig } from "../client/services/ClientConfig"
import { path } from "../server/helpers/path"

// Builds the client bundle.
// process.env.NODE_ENV = "development"

const watch = process.argv.includes("--watch")
const cmd = watch ? "watch" : "copy"
cpx[cmd](path("src/client/index.html"), path("build"))
cpx[cmd](path("src/client/index.css"), path("build"))
cpx[cmd](path("src/client/service-worker.js"), path("build"))

const config: ClientConfig = { host: "localhost:8080", production: !watch }

build({
	entry: path("src/client/index.tsx"),
	outfile: path("build/index.js"),
	bundle: true,
	sourcemap: watch ? true : false,
	sourcesContent: watch ? true : false,
	watch: watch,
	define: { __CLIENT_CONFIG__: JSON.stringify(config) },
	clear: false,
	// pass any options to esbuild here...
})
