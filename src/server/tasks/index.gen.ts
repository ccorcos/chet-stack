import { indexgen } from "codegen/indexgen"
import path from "node:path"
import { fileURLToPath } from "node:url"

await indexgen({
	dirPath: path.dirname(fileURLToPath(import.meta.url)),
	watchMode: process.argv.includes("--watch"),
})
