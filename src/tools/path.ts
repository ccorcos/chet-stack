import * as p from "path"

/** This is a utility function for specifying the path of a file based on the
 * root directory of this repo */
function rootPath(...str: string[]) {
	return p.join(__dirname, "../../..", ...str)
}

export const path: typeof rootPath & typeof p = Object.assign(rootPath, p)
