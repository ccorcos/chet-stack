import path from "node:path"
import { fileURLToPath } from "node:url"
import { indexgen } from "../../codegen/indexgen"

await indexgen({
	dirPath: path.dirname(fileURLToPath(import.meta.url)),
	watchMode: process.argv.includes("--watch"),
})
