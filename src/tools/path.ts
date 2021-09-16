import * as p from "path"

// Specify a path based on the root of this repo.
function rootPath(...str: string[]) {
	return p.join(__dirname, "../..", ...str)
}

export const path: typeof rootPath & typeof p = Object.assign(rootPath, p)
