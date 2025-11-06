import path from "path"
import { fileURLToPath } from "url"
import { indexgen } from "../../codegen/indexgen"

await indexgen({
	dirPath: path.dirname(fileURLToPath(import.meta.url)),
	watchMode: process.argv.includes("--watch"),
})
