import * as p from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = p.dirname(fileURLToPath(import.meta.url))

/** This is a utility function for specifying the path of a file based on the
 * root directory of this repo */
function rootPath(...str: string[]) {
	// If the first path segment is absolute, don't prepend __dirname
	if (str.length > 0 && p.isAbsolute(str[0])) {
		return p.join(...str)
	}
	return p.join(__dirname, "../..", ...str)
}

export const path: typeof rootPath & typeof p = Object.assign(rootPath, p)
