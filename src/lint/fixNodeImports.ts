/*

npx tsx src/lint/fixNodeImports.ts <srcDir>
npx tsx src/lint/fixNodeImports.ts src

Ensures that all native Node.js imports use the node: protocol prefix.

*/

import fs from "node:fs/promises"
import { builtinModules } from "node:module"
import * as path from "node:path"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { walkFiles } from "./helpers"

// Get Node.js built-in modules from Node.js itself
// Filter out node:-prefixed versions that are included in the list
const nodeBuiltins = builtinModules.filter((mod) => !mod.startsWith("node:"))

async function fixImportsInFile(filePath: string): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8")

	// Create regex pattern to match imports from Node.js built-ins without node: prefix
	// Matches: from 'node:module' or from "node:module" or from 'node:module/subpath'
	// But not: from 'node:module' or from "./..." or from "@..." or other package names
	const builtinsPattern = nodeBuiltins.join("|")
	const regex = new RegExp(`from (["'])(?!node:)(${builtinsPattern})(\\/[^"']*)?\\1`, "g")

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

export async function fixNodeImports(srcDir: string) {
	const results = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (file) => {
			if (await fixImportsInFile(file)) {
				console.log(`Fixed: ${path.relative(srcDir, file)}`)
				return true
			}
			return false
		})
	)

	const total = results.length
	const fixed = results.filter(Boolean)
	console.log(`✅ Fixed native node imports in ${fixed.length} of ${total} file(s).`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const srcArg = process.argv[2]
	if (!srcArg) throw new Error("srcDir argument is required.")
	const srcDir = path.resolve(process.cwd(), srcArg)

	await fixNodeImports(srcDir)
}
