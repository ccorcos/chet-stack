import * as p from "path"
import { fileURLToPath } from "url"

const __dirname = p.dirname(fileURLToPath(import.meta.url))

/** This is a utility function for specifying the path of a file based on the
 * root directory of this repo */
function rootPath(...str: string[]) {
	return p.join(__dirname, "../..", ...str)
}

export const path: typeof rootPath & typeof p = Object.assign(rootPath, p)
