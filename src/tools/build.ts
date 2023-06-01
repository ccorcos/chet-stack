import cpx from "cpx"
import { build } from "estrella"
import { path } from "../server/path"

const watch = process.argv.includes("--watch")
const cmd = watch ? "watch" : "copy"
cpx[cmd](path("src/client/index.html"), path("build"))
cpx[cmd](path("src/client/index.css"), path("build"))

build({
	entry: path("src/client/index.tsx"),
	outfile: path("build/index.js"),
	bundle: true,
	sourcemap: watch ? "inline" : false,
	watch: watch,
	clear: false,
	// pass any options to esbuild here...
})
