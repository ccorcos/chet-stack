/*

npx tsx src/tools/fixNodeImports.ts

Ensures that all native Node.js imports use the node: protocol prefix.
For example: import fs from 'node:fs' -> import fs from 'node:fs'

*/

import gitignore from "ignore"
import fs from "node:fs/promises"
import { builtinModules } from "node:module"
import { collect } from "shared/collect"
import { path } from "./path"
import { pLimitLazy } from "./pLimitLazy"

const rootDir = path(".")
const srcDir = path("src")

const ignore = gitignore().add(await fs.readFile(path(".gitignore"), "utf-8"))

// Get Node.js built-in modules from Node.js itself
// Filter out node:-prefixed versions that are included in the list
const nodeBuiltins = builtinModules.filter((mod) => !mod.startsWith("node:"))

async function* walkFiles(dir: string): AsyncGenerator<string> {
	const entries = await fs.readdir(dir, { withFileTypes: true })

	for (const entry of entries) {
		const filePath = path.join(dir, entry.name)
		const relativePath = path.relative(rootDir, filePath)

		if (ignore.ignores(relativePath)) continue

		if (entry.isDirectory()) {
			yield* walkFiles(filePath)
		} else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
			yield filePath
		}
	}
}

async function fixImportsInFile(filePath: string): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8")

	// Create regex pattern to match imports from Node.js built-ins without node: prefix
	// Matches: from 'node:module' or from "node:module" or from 'node:module/subpath'
	// But not: from 'node:module' or from "./..." or from "@..." or other package names
	const builtinsPattern = nodeBuiltins.join("|")
	const regex = new RegExp(
		`from (["'])(?!node:)(${builtinsPattern})(\\/[^"']*)?\\1`,
		"g"
	)

	// Replace with node: prefix
	const newContent = content.replace(regex, (match, quote, module, subpath = "") => {
		return `from ${quote}node:${module}${subpath}${quote}`
	})

	if (content !== newContent) {
		await fs.writeFile(filePath, newContent, "utf-8")
		return true
	}
	return false
}

console.log("Finding and fixing Node.js imports in source files...")
const results = await collect(
	pLimitLazy(10, walkFiles(srcDir), async (file) => {
		if (await fixImportsInFile(file)) {
			console.log(`Fixed: ${path.relative(rootDir, file)}`)
			return true
		}
		return false
	})
)

const total = results.length
const fixed = results.filter(Boolean)
console.log(`\nDone! Fixed imports in ${fixed.length} of ${total} file(s).`)
