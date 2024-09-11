import cpx from "cpx"
import { build } from "estrella"
import type { ClientConfig } from "../client/services/ClientConfig"
import { path } from "../server/helpers/path"

// Builds the client bundle.
const watch = process.argv.includes("--watch")

if (watch) process.env.NODE_ENV = "development"
else process.env.NODE_ENV = "production"

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
	define: {
		// Compile ClientConfig into the bundle using environment build variables.
		__CLIENT_CONFIG__: JSON.stringify(config),
		// This is necessary to use the React development build.
		"process.env.NODE_ENV": `"${process.env.NODE_ENV}"`,
	},
	clear: false,
	// pass any options to esbuild here...
})
