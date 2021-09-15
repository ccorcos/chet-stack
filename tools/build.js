const { build } = require("estrella")
const fs = require("fs")
const cpx = require("cpx")

const path = (str) => __dirname + "/../" + str

const watch = process.argv.includes("-watch")
const cmd = watch ? "watch" : "copy"
cpx[cmd](path("src/index.html"), path("dist"))
cpx[cmd](path("src/index.css"), path("dist"))

build({
	entry: path("src/index.tsx"),
	outfile: path("dist/index.js"),
	bundle: true,
	sourcemap: "inline",
	// pass any options to esbuild here...
})
